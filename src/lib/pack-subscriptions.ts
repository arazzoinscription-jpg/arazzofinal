import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { unlockMonthForIndex, monthlyAmount } from "@/lib/subscription-plan";
import { sendEmail } from "@/lib/email";
import { tplInstallmentReminder } from "@/lib/email-templates";

type Admin = ReturnType<typeof createAdminClient>;

function addMonthsISO(n: number, from = new Date()): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

export interface PackCourseAccess {
  isSubscription: true;
  unlockedMonths: number;
  totalMonths: number;
  unlockMonthByChapter: Record<string, number>;
  isChapterLocked: (chapterId: string) => boolean;
}

/**
 * Si l'élève a un abonnement PACK actif (payé par tranches) qui INCLUT ce cours,
 * renvoie le drip d'accès aux chapitres de CE cours, calculé sur l'ensemble des
 * chapitres de TOUS les cours du pack (ordre : cours par `ordre`/titre, puis
 * chapitres par `ordre`). Sinon renvoie null (pas de restriction liée au pack).
 *
 * Résilient : toute erreur (migration 047 non encore appliquée) → null.
 */
export async function getPackAccessForCourse(
  admin: Admin,
  userId: string,
  courseId: string,
): Promise<PackCourseAccess | null> {
  try {
    // 1) Abonnements pack actifs de l'élève
    const { data: subs, error: subErr } = await admin
      .from("pack_subscriptions")
      .select("pack_id, status, total_months, installments_paid")
      .eq("user_id", userId)
      .eq("status", "active");
    if (subErr || !subs?.length) return null;

    for (const sub of subs) {
      // 2) Le pack contient-il ce cours ?
      const { data: members } = await admin
        .from("course_pack_items")
        .select("course_id")
        .eq("pack_id", sub.pack_id as string);
      const courseIds = (members ?? []).map((m) => m.course_id as string);
      if (!courseIds.includes(courseId)) continue;

      // 3) Ordonne les cours du pack (ordre puis création) pour une numérotation stable
      const { data: coursesMeta } = await admin
        .from("courses")
        .select("id, ordre, created_at")
        .in("id", courseIds);
      const ordered = [...(coursesMeta ?? [])].sort((a, b) => {
        const ao = a.ordre ?? 1e9, bo = b.ordre ?? 1e9;
        if (ao !== bo) return ao - bo;
        return String(a.created_at).localeCompare(String(b.created_at));
      });

      // 4) Liste GLOBALE des chapitres du pack, dans l'ordre, + index
      //    select("*") : résilient si unlock_month n'existe pas encore (migration 053).
      const { data: chapters } = await admin
        .from("chapters")
        .select("*")
        .in("course_id", courseIds);
      const byCourse = new Map<string, { id: string; ordre: number }[]>();
      const explicitMonth = new Map<string, number>(); // mois d'ouverture personnalisé
      for (const ch of chapters ?? []) {
        const arr = byCourse.get(ch.course_id as string) ?? [];
        arr.push({ id: ch.id as string, ordre: (ch.ordre as number) ?? 0 });
        byCourse.set(ch.course_id as string, arr);
        const m = Number((ch as { unlock_month?: number | null }).unlock_month);
        if (Number.isFinite(m) && m >= 1) explicitMonth.set(ch.id as string, m);
      }
      const globalOrder: string[] = [];
      for (const c of ordered) {
        const list = (byCourse.get(c.id as string) ?? []).sort((a, b) => a.ordre - b.ordre);
        for (const ch of list) globalOrder.push(ch.id);
      }

      const totalMonths = (sub.total_months as number) || 1;
      const unlockedMonths = (sub.installments_paid as number) || 0;
      const total = globalOrder.length;
      const unlockMonthByChapter: Record<string, number> = {};
      globalOrder.forEach((chId, i) => {
        // Mois personnalisé prioritaire ; sinon découpe auto par index.
        const ex = explicitMonth.get(chId);
        unlockMonthByChapter[chId] = ex ? Math.min(ex, totalMonths) : unlockMonthForIndex(i, total, totalMonths);
      });

      return {
        isSubscription: true,
        unlockedMonths,
        totalMonths,
        unlockMonthByChapter,
        isChapterLocked: (chapterId: string) => (unlockMonthByChapter[chapterId] ?? 1) > unlockedMonths,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Avance l'abonnement PACK après validation d'une échéance (appelé par
 * finalizeOrderConfirmation). Crée l'abonnement à la 1ʳᵉ tranche puis incrémente
 * installments_paid → ouvre le palier suivant. No-op si pas une échéance pack.
 */
export async function advancePackSubscriptionForOrder(
  admin: Admin,
  params: { orderId: string; userId: string; packId: string; orderTotal: number; installmentMonth: number | null; packSubscriptionId: string | null },
): Promise<void> {
  const { orderId, userId, packId, orderTotal, installmentMonth, packSubscriptionId } = params;
  if (installmentMonth == null) return;

  type SubRow = { id: string; total_months: number; installments_paid: number };

  let sub: SubRow | null = null;
  if (packSubscriptionId) {
    const { data } = await admin.from("pack_subscriptions").select("id, total_months, installments_paid").eq("id", packSubscriptionId).maybeSingle();
    sub = data as SubRow | null;
  }
  if (!sub) {
    const { data } = await admin.from("pack_subscriptions").select("id, total_months, installments_paid").eq("user_id", userId).eq("pack_id", packId).maybeSingle();
    sub = data as SubRow | null;
  }

  if (!sub) {
    const { data: pack } = await admin.from("course_packs").select("prix_dzd, duration_months").eq("id", packId).maybeSingle();
    const totalMonths = Number((pack as { duration_months?: number | null } | null)?.duration_months) || installmentMonth;
    const monthly = orderTotal || monthlyAmount(Number((pack as { prix_dzd?: number } | null)?.prix_dzd) || 0, totalMonths);
    const { data: created } = await admin
      .from("pack_subscriptions")
      .insert({
        user_id: userId, pack_id: packId, status: "active",
        total_months: totalMonths, installments_paid: 0, monthly_amount_dzd: monthly,
        next_due_date: null, started_at: new Date().toISOString(),
      })
      .select("id, total_months, installments_paid")
      .single();
    sub = created as SubRow | null;
  }
  if (!sub) return;

  const totalMonths = sub.total_months || installmentMonth;
  // Cumulatif : une échéance qui vise le mois N règle tous les mois jusqu'à N.
  const newPaid = Math.min(totalMonths, Math.max((sub.installments_paid || 0) + 1, installmentMonth || 0));
  const completed = newPaid >= totalMonths;

  await admin
    .from("pack_subscriptions")
    .update({
      installments_paid: newPaid,
      status: completed ? "completed" : "active",
      next_due_date: completed ? null : addMonthsISO(1),
      last_reminded_at: null,
    })
    .eq("id", sub.id);

  if (!packSubscriptionId) await admin.from("orders").update({ pack_subscription_id: sub.id }).eq("id", orderId);

  await admin.from("notifications").insert({
    user_id: userId,
    type: "system",
    title: completed ? "🎓 Abonnement pack terminé" : "🔓 Nouveau palier débloqué (pack)",
    body: completed
      ? "Toutes vos échéances sont réglées — l'intégralité du pack est maintenant accessible."
      : `Paiement validé (mois ${newPaid}/${totalMonths}). De nouveaux chapitres du pack sont ouverts.`,
    link: "/dashboard",
  }).then(() => {}, () => {});
}

const PROCESSING_STATUSES = ["pending", "payment_pending", "payment_review"];

/** Rappels d'échéance des abonnements PACK (déclenché par le cron morning). */
export async function runPackInstallmentReminders(admin: Admin): Promise<{ reminded: number }> {
  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const DAY = 24 * 3600 * 1000;

    const { data: subs, error } = await admin
      .from("pack_subscriptions")
      .select("id, user_id, pack_id, total_months, installments_paid, monthly_amount_dzd, next_due_date, last_reminded_at")
      .eq("status", "active")
      .lte("next_due_date", today)
      .limit(300);
    if (error) return { reminded: 0 };

    let reminded = 0;
    for (const s of subs ?? []) {
      const paid = (s.installments_paid as number) || 0;
      const totalMonths = (s.total_months as number) || 0;
      if (paid >= totalMonths) continue;
      // Relance QUOTIDIENNE pendant 15 jours à partir de l'échéance.
      const due = (s.next_due_date as string) || today;
      if (now.getTime() > new Date(due).getTime() + 15 * DAY) continue;
      if (s.last_reminded_at && (s.last_reminded_at as string).slice(0, 10) >= today) continue;

      const nextMonth = paid + 1;
      const amount = (s.monthly_amount_dzd as number) || 0;

      const { data: u } = await admin.from("users").select("nom, email").eq("id", s.user_id).maybeSingle();
      const email = (u as { email?: string } | null)?.email;
      const nom = (u as { nom?: string } | null)?.nom ?? "";
      if (!email) continue;
      const { data: pk } = await admin.from("course_packs").select("titre_fr").eq("id", s.pack_id).maybeSingle();
      const packTitre = (pk as { titre_fr?: string } | null)?.titre_fr ?? "votre pack";

      const { data: existing } = await admin
        .from("orders")
        .select("id")
        .eq("pack_subscription_id", s.id)
        .eq("installment_month", nextMonth)
        .in("status", PROCESSING_STATUSES)
        .maybeSingle();

      if (!existing) {
        await admin
          .from("orders")
          .insert({
            status: "pending", customer_id: s.user_id, full_name: nom, email,
            country: "Algérie", subtotal: amount, discount: 0, total: amount,
            payment_method: "transfer", pack_id: s.pack_id, pack_subscription_id: s.id, installment_month: nextMonth,
          })
          .select("id")
          .single();
      }

      try {
        const tpl = tplInstallmentReminder(nom, packTitre, nextMonth, totalMonths, `${amount.toLocaleString("fr-DZ")} DA`);
        await sendEmail({ userId: s.user_id as string, to: email, category: tpl.category, subject: tpl.subject, html: tpl.html, force: true });
      } catch { /* l'email ne doit pas bloquer le cron */ }

      await admin.from("pack_subscriptions").update({ last_reminded_at: now.toISOString() }).eq("id", s.id);
      reminded++;
    }
    return { reminded };
  } catch {
    return { reminded: 0 };
  }
}
