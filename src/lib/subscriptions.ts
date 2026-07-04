import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { unlockMonthForIndex, monthlyAmount } from "@/lib/subscription-plan";
import { sendEmail } from "@/lib/email";
import { tplInstallmentReminder } from "@/lib/email-templates";
import { getPackAccessForCourse } from "@/lib/pack-subscriptions";

type Admin = ReturnType<typeof createAdminClient>;

/** Renvoie une date décalée de `n` mois (format YYYY-MM-DD). */
function addMonthsISO(n: number, from = new Date()): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

export interface CourseAccess {
  /** La formation est-elle en mode abonnement ET l'élève y est abonné par tranches ? */
  isSubscription: boolean;
  /** Mois déjà débloqués (= nb de tranches payées). Infini si accès complet. */
  unlockedMonths: number;
  totalMonths: number;
  /** Mois (1-based) d'ouverture par chapitre. */
  unlockMonthByChapter: Record<string, number>;
  /** Vrai si le chapitre n'est pas encore ouvert pour cet élève. */
  isChapterLocked: (chapterId: string) => boolean;
}

const ALL_ACCESS: CourseAccess = {
  isSubscription: false,
  unlockedMonths: Number.POSITIVE_INFINITY,
  totalMonths: 0,
  unlockMonthByChapter: {},
  isChapterLocked: () => false,
};

/**
 * Calcule l'accès aux chapitres d'un cours pour un élève.
 * - Cours sans mode abonnement → tout débloqué (comportement historique).
 * - Cours abonnement mais l'élève a payé COMPTANT (aucune ligne course_subscriptions)
 *   → tout débloqué.
 * - Élève abonné par tranches → `unlockedMonths = installments_paid` ; un chapitre
 *   est verrouillé si son mois d'ouverture dépasse les mois payés.
 */
export async function getCourseAccess(admin: Admin, userId: string, courseId: string): Promise<CourseAccess> {
  const { data: course } = await admin
    .from("courses")
    .select("subscription_enabled, duration_months")
    .eq("id", courseId)
    .maybeSingle();

  const enabled = (course as { subscription_enabled?: boolean } | null)?.subscription_enabled === true;
  const months = (course as { duration_months?: number } | null)?.duration_months ?? 0;
  // Le cours n'est pas en abonnement « solo » : il peut quand même appartenir à un
  // pack acheté par tranches → on applique le drip du pack le cas échéant.
  if (!enabled || months <= 1) return (await getPackAccessForCourse(admin, userId, courseId)) ?? ALL_ACCESS;

  const { data: sub } = await admin
    .from("course_subscriptions")
    .select("status, installments_paid, total_months")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  // Pas d'abonnement cours = paiement comptant du cours… mais peut-être un abonnement pack.
  if (!sub) return (await getPackAccessForCourse(admin, userId, courseId)) ?? ALL_ACCESS;

  const totalMonths = (sub.total_months as number) || months;
  const unlockedMonths = sub.status === "completed" ? totalMonths : (sub.installments_paid as number) || 0;

  // select("*") : résilient si la colonne unlock_month n'existe pas encore (migration 053).
  const { data: chapters } = await admin
    .from("chapters")
    .select("*")
    .eq("course_id", courseId)
    .order("ordre", { ascending: true });

  const list = chapters ?? [];
  const unlockMonthByChapter: Record<string, number> = {};
  list.forEach((c, i) => {
    // Mois d'ouverture PERSONNALISÉ (chapters.unlock_month) prioritaire ; sinon découpe auto.
    const explicit = Number((c as { unlock_month?: number | null }).unlock_month);
    unlockMonthByChapter[c.id as string] =
      Number.isFinite(explicit) && explicit >= 1
        ? Math.min(explicit, totalMonths)
        : unlockMonthForIndex(i, list.length, totalMonths);
  });

  return {
    isSubscription: true,
    unlockedMonths,
    totalMonths,
    unlockMonthByChapter,
    isChapterLocked: (chapterId: string) => (unlockMonthByChapter[chapterId] ?? 1) > unlockedMonths,
  };
}

