"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { notifyAdminEmail } from "@/lib/admin-notify";
import { createMagicLink, createPasswordSetupLink } from "@/lib/magic-link";
import { monthlyAmount, fullDiscountedAmount } from "@/lib/subscription-plan";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store";
const PROOFS_BUCKET = "proofs";
const MAX_PROOF = 10 * 1024 * 1024;
const PROCESSING = ["pending", "payment_pending", "payment_review"];

const LeadSchema = z.object({
  full_name: z.string().trim().min(2, "Nom complet requis."),
  email: z.string().email("Email invalide."),
  phone: z.string().trim().min(6, "Téléphone requis."),
  wilaya: z.string().trim().optional().nullable(),
  courseId: z.string().uuid().optional(),
  packId: z.string().uuid().optional(),
  level: z.string().trim().optional().nullable(),
  plan: z.enum(["full", "installments"]).optional(),
}).refine((d) => !!d.courseId || !!d.packId, { message: "Choisissez une formation ou un pack." });

/** Fiche détaillée d'une formation (pour l'aperçu in-page sur /offre). */
export async function getCourseFiche(courseId: string) {
  if (!z.string().uuid().safeParse(courseId).success) return { ok: false as const, error: "Identifiant invalide." };
  const admin = createAdminClient();
  const { data: c } = await admin
    .from("courses")
    .select("id, titre_fr, titre_ar, titre_en, description_fr, description_ar, description_en, niveau, duree, prix_dzd, prix_eur, slug, thumbnail, formateur:users(nom, avatar_url, ville), chapters(titre, ordre, lessons(id, titre, duree_minutes, ordre, is_preview)), reviews(note, commentaire, user:users(nom))")
    .eq("id", courseId).eq("published", true).eq("visible_inscription", true).maybeSingle();
  if (!c) return { ok: false as const, error: "Formation introuvable." };

  // Chapitres + leçons détaillées (titre, durée, aperçu gratuit).
  const chapters = ((c.chapters as any[]) ?? [])
    .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
    .map((ch) => ({
      titre: ch.titre ?? "Chapitre",
      lessons: (ch.lessons ?? []).length,
      items: ((ch.lessons as any[]) ?? [])
        .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
        .map((l) => ({ titre: l.titre ?? "Leçon", duree: l.duree_minutes ?? null, preview: !!l.is_preview })),
    }));
  const lessonsTotal = chapters.reduce((s, ch) => s + ch.lessons, 0);

  // Avis + note moyenne.
  const reviews = ((c.reviews as any[]) ?? []).map((r) => ({
    note: Number(r.note) || 0, commentaire: r.commentaire ?? "", nom: (r.user as any)?.nom ?? "Élève",
  }));
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.note, 0) / reviews.length : null;

  return {
    ok: true as const,
    fiche: {
      titre_fr: c.titre_fr, titre_ar: c.titre_ar, titre_en: c.titre_en,
      description_fr: c.description_fr, description_ar: c.description_ar, description_en: c.description_en,
      niveau: c.niveau, duree: c.duree, prixDzd: Number(c.prix_dzd) || 0, prixEur: Number(c.prix_eur) || 0,
      slug: c.slug, thumbnail: c.thumbnail,
      formateurNom: (c.formateur as any)?.nom ?? null,
      formateurAvatar: (c.formateur as any)?.avatar_url ?? null,
      formateurVille: (c.formateur as any)?.ville ?? null,
      chapters, chaptersCount: chapters.length, lessonsTotal,
      reviews, avgRating,
    },
  };
}

