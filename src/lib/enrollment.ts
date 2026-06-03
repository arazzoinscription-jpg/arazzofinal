import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

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
    .select("id, customer_id, email, full_name, order_items(course_id)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Commande introuvable.", userId: null, isNewAccount: false, enrolled: [] };

  const courseIds = [...new Set(
    ((order.order_items as { course_id: string | null }[]) ?? [])
      .map((i) => i.course_id)
      .filter((c): c is string => !!c)
  )];

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

  return { ok: true, userId, isNewAccount, enrolled };
}