/**
 * Avance l'abonnement après validation d'une échéance (appelé par
 * `finalizeOrderConfirmation`). Crée l'abonnement à la 1ʳᵉ tranche puis
 * incrémente `installments_paid` à chaque tranche validée → ouvre le palier
 * suivant. Idempotent au niveau de la commande (finalize ne tourne qu'une fois
 * par commande). No-op si la commande n'est pas une échéance d'abonnement.
 */
export async function advanceSubscriptionForOrder(
  admin: Admin,
  params: { orderId: string; userId: string; courseId: string; orderTotal: number; installmentMonth: number | null; subscriptionId: string | null },
): Promise<void> {
  const { orderId, userId, courseId, orderTotal, installmentMonth, subscriptionId } = params;
  if (installmentMonth == null) return; // commande comptant → pas d'abonnement

  type SubRow = { id: string; total_months: number; installments_paid: number };

  // Récupère l'abonnement (par id si déjà lié, sinon par élève+formation).
  let sub: SubRow | null = null;
  if (subscriptionId) {
    const { data } = await admin.from("course_subscriptions").select("id, total_months, installments_paid").eq("id", subscriptionId).maybeSingle();
    sub = data as SubRow | null;
  }
  if (!sub) {
    const { data } = await admin.from("course_subscriptions").select("id, total_months, installments_paid").eq("user_id", userId).eq("course_id", courseId).maybeSingle();
    sub = data as SubRow | null;
  }

  // 1ʳᵉ tranche : on crée l'abonnement (snapshot de la durée + montant mensuel).
  if (!sub) {
    const { data: course } = await admin.from("courses").select("prix_dzd, duration_months").eq("id", courseId).maybeSingle();
    const totalMonths = Number((course as { duration_months?: number | null } | null)?.duration_months) || installmentMonth;
    const monthly = orderTotal || monthlyAmount(Number((course as { prix_dzd?: number } | null)?.prix_dzd) || 0, totalMonths);
    const { data: created } = await admin
      .from("course_subscriptions")
      .insert({
        user_id: userId, course_id: courseId, status: "active",
        total_months: totalMonths, installments_paid: 0, monthly_amount_dzd: monthly,
        next_due_date: null, started_at: new Date().toISOString(),
      })
      .select("id, total_months, installments_paid")
      .single();
    sub = created as SubRow | null;
  }
  if (!sub) return;

  const totalMonths = sub.total_months || installmentMonth;
  const newPaid = (sub.installments_paid || 0) + 1;
  const completed = newPaid >= totalMonths;

  await admin
    .from("course_subscriptions")
    .update({
      installments_paid: newPaid,
      status: completed ? "completed" : "active",
      next_due_date: completed ? null : addMonthsISO(1),
      last_reminded_at: null, // remet le compteur anti-spam à zéro pour la prochaine échéance
    })
    .eq("id", sub.id);

  // Rattache la commande à l'abonnement si ce n'était pas déjà fait.
  if (!subscriptionId) await admin.from("orders").update({ subscription_id: sub.id }).eq("id", orderId);

  // Notifie l'élève du palier débloqué.
  await admin.from("notifications").insert({
    user_id: userId,
    type: "system",
    title: completed ? "🎓 Abonnement terminé" : "🔓 Nouveau palier débloqué",
    body: completed
      ? "Toutes vos échéances sont réglées — l'intégralité de la formation est maintenant accessible."
      : `Paiement validé (mois ${newPaid}/${totalMonths}). De nouveaux chapitres sont ouverts dans votre formation.`,
    link: "/dashboard",
  }).then(() => {}, () => {});
}

const PROCESSING_STATUSES = ["pending", "payment_pending", "payment_review"];

/**
 * Rappels d'échéance des abonnements (déclenché par le cron `morning`).
 * Pour chaque abonnement actif dont l'échéance approche (≤ 3 j) et non rappelé
 * depuis ~20 j : crée la commande d'échéance suivante (visible dans
 * /dashboard/commandes pour le dépôt de reçu), envoie l'email de rappel, et
 * horodate `last_reminded_at` (anti-doublon). Renvoie le nombre de rappels.
 */
