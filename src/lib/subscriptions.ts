import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { unlockMonthForIndex, monthlyAmount } from "@/lib/subscription-plan";
import { sendEmail } from "@/lib/email";
import { tplInstallmentReminder } from "@/lib/email-templates";

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
  if (!enabled || months <= 1) return ALL_ACCESS;

  const { data: sub } = await admin
    .from("course_subscriptions")
    .select("status, installments_paid, total_months")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  // Pas d'abonnement = paiement comptant → accès complet.
  if (!sub) return ALL_ACCESS;

  const totalMonths = (sub.total_months as number) || months;
  const unlockedMonths = sub.status === "completed" ? totalMonths : (sub.installments_paid as number) || 0;

  const { data: chapters } = await admin
    .from("chapters")
    .select("id, ordre")
    .eq("course_id", courseId)
    .order("ordre", { ascending: true });

  const list = chapters ?? [];
  const unlockMonthByChapter: Record<string, number> = {};
  list.forEach((c, i) => {
    unlockMonthByChapter[c.id as string] = unlockMonthForIndex(i, list.length, totalMonths);
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
  const cutoffDue = new Date(now.getTime() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const remindFloor = new Date(now.getTime() - 20 * 24 * 3600 * 1000).toISOString();

  const { data: subs } = await admin
    .from("course_subscriptions")
    .select("id, user_id, course_id, total_months, installments_paid, monthly_amount_dzd, next_due_date, last_reminded_at")
    .eq("status", "active")
    .lte("next_due_date", cutoffDue)
    .limit(200);

  let reminded = 0;
  for (const s of subs ?? []) {
    const paid = (s.installments_paid as number) || 0;
    const totalMonths = (s.total_months as number) || 0;
    if (paid >= totalMonths) continue; // tout réglé
    if (s.last_reminded_at && (s.last_reminded_at as string) > remindFloor) continue; // déjà rappelé récemment

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