/** Détail d'un PACK (formations incluses → chapitres → leçons) pour la popup /offre. */
export async function getPackFiche(packId: string) {
  if (!z.string().uuid().safeParse(packId).success) return { ok: false as const, error: "Identifiant invalide." };
  const admin = createAdminClient();
  const { data: pack } = await admin
    .from("course_packs")
    .select(`titre_fr, prix_dzd, prix_eur, duration_months,
      items:course_pack_items(course:courses(slug, titre_fr, niveau, thumbnail,
        chapters(titre, ordre, lessons(titre, duree_minutes, ordre))))`)
    .eq("id", packId).eq("published", true).maybeSingle();
  if (!pack) return { ok: false as const, error: "Pack introuvable." };

  const courses = ((pack.items as any[]) ?? []).map((it) => {
    const c = it.course;
    const chapters = [...((c?.chapters as any[]) ?? [])]
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
      .map((ch) => ({
        titre: ch.titre ?? "Chapitre",
        lessons: [...((ch.lessons as any[]) ?? [])]
          .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
          .map((l) => ({ titre: l.titre ?? "Leçon", duree: l.duree_minutes ?? null })),
      }));
    const lessonsTotal = chapters.reduce((s, ch) => s + ch.lessons.length, 0);
    return {
      slug: c?.slug ?? null,
      title: c?.titre_fr ?? "Formation",
      niveau: c?.niveau ?? null,
      thumbnail: c?.thumbnail ?? null,
      chapters,
      chaptersCount: chapters.length,
      lessonsTotal,
    };
  });

  return {
    ok: true as const,
    fiche: {
      titre: pack.titre_fr ?? "Pack",
      prixDzd: Number(pack.prix_dzd) || 0,
      prixEur: Number(pack.prix_eur) || 0,
      durationMonths: Number((pack as { duration_months?: number | null }).duration_months) || null,
      courses,
      lessonsTotal: courses.reduce((s, c) => s + c.lessonsTotal, 0),
    },
  };
}

/**
 * Envoie par email les coordonnées de paiement (CCP/RIB) + les étapes à suivre.
 * Remplace l'affichage public du RIB sur la page offre (confidentialité).
 */
export async function sendPaymentInfo(email: string) {
  const clean = (email ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(clean).success) return { ok: false as const, error: "Email invalide." };

  const admin = createAdminClient();
  const { data: pay } = await admin
    .from("ccp_config").select("account_number, account_key, beneficiary_name, rip").eq("is_active", true).limit(1).maybeSingle();
  if (!pay) return { ok: false as const, error: "Coordonnées de paiement non configurées. Contactez-nous." };

  const row = (label: string, value?: string | null) =>
    value ? `<tr><td style="padding:6px 0;color:#6b7280">${label}</td><td style="padding:6px 0;font-weight:700;color:#1b0c3c;text-align:right">${value}</td></tr>` : "";

  const html = `
    <h2 style="font-family:Georgia,serif;color:#1b0c3c;margin:0 0 6px">Coordonnées de paiement — Arazzo Formation</h2>
    <p style="color:#4b5563;margin:0 0 16px">Voici les informations pour régler votre inscription par virement / versement CCP.</p>
    <table style="width:100%;border-collapse:collapse;background:#faf7ff;border:1px solid #eee;border-radius:12px;padding:8px 14px">
      ${row("Bénéficiaire", pay.beneficiary_name)}
      ${row("N° de compte CCP", pay.account_number)}
      ${row("Clé", pay.account_key)}
      ${row("RIP / RIB", pay.rip)}
    </table>
    <ol style="color:#4b5563;line-height:1.7;margin:18px 0">
      <li>Effectuez le versement sur le compte ci-dessus.</li>
      <li>Prenez une photo claire du reçu (ou un PDF).</li>
      <li>Revenez sur la page d'inscription et déposez votre preuve de paiement.</li>
      <li>Notre équipe valide votre paiement et débloque l'accès à votre formation.</li>
    </ol>
    <p style="color:#9ca3af;font-size:13px">Gardez cet email : il contient vos coordonnées de paiement.</p>
  `;

  try {
    await sendEmail({ to: clean, category: "welcome", force: true, subject: "💳 Vos coordonnées de paiement — Arazzo Formation", html });
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error)?.message ?? "Envoi impossible." };
  }
}

/**
 * Étape 1 du tunnel « Rejoindre » : enregistre la pré-inscription sous forme de
 * commande EN ATTENTE (aucun accès). L'élève paie ensuite par virement puis
 * dépose sa preuve (étape 2). C'est l'admin qui valide → accès.
 */