export async function runInstallmentReminders(admin: Admin): Promise<{ reminded: number }> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const DAY = 24 * 3600 * 1000;

  // Échéances arrivées à terme (fin de mois atteinte).
  const { data: subs } = await admin
    .from("course_subscriptions")
    .select("id, user_id, course_id, total_months, installments_paid, monthly_amount_dzd, next_due_date, last_reminded_at")
    .eq("status", "active")
    .lte("next_due_date", today)
    .limit(300);

  let reminded = 0;
  for (const s of subs ?? []) {
    const paid = (s.installments_paid as number) || 0;
    const totalMonths = (s.total_months as number) || 0;
    if (paid >= totalMonths) continue; // tout réglé
    // Relance QUOTIDIENNE pendant 15 jours à partir de l'échéance (fin de mois).
    const due = (s.next_due_date as string) || today;
    if (now.getTime() > new Date(due).getTime() + 15 * DAY) continue; // fenêtre de 15 j dépassée → on n'insiste plus
    if (s.last_reminded_at && (s.last_reminded_at as string).slice(0, 10) >= today) continue; // déjà relancé aujourd'hui

    const nextMonth = paid + 1;
    const amount = (s.monthly_amount_dzd as number) || 0;

    // Coordonnées élève + titre formation.
    const { data: u } = await admin.from("users").select("nom, email").eq("id", s.user_id).maybeSingle();
    const email = (u as { email?: string } | null)?.email;
    const nom = (u as { nom?: string } | null)?.nom ?? "";
    if (!email) continue;
    const { data: c } = await admin.from("courses").select("titre_fr").eq("id", s.course_id).maybeSingle();
    const coursTitre = (c as { titre_fr?: string } | null)?.titre_fr ?? "votre formation";

    // Commande d'échéance (idempotent : réutilise une commande ouverte du même mois).
    const { data: existing } = await admin
      .from("orders")
      .select("id")
      .eq("subscription_id", s.id)
      .eq("installment_month", nextMonth)
      .in("status", PROCESSING_STATUSES)
      .maybeSingle();

    if (!existing) {
      const { data: order } = await admin
        .from("orders")
        .insert({
          status: "pending", customer_id: s.user_id, full_name: nom, email,
          country: "Algérie", subtotal: amount, discount: 0, total: amount,
          payment_method: "transfer", subscription_id: s.id, installment_month: nextMonth,
        })
        .select("id")
        .single();
      if (order) {
        await admin.from("order_items").insert({
          order_id: order.id, course_id: s.course_id, title: coursTitre, price: amount, quantity: 1,
        });
      }
    }

    // Email de rappel (best-effort).
    try {
      const tpl = tplInstallmentReminder(nom, coursTitre, nextMonth, totalMonths, `${amount.toLocaleString("fr-DZ")} DA`);
      await sendEmail({ userId: s.user_id as string, to: email, category: tpl.category, subject: tpl.subject, html: tpl.html, force: true });
    } catch { /* l'email ne doit pas bloquer le cron */ }

    await admin.from("course_subscriptions").update({ last_reminded_at: now.toISOString() }).eq("id", s.id);
    reminded++;
  }

  return { reminded };
}

