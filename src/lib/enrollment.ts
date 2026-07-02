import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { stopProspectSequenceOnPurchase } from "@/lib/prospects";

export interface EnrollResult {
  ok: boolean;
  error?: string;
  userId: string | null;
  isNewAccount: boolean;
  enrolled: string[]; // course_id réellement ajoutés
}

/**
 * Enrôle automatiquement le client dans les formations achetées après paiement.
 *  1) Récupère les order_items avec course_id.
 *  2) Crée le compte + le profil s'ils n'existent pas (checkout invité).
 *  3) INSERT enrollments ON CONFLICT DO NOTHING.
 *  4) Retourne les enrôlements créés.
 * Idempotent : peut être rappelée sans créer de doublon.
 */
export async function enrollAfterPayment(orderId: string): Promise<EnrollResult> {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, customer_id, email, full_name, order_items(course_id, product_id)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Commande introuvable.", userId: null, isNewAccount: false, enrolled: [] };

  const items = (order.order_items as { course_id: string | null; product_id: string | null }[]) ?? [];
  const courseIdSet = new Set<string>(items.map((i) => i.course_id).filter((c): c is string => !!c));

  // Packs (produits 'bundle') : enrôler dans TOUS les cours du pack.
  const productIds = [...new Set(items.map((i) => i.product_id).filter((p): p is string => !!p))];
  if (productIds.length > 0) {
    const { data: prods } = await admin.from("products").select("id, type, files").in("id", productIds);
    for (const p of prods ?? []) {
      if (p.type !== "bundle") continue;
      const ref = ((p.files as string[]) ?? []).find((f) => f.startsWith("pack:"));
      if (!ref) continue;
      const { data: packCourses } = await admin
        .from("course_pack_items").select("course_id").eq("pack_id", ref.slice(5));
      for (const it of packCourses ?? []) if (it.course_id) courseIdSet.add(it.course_id);
    }
  }

  const courseIds = [...courseIdSet];

  // ── 2) Compte client ──
  let userId = order.customer_id as string | null;
  let isNewAccount = false;

  if (!userId && order.email) {
    // Un compte existe peut-être déjà pour cet email
    const { data: existingProfile } = await admin
      .from("users").select("id").eq("email", order.email).maybeSingle();

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: order.email, email_confirm: true,
        user_metadata: { nom: order.full_name ?? order.email.split("@")[0] },
      });
      if (createErr || !created?.user) {
        return { ok: false, error: createErr?.message ?? "Création de compte impossible.", userId: null, isNewAccount: false, enrolled: [] };
      }
      userId = created.user.id;
      isNewAccount = true;
    }
    await admin.from("orders").update({ customer_id: userId }).eq("id", order.id);
  }

  if (!userId) return { ok: false, error: "Aucun client associé.", userId: null, isNewAccount, enrolled: [] };

  // Profil (au cas où le trigger handle_new_user ne l'aurait pas créé)
  const { data: profile } = await admin.from("users").select("id").eq("id", userId).maybeSingle();
  if (!profile) {
    await admin.from("users").insert({
      id: userId, email: order.email ?? "", nom: order.full_name ?? "Cliente",
    });
  }

  // ── 3) Enrôlements (ON CONFLICT DO NOTHING) ──
  const enrolled: string[] = [];
  for (const courseId of courseIds) {
    const { data: already } = await admin
      .from("enrollments").select("id").eq("user_id", userId).eq("course_id", courseId).maybeSingle();
    if (already) continue;

    const { error: insErr } = await admin.from("enrollments").insert({
      user_id: userId, course_id: courseId, order_id: order.id, enrolled_at: new Date().toISOString(),
    });
    if (!insErr) enrolled.push(courseId);
  }

  // ── 4) Patrons (produits patron_pdf) → patron_purchases (téléchargement dans « Mes patrons ») ──
  if (productIds.length > 0) {
    const { data: patronProds } = await admin
      .from("products").select("patron_id").in("id", productIds).eq("type", "patron_pdf");
    const patronIds = [...new Set((patronProds ?? []).map((p) => p.patron_id).filter((p): p is string => !!p))];
    for (const patronId of patronIds) {
      const { data: has } = await admin
        .from("patron_purchases").select("id").eq("user_id", userId).eq("patron_id", patronId).maybeSingle();
      if (has) continue;
      await admin.from("patron_purchases").insert({ user_id: userId, patron_id: patronId });
    }
    if (patronIds.length > 0) {
      try {
        await admin.from("notifications").insert({
          user_id: userId, type: "system", title: "📄 Votre patron est prêt",
          body: "Téléchargez votre patron PDF depuis votre espace « Mes patrons ».",
          link: "/dashboard/patrons",
        });
      } catch { /* ignore */ }
    }
  }

  // Achat effectué → arrêt immédiat de la séquence marketing prospect (best-effort).
  await stopProspectSequenceOnPurchase(admin, userId);

  return { ok: true, userId, isNewAccount, enrolled };
}