export async function submitLead(input: unknown) {
  const parsed = LeadSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const { full_name, email, phone, wilaya, courseId, packId, plan } = parsed.data;
  const cleanEmail = email.trim().toLowerCase();
  const admin = createAdminClient();

  // Rattache la commande au compte : l'élève connecté, sinon un compte existant
  // avec cet email → la commande apparaît IMMÉDIATEMENT dans « Mes commandes ».
  let customerId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) customerId = user.id;
  } catch { /* invité */ }
  if (!customerId) {
    const { data: existing } = await admin.from("users").select("id").eq("email", cleanEmail).maybeSingle();
    if (existing) customerId = existing.id as string;
  }

  // ── Inscription à un PACK (abonnement ou achat complet) ──────────────────
  if (packId) {
    const { data: pack } = await admin
      .from("course_packs")
      .select("id, titre_fr, prix_dzd, published, subscription_enabled, duration_months")
      .eq("id", packId).maybeSingle();
    if (!pack || !pack.published) return { ok: false as const, error: "Pack indisponible." };

    const price = Number(pack.prix_dzd) || 0;
    const months = Number((pack as { duration_months?: number | null }).duration_months) || 0;
    const subOn = (pack as { subscription_enabled?: boolean }).subscription_enabled === true && months >= 2;
    const isInstallment = subOn && plan === "installments";
    const total = isInstallment ? monthlyAmount(price, months) : subOn ? fullDiscountedAmount(price, months) : price;

    const { data: packCourses } = await admin.from("course_pack_items").select("course_id").eq("pack_id", packId);
    const courseIds = (packCourses ?? []).map((i) => i.course_id as string).filter(Boolean);
    if (courseIds.length === 0) return { ok: false as const, error: "Ce pack ne contient aucun cours." };

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert({
        status: "pending", customer_id: customerId, full_name, email: cleanEmail, phone,
        wilaya: wilaya ?? null, country: "Algérie",
        subtotal: total, discount: 0, total, payment_method: "transfer",
        pack_id: packId, installment_month: isInstallment ? 1 : null,
      })
      .select("id")
      .single();
    if (orderErr || !order) return { ok: false as const, error: orderErr?.message ?? "Inscription impossible." };

    // Un order_item par cours du pack → enrollAfterPayment enrôle dans tous les cours.
    // Le prix total est porté par le 1er item (les autres à 0) pour une facture cohérente.
    const items = courseIds.map((cid, i) => ({
      order_id: order.id, course_id: cid, title: pack.titre_fr ?? "Pack",
      price: i === 0 ? total : 0, quantity: 1,
    }));
    const { error: itemErr } = await admin.from("order_items").insert(items);
    if (itemErr) {
      await admin.from("orders").delete().eq("id", order.id);
      return { ok: false as const, error: "Inscription impossible." };
    }
    await notifyAdminEmail("🧾 Nouvelle commande (pack) — /offre", {
      "Pack": pack.titre_fr || "Pack",
      "Montant": `${Number(total).toLocaleString("fr-DZ")} DA`,
      "Formule": isInstallment ? "Paiement en tranches (1ʳᵉ échéance)" : subOn ? "Comptant (remisé)" : "Comptant",
      "Cliente": full_name, "Email": cleanEmail, "Téléphone": phone, "Wilaya": wilaya || "—",
    }, { intro: "Une inscription à un pack vient d'être passée (virement, en attente de validation).", link: "/admin/commandes" });
    return { ok: true as const, orderId: order.id };
  }

  if (!courseId) return { ok: false as const, error: "Choisissez une formation." };

  const { data: course } = await admin
    .from("courses").select("id, titre_fr, prix_dzd, published, visible_inscription, subscription_enabled, duration_months").eq("id", courseId).maybeSingle();
  if (!course || !course.published || !course.visible_inscription) return { ok: false as const, error: "Formation indisponible." };

  const price = Number(course.prix_dzd) || 0;

  // Mode abonnement : la formation est éligible et l'admin a fixé une durée ≥ 2 mois.
  const months = Number((course as { duration_months?: number | null }).duration_months) || 0;
  const subOn = (course as { subscription_enabled?: boolean }).subscription_enabled === true && months >= 2;
  const isInstallment = subOn && plan === "installments";
  // Montant dû à l'inscription : 1ʳᵉ tranche (abonnement) ; prix remisé (comptant sur formation abonnement) ; sinon prix plein.
  const total = isInstallment ? monthlyAmount(price, months) : subOn ? fullDiscountedAmount(price, months) : price;

  // Commande « pending » (virement) — pas d'accès tant que l'admin n'a pas validé la preuve.
  // `installment_month=1` marque la 1ʳᵉ échéance : `finalizeOrderConfirmation` créera l'abonnement.
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      status: "pending", customer_id: customerId, full_name, email: cleanEmail, phone,
      wilaya: wilaya ?? null, country: "Algérie",
      subtotal: total, discount: 0, total, payment_method: "transfer",
      installment_month: isInstallment ? 1 : null,
    })
    .select("id, order_number")
    .single();
  if (orderErr || !order) return { ok: false as const, error: orderErr?.message ?? "Inscription impossible." };

  const { error: itemErr } = await admin.from("order_items").insert({
    order_id: order.id, course_id: course.id, title: course.titre_fr, price: total, quantity: 1,
  });
  if (itemErr) {
    await admin.from("orders").delete().eq("id", order.id);
    return { ok: false as const, error: "Inscription impossible." };
  }

  await notifyAdminEmail("🧾 Nouvelle commande (formation) — /offre", {
    "Formation": course.titre_fr || "Formation",
    "N° commande": order.order_number ?? order.id,
    "Montant": `${Number(total).toLocaleString("fr-DZ")} DA`,
    "Formule": isInstallment ? "Paiement en tranches (1ʳᵉ échéance)" : subOn ? "Comptant (remisé)" : "Comptant",
    "Cliente": full_name, "Email": cleanEmail, "Téléphone": phone, "Wilaya": wilaya || "—",
  }, { intro: "Une inscription à une formation vient d'être passée (virement, en attente de validation).", link: "/admin/commandes" });

  return { ok: true as const, orderId: order.id };
}