/** Crée (ou réutilise) la commande d'échéance PENDING pour un match donné. */
async function openInstallmentOrder(
  admin: Admin,
  userId: string,
  matchField: "subscription_id" | "pack_subscription_id",
  matchValue: string,
  installmentMonth: number,
  amount: number,
  orderExtra: Record<string, unknown>,
  itemTitle: string,
): Promise<{ ok: boolean; orderId?: string; error?: string; month?: number; amount?: number }> {
  const { data: existing } = await admin
    .from("orders").select("id")
    .eq(matchField, matchValue).eq("installment_month", installmentMonth)
    .in("status", PROCESSING_STATUSES).maybeSingle();
  if (existing) return { ok: true, orderId: existing.id as string, month: installmentMonth, amount };

  const { data: u } = await admin.from("users").select("nom, email").eq("id", userId).maybeSingle();
  const email = (u as { email?: string } | null)?.email;
  if (!email) return { ok: false, error: "Votre compte n'a pas d'email." };

  const { data: order, error } = await admin
    .from("orders")
    .insert({
      status: "pending", customer_id: userId, full_name: (u as { nom?: string } | null)?.nom ?? "", email,
      country: "Algérie", subtotal: amount, discount: 0, total: amount, payment_method: "transfer",
      installment_month: installmentMonth, ...orderExtra,
    })
    .select("id").single();
  if (error || !order) return { ok: false, error: error?.message ?? "Création de l'échéance impossible." };

  await admin.from("order_items").insert({ order_id: order.id, title: itemTitle, price: amount, quantity: 1 }).then(() => {}, () => {});
  return { ok: true, orderId: order.id as string, month: installmentMonth, amount };
}

/**
 * Prépare le paiement du MOIS SUIVANT en avance (élève).
 * Gère l'abonnement solo (course_subscriptions) ET l'abonnement pack
 * (pack_subscriptions contenant ce cours). Idempotent : réutilise une commande
 * d'échéance déjà ouverte. Renvoie l'orderId → l'élève dépose son reçu dans
 * /dashboard/commandes ; à la validation admin, le palier suivant s'ouvre.
 */
export async function ensureNextInstallmentOrder(
  admin: Admin, userId: string, courseId: string,
): Promise<{ ok: boolean; orderId?: string; error?: string; month?: number; amount?: number; done?: boolean }> {
  // 1) Abonnement SOLO du cours
  const { data: sub } = await admin
    .from("course_subscriptions")
    .select("id, total_months, installments_paid, monthly_amount_dzd")
    .eq("user_id", userId).eq("course_id", courseId).eq("status", "active").maybeSingle();
  if (sub) {
    const paid = (sub.installments_paid as number) || 0;
    const total = (sub.total_months as number) || 0;
    if (paid >= total) return { ok: false, done: true, error: "Toutes vos échéances sont déjà réglées." };
    const { data: c } = await admin.from("courses").select("titre_fr").eq("id", courseId).maybeSingle();
    const titre = (c as { titre_fr?: string } | null)?.titre_fr ?? "Formation";
    return openInstallmentOrder(admin, userId, "subscription_id", sub.id as string, paid + 1,
      (sub.monthly_amount_dzd as number) || 0, { subscription_id: sub.id }, `${titre} — échéance ${paid + 1}`);
  }

  // 2) Abonnement PACK contenant ce cours
  const { data: psubs } = await admin
    .from("pack_subscriptions")
    .select("id, pack_id, total_months, installments_paid, monthly_amount_dzd")
    .eq("user_id", userId).eq("status", "active");
  for (const ps of psubs ?? []) {
    const { data: members } = await admin.from("course_pack_items").select("course_id").eq("pack_id", ps.pack_id as string);
    if (!(members ?? []).some((m) => (m.course_id as string) === courseId)) continue;
    const paid = (ps.installments_paid as number) || 0;
    const total = (ps.total_months as number) || 0;
    if (paid >= total) return { ok: false, done: true, error: "Toutes vos échéances sont déjà réglées." };
    const { data: pk } = await admin.from("course_packs").select("titre_fr").eq("id", ps.pack_id as string).maybeSingle();
    const titre = (pk as { titre_fr?: string } | null)?.titre_fr ?? "Pack";
    return openInstallmentOrder(admin, userId, "pack_subscription_id", ps.id as string, paid + 1,
      (ps.monthly_amount_dzd as number) || 0, { pack_id: ps.pack_id, pack_subscription_id: ps.id }, `${titre} — échéance ${paid + 1}`);
  }

  return { ok: false, error: "Aucun abonnement par tranches actif pour cette formation." };
}