const DeliverySchema = z.object({
  full_name: z.string().trim().min(2, "Nom complet requis."),
  email: z.string().email("Email invalide."),
  phone: z.string().trim().min(6, "Téléphone requis."),
  wilaya: z.string().trim().optional().nullable(),
  address: z.string().trim().min(4, "Adresse de livraison requise."),
  courseId: z.string().uuid("Choisissez une formation."),
});

/**
 * Inscription avec PAIEMENT À LA LIVRAISON (société de transport).
 * Crée une commande `cod` en attente : l'élève paie le transporteur à la
 * réception de la fiche (code-barres d'accès). Aucun accès tant que non payé.
 */
export async function submitDeliveryOrder(input: unknown) {
  const parsed = DeliverySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const { full_name, email, phone, wilaya, address, courseId } = parsed.data;
  const cleanEmail = email.trim().toLowerCase();

  const admin = createAdminClient();
  const { data: course } = await admin
    .from("courses").select("id, titre_fr, prix_dzd, published, visible_inscription").eq("id", courseId).maybeSingle();
  if (!course || !course.published || !course.visible_inscription) return { ok: false as const, error: "Formation indisponible." };
  const price = Number(course.prix_dzd) || 0;

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      status: "pending", full_name, email: cleanEmail, phone,
      address, wilaya: wilaya ?? null, country: "Algérie",
      subtotal: price, discount: 0, total: price, payment_method: "cod",
    })
    .select("id")
    .single();
  if (orderErr || !order) return { ok: false as const, error: orderErr?.message ?? "Inscription impossible." };

  const { error: itemErr } = await admin.from("order_items").insert({
    order_id: order.id, course_id: course.id, title: course.titre_fr, price, quantity: 1,
  });
  if (itemErr) { await admin.from("orders").delete().eq("id", order.id); return { ok: false as const, error: "Inscription impossible." }; }

  // Email de confirmation expliquant le déroulé (best-effort).
  try {
    const html = `
      <h2 style="font-family:Georgia,serif;color:#1b0c3c;margin:0 0 8px">Inscription enregistrée ✅</h2>
      <p style="color:#4b5563">Bonjour ${full_name}, votre demande pour « <strong>${course.titre_fr}</strong> » est bien reçue (paiement à la livraison).</p>
      <ol style="color:#4b5563;line-height:1.8">
        <li>📞 Vous recevrez un <strong>appel de confirmation</strong>.</li>
        <li>🏠 Vous choisissez la livraison <strong>au bureau</strong> ou <strong>à domicile</strong>.</li>
        <li>📦 Le transporteur vous remet une <strong>fiche avec un code-barres d'accès</strong>.</li>
        <li>💵 Vous <strong>payez le transporteur</strong> → votre accès est activé directement.</li>
      </ol>
      <p style="color:#9ca3af;font-size:13px">Merci de votre confiance — Arazzo Formation.</p>`;
    await sendEmail({ to: cleanEmail, category: "welcome", force: true, subject: "📦 Inscription Arazzo — paiement à la livraison", html });
  } catch { /* best-effort */ }

  return { ok: true as const, orderId: order.id };
}

/** Trouve la commande en attente la plus récente pour un email (étape 2). */
async function latestPendingOrder(admin: ReturnType<typeof createAdminClient>, email: string) {
  const { data } = await admin
    .from("orders")
    .select("id, customer_id, email, full_name, total, status")
    .eq("email", email)
    .in("status", PROCESSING)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

/**
 * Étape 2a : prépare une URL d'upload signée pour déposer la preuve directement
 * vers Supabase Storage (évite la limite 4,5 Mo des Server Actions). Public,
 * identifié par l'email saisi au formulaire.
 */
export async function createLeadProofUploadUrl(email: string, ext: string) {
  const emailOk = z.string().email().safeParse((email ?? "").trim().toLowerCase());
  if (!emailOk.success) return { ok: false as const, error: "Email invalide." };
  const cleanExt = (ext || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  if (!["jpg", "jpeg", "png", "pdf"].includes(cleanExt)) return { ok: false as const, error: "Format non supporté (JPG, PNG, PDF)." };

  const admin = createAdminClient();
  const order = await latestPendingOrder(admin, emailOk.data);
  if (!order) return { ok: false as const, error: "Aucune inscription trouvée pour cet email. Remplissez d'abord le formulaire." };

  const path = `${order.id}/${randomUUID()}.${cleanExt}`;
  const { data, error } = await admin.storage.from(PROOFS_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: "Préparation de l'envoi impossible." };
  return { ok: true as const, orderId: order.id, path: data.path, token: data.token };
}

/**
 * Étape 2b : enregistre la preuve déjà uploadée → crée le compte (avec les
 * coordonnées du formulaire), rattache la commande, met en revue, et envoie un
 * email de confirmation d'inscription avec lien direct au dashboard.
 * L'ACCÈS au cours reste accordé seulement après validation admin de la preuve.
 */
export async function recordLeadProof(orderId: string, path: string, fileType: string, fileSize: number) {
  const idOk = z.string().uuid().safeParse(orderId);
  const ftOk = z.enum(["jpg", "png", "pdf"]).safeParse(fileType);
  if (!idOk.success) return { ok: false as const, error: "Commande invalide." };
  if (!ftOk.success) return { ok: false as const, error: "Format non supporté." };
  if (typeof path !== "string" || !path.startsWith(idOk.data + "/")) return { ok: false as const, error: "Chemin invalide." };
  if (fileSize > MAX_PROOF) return { ok: false as const, error: "Fichier trop lourd (max 10 Mo)." };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders").select("id, customer_id, email, full_name, phone, total, status").eq("id", idOk.data).maybeSingle();
  if (!order) return { ok: false as const, error: "Inscription introuvable." };

  // 1) Compte (créé si nécessaire) avec les coordonnées saisies au formulaire
  let userId = order.customer_id as string | null;
  let isNew = false;
  if (!userId && order.email) {
    const { data: existing } = await admin.from("users").select("id").eq("email", order.email).maybeSingle();
    if (existing) userId = existing.id;
    else {
      const { data: created } = await admin.auth.admin.createUser({
        email: order.email, email_confirm: true,
        user_metadata: { nom: order.full_name ?? order.email.split("@")[0], phone: order.phone ?? null, account_type: "formations" },
      });
      userId = created?.user?.id ?? null;
      isNew = true;
    }
    if (userId) await admin.from("orders").update({ customer_id: userId }).eq("id", order.id);
  }

  // 2) Paiement (virement) + preuve (pending) + commande en revue
  let paymentId: string;
  const { data: existingPay } = await admin
    .from("order_payments").select("id").eq("order_id", order.id).eq("method", "transfer").maybeSingle();
  if (existingPay) {
    paymentId = existingPay.id;
    await admin.from("order_payments").update({ status: "submitted" }).eq("id", existingPay.id);
  } else {
    const { data: pay, error: payErr } = await admin
      .from("order_payments").insert({ order_id: order.id, method: "transfer", status: "submitted", amount: order.total })
      .select("id").single();
    if (payErr || !pay) return { ok: false as const, error: "Enregistrement du paiement impossible." };
    paymentId = pay.id;
  }
  const { error: proofErr } = await admin.from("payment_proofs").insert({
    payment_id: paymentId, order_id: order.id, file_url: path, file_type: ftOk.data, file_size: fileSize, status: "pending",
  });
  if (proofErr) return { ok: false as const, error: proofErr.message };
  await admin.from("orders").update({ status: "payment_review" }).eq("id", order.id);

  // 3) Email de confirmation d'inscription + lien pour CRÉER son mot de passe.
  // Le bouton ouvre /auth/reset-password (« Créez votre mot de passe ») avec le
  // même email : l'élève choisit son mot de passe puis accède à son dashboard.
  // Repli sur un magic link (connexion directe) si le lien recovery échoue.
  if (order.email) {
    const prenom = (order.full_name ?? "").split(" ")[0] || "chère élève";
    const pwd = await createPasswordSetupLink(order.email, `${SITE}/auth/reset-password`);
    let actionLink: string;
    let withPassword = true;
    if (pwd.ok && pwd.link) {
      actionLink = pwd.link;
    } else {
      const ml = await createMagicLink(order.email, `${SITE}/auth/callback?next=/dashboard`);
      actionLink = ml.ok && ml.link ? ml.link : `${SITE}/login`;
      withPassword = false;
    }
    const ctaLabel = withPassword ? "Créer mon mot de passe" : "Accéder à mon espace";
    const helpText = withPassword
      ? "Ce lien vous permet de choisir votre mot de passe (avec votre adresse email) puis d'accéder à votre tableau de bord. Vous pourrez ensuite vous connecter à tout moment avec votre email et ce mot de passe."
      : "Ce lien vous connecte directement à votre tableau de bord.";
    const html = `
      <div style="font-family:'DM Sans',Arial,sans-serif;background:#F5F0EB;padding:32px 16px;">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px -12px rgba(75,59,199,.18);">
          <div style="background:linear-gradient(135deg,#4B3BC7,#2B2180);padding:30px;text-align:center;">
            <div style="font-size:26px;color:#fff;font-family:Georgia,serif;font-weight:bold;">✂ ARAZZO</div>
            <div style="font-size:13px;color:#E07840;font-style:italic;margin-top:2px;">Formation</div>
          </div>
          <div style="padding:34px;color:#444;line-height:1.65;font-size:15px;">
            <h2 style="color:#4B3BC7;font-family:Georgia,serif;margin:0 0 14px;">Inscription confirmée, ${prenom} 🎉</h2>
            <p>Votre inscription est bien enregistrée et votre <strong>preuve de paiement reçue</strong>. Notre équipe la vérifie (sous 24–48 h) ; dès validation, votre formation sera <strong>débloquée</strong> dans votre espace.</p>
            <p style="margin:14px 0 0;">Pour accéder à votre tableau de bord, <strong>créez votre mot de passe</strong> ci-dessous (il sera associé à votre adresse <strong>${order.email}</strong>) :</p>
            <div style="text-align:center;margin:26px 0 8px;">
              <a href="${actionLink}" style="display:inline-block;background:#E07840;color:#fff;padding:14px 30px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:15px;">${ctaLabel}</a>
            </div>
            <p style="font-size:13px;color:#888;">${helpText}</p>
          </div>
          <div style="background:#F5F0EB;padding:16px;text-align:center;color:#999;font-size:12px;">${SITE.replace(/^https?:\/\//, "")}</div>
        </div>
      </div>`;
    try { await sendEmail({ userId: userId ?? undefined, to: order.email, category: "welcome", force: true, subject: "🎉 Votre inscription Arazzo — créez votre mot de passe", html }); } catch { /* best-effort */ }
  }

  // 4) Notification dashboard
  if (userId) {
    try {
      await admin.from("notifications").insert({
        user_id: userId, type: "system", title: "Preuve reçue ✅",
        body: "Votre preuve de paiement est en cours de vérification. Accès débloqué dès validation.", link: "/dashboard/commandes",
      });
    } catch { /* ignore */ }
  }

  return { ok: true as const, isNew };
}
