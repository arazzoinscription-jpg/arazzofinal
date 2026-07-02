import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import {
  renderProspectEmail,
  tplAccountInactivity,
  type ProspectEmailKind,
  type ProspectBranding,
} from "@/lib/email-templates";

type Admin = ReturnType<typeof createAdminClient>;

const DAY = 1000 * 60 * 60 * 24;

/** Statuts de commande considérés comme « achat effectué ». */
export const PURCHASED_ORDER_STATUSES = ["confirmed", "shipped", "delivered"] as const;

// ─── Paramètres (singleton prospect_settings) ────────────────────────────────
export interface ProspectSettings {
  enabled: boolean;
  sequence_start_at: string;
  delay_welcome_days: number;
  delay_reminder_2_days: number;
  delay_reminder_7_days: number;
  delay_reminder_14_days: number;
  delay_deletion_months: number;
  subject_welcome: string | null;
  html_welcome: string | null;
  subject_reminder_2: string | null;
  html_reminder_2: string | null;
  subject_reminder_7: string | null;
  html_reminder_7: string | null;
  subject_reminder_14: string | null;
  html_reminder_14: string | null;
  promo_enabled: boolean;
  promo_text: string | null;
  signature: string | null;
  logo_url: string | null;
}

const SETTINGS_DEFAULTS: ProspectSettings = {
  enabled: true,
  sequence_start_at: new Date().toISOString(),
  delay_welcome_days: 0,
  delay_reminder_2_days: 2,
  delay_reminder_7_days: 7,
  delay_reminder_14_days: 14,
  delay_deletion_months: 12,
  subject_welcome: null, html_welcome: null,
  subject_reminder_2: null, html_reminder_2: null,
  subject_reminder_7: null, html_reminder_7: null,
  subject_reminder_14: null, html_reminder_14: null,
  promo_enabled: false, promo_text: null,
  signature: null, logo_url: null,
};

export async function getProspectSettings(admin: Admin): Promise<ProspectSettings> {
  const { data } = await admin.from("prospect_settings").select("*").eq("id", 1).maybeSingle();
  return { ...SETTINGS_DEFAULTS, ...(data ?? {}) } as ProspectSettings;
}

function brandingFrom(s: ProspectSettings): ProspectBranding {
  return {
    signature: s.signature,
    logoUrl: s.logo_url,
    promoText: s.promo_enabled ? s.promo_text : null,
  };
}

function overridesFor(s: ProspectSettings, kind: ProspectEmailKind): { subject: string | null; html: string | null } {
  switch (kind) {
    case "welcome": return { subject: s.subject_welcome, html: s.html_welcome };
    case "reminder_2": return { subject: s.subject_reminder_2, html: s.html_reminder_2 };
    case "reminder_7": return { subject: s.subject_reminder_7, html: s.html_reminder_7 };
    case "reminder_14": return { subject: s.subject_reminder_14, html: s.html_reminder_14 };
    default: return { subject: null, html: null };
  }
}

const firstName = (nom: string | null | undefined) => (nom || "").trim().split(/\s+/)[0] || "à vous";

// ─── Détection d'achat (batch, borné aux ids fournis → évite le cap 1000) ─────
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Ensemble des utilisateurs (parmi `ids`) ayant passé commande. */
export async function loadPurchaserSet(admin: Admin, ids: string[]): Promise<Set<string>> {
  const purchased = new Set<string>();
  if (ids.length === 0) return purchased;
  for (const part of chunk(ids, 500)) {
    const { data: enr } = await admin.from("enrollments").select("user_id").in("user_id", part);
    (enr ?? []).forEach((e: { user_id: string | null }) => e.user_id && purchased.add(e.user_id));
    const { data: ord } = await admin
      .from("orders").select("customer_id")
      .in("customer_id", part)
      .in("status", PURCHASED_ORDER_STATUSES as unknown as string[]);
    (ord ?? []).forEach((o: { customer_id: string | null }) => o.customer_id && purchased.add(o.customer_id));
  }
  return purchased;
}

/** A-t-il passé commande ? (inscription formation OU commande confirmée). */
export async function hasUserPurchased(admin: Admin, userId: string): Promise<boolean> {
  const { count: enr } = await admin
    .from("enrollments").select("*", { count: "exact", head: true }).eq("user_id", userId);
  if (enr && enr > 0) return true;
  const { count: ord } = await admin
    .from("orders").select("*", { count: "exact", head: true })
    .eq("customer_id", userId).in("status", PURCHASED_ORDER_STATUSES as unknown as string[]);
  return !!ord && ord > 0;
}

/**
 * Arrête immédiatement la séquence dès qu'un achat est constaté.
 * Best-effort : ne jette jamais (appelé dans le tunnel de paiement).
 */
export async function stopProspectSequenceOnPurchase(admin: Admin, userId: string): Promise<void> {
  try {
    const { data: row } = await admin
      .from("prospect_sequence")
      .select("reminder_2_sent_at, reminder_7_sent_at, reminder_14_sent_at, has_purchased")
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) return; // pas un prospect suivi → rien à faire
    if (row.has_purchased) return;
    const before =
      (row.reminder_2_sent_at ? 1 : 0) +
      (row.reminder_7_sent_at ? 1 : 0) +
      (row.reminder_14_sent_at ? 1 : 0);
    await admin
      .from("prospect_sequence")
      .update({
        has_purchased: true,
        first_purchase_at: new Date().toISOString(),
        reminders_before_purchase: before,
        sequence_stopped: true,
        stopped_reason: "purchased",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("has_purchased", false);
  } catch {
    /* best-effort */
  }
}

/**
 * Crée / démarre le suivi prospect + envoie l'email de bienvenue immédiatement.
 * Idempotent et sans-échec : appelé à l'inscription (email + OAuth).
 * N'envoie rien si le compte a déjà acheté, si la séquence est désactivée,
 * ou si le compte est antérieur à la borne de démarrage.
 */
export async function startProspectAndWelcome(
  admin: Admin,
  userId: string,
  opts: { nom?: string | null; email?: string | null; source?: string } = {},
): Promise<void> {
  try {
    const settings = await getProspectSettings(admin);
    // Profil (pour nom/email/created_at si non fournis)
    const { data: profile } = await admin
      .from("users").select("nom, email, role, created_at").eq("id", userId).maybeSingle();
    if (!profile) return;
    if (profile.role && profile.role !== "eleve") return;
    if (new Date(profile.created_at).getTime() < new Date(settings.sequence_start_at).getTime()) return;

    // Ligne de suivi (créée si absente) — ne réécrase pas une ligne existante.
    await admin
      .from("prospect_sequence")
      .upsert(
        { user_id: userId, registration_source: opts.source || "direct", updated_at: new Date().toISOString() },
        { onConflict: "user_id", ignoreDuplicates: true },
      );

    if (!settings.enabled) return;
    if (await hasUserPurchased(admin, userId)) {
      await stopProspectSequenceOnPurchase(admin, userId);
      return;
    }

    // Claim atomique de l'email de bienvenue (anti-doublon avec le cron).
    const nowISO = new Date().toISOString();
    const { data: claimed } = await admin
      .from("prospect_sequence")
      .update({ welcome_sent_at: nowISO, last_reminder_at: nowISO, updated_at: nowISO })
      .eq("user_id", userId)
      .is("welcome_sent_at", null)
      .select("user_id");
    if (!claimed || claimed.length === 0) return; // déjà envoyé

    const email = opts.email || profile.email;
    if (!email) return;
    const tpl = renderProspectEmail("welcome", firstName(opts.nom ?? profile.nom), brandingFrom(settings), overridesFor(settings, "welcome"));
    await sendEmail({ userId, to: email, category: tpl.category, subject: tpl.subject, html: tpl.html });
  } catch {
    /* best-effort : ne bloque jamais l'inscription */
  }
}

// ─── Moteur de séquence (cron) ───────────────────────────────────────────────
interface SeqRow {
  user_id: string;
  registration_source: string;
  welcome_sent_at: string | null;
  reminder_2_sent_at: string | null;
  reminder_7_sent_at: string | null;
  reminder_14_sent_at: string | null;
  has_purchased: boolean;
  sequence_stopped: boolean;
}

/**
 * Parcourt les inscrits (élèves) créés depuis la borne de démarrage, arrête la
 * séquence des acheteurs, et envoie AU PLUS UN email dû par utilisateur et par
 * passage (welcome → J+2 → J+7 → J+14). Idempotent (anti-doublon par claim).
 */
export async function runProspectSequence(admin: Admin) {
  const settings = await getProspectSettings(admin);
  if (!settings.enabled) return { ok: true, skipped: "disabled" as const };

  const result = { welcome: 0, reminder_2: 0, reminder_7: 0, reminder_14: 0, converted: 0, scanned: 0 };

  const { data: users } = await admin
    .from("users")
    .select("id, nom, email, created_at")
    .eq("role", "eleve")
    .gte("created_at", settings.sequence_start_at)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (!users || users.length === 0) return { ok: true, ...result };
  result.scanned = users.length;

  const ids = users.map((u: { id: string }) => u.id);
  const purchased = await loadPurchaserSet(admin, ids);

  const { data: seqRows } = await admin
    .from("prospect_sequence")
    .select("user_id, registration_source, welcome_sent_at, reminder_2_sent_at, reminder_7_sent_at, reminder_14_sent_at, has_purchased, sequence_stopped")
    .in("user_id", ids);
  const seqMap = new Map<string, SeqRow>();
  (seqRows ?? []).forEach((r: SeqRow) => seqMap.set(r.user_id, r));

  const branding = brandingFrom(settings);
  const now = Date.now();

  for (const u of users as { id: string; nom: string | null; email: string | null; created_at: string }[]) {
    const row = seqMap.get(u.id);
    if (row?.sequence_stopped) continue;

    // ── Conversion : arrêt immédiat, aucun email marketing ──
    if (purchased.has(u.id)) {
      await stopProspectSequenceOnPurchase(admin, u.id);
      if (!row?.has_purchased) result.converted++;
      continue;
    }
    if (!u.email) continue;

    // Garantit l'existence de la ligne (pour le claim atomique).
    if (!row) {
      await admin.from("prospect_sequence").upsert(
        { user_id: u.id, registration_source: "direct", updated_at: new Date().toISOString() },
        { onConflict: "user_id", ignoreDuplicates: true },
      );
    }

    const ageDays = Math.floor((now - new Date(u.created_at).getTime()) / DAY);

    // Choix du prochain email dû (un seul par passage).
    let kind: ProspectEmailKind | null = null;
    let stampCol = "";
    const w = row?.welcome_sent_at ?? null;
    const r2 = row?.reminder_2_sent_at ?? null;
    const r7 = row?.reminder_7_sent_at ?? null;
    const r14 = row?.reminder_14_sent_at ?? null;
    if (!w && ageDays >= settings.delay_welcome_days) { kind = "welcome"; stampCol = "welcome_sent_at"; }
    else if (!r2 && ageDays >= settings.delay_reminder_2_days) { kind = "reminder_2"; stampCol = "reminder_2_sent_at"; }
    else if (!r7 && ageDays >= settings.delay_reminder_7_days) { kind = "reminder_7"; stampCol = "reminder_7_sent_at"; }
    else if (!r14 && ageDays >= settings.delay_reminder_14_days) { kind = "reminder_14"; stampCol = "reminder_14_sent_at"; }
    if (!kind) continue;

    // Claim atomique : ne réussit que si la colonne était NULL (anti-doublon).
    const nowISO = new Date().toISOString();
    const patch: Record<string, unknown> = { [stampCol]: nowISO, last_reminder_at: nowISO, updated_at: nowISO };
    if (kind === "reminder_14") { patch.sequence_stopped = true; patch.stopped_reason = "completed"; }
    const { data: claimed } = await admin
      .from("prospect_sequence")
      .update(patch)
      .eq("user_id", u.id)
      .is(stampCol, null)
      .select("user_id");
    if (!claimed || claimed.length === 0) continue; // déjà pris par un autre passage

    const tpl = renderProspectEmail(kind, firstName(u.nom), branding, overridesFor(settings, kind));
    await sendEmail({ userId: u.id, to: u.email, category: tpl.category, subject: tpl.subject, html: tpl.html });
    result[kind]++;
  }

  return { ok: true, ...result };
}

/**
 * Inactivité longue (≥ delay_deletion_months) : envoie « Souhaitez-vous conserver
 * votre compte ? » une seule fois, puis (30 j sans reconnexion après cet email)
 * place le compte dans « À supprimer » — la suppression réelle reste manuelle (admin).
 */
export async function runProspectInactivity(admin: Admin) {
  const settings = await getProspectSettings(admin);
  const result = { notices: 0, marked: 0 };
  const now = Date.now();
  const inactivityMs = settings.delay_deletion_months * 30 * DAY;
  const GRACE = 30 * DAY;

  // Comptes auth (dernière connexion) — pagination comme le cron reactivation.
  let page = 1;
  const authUsers: { id: string; email: string; last_sign_in_at: string | null; created_at: string }[] = [];
  while (true) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (!data || data.users.length === 0) break;
    data.users.forEach((u) =>
      authUsers.push({
        id: u.id, email: u.email ?? "",
        last_sign_in_at: u.last_sign_in_at ?? null,
        created_at: u.created_at,
      }),
    );
    if (data.users.length < 1000) break;
    page++;
  }

  const purchased = await loadPurchaserSet(admin, authUsers.map((a) => a.id));

  for (const au of authUsers) {
    if (!au.email) continue;
    if (purchased.has(au.id)) continue; // « aucune commande » requis
    const lastActive = new Date(au.last_sign_in_at ?? au.created_at).getTime();
    if (now - lastActive < inactivityMs) continue;

    const { data: profile } = await admin
      .from("users").select("nom, role").eq("id", au.id).maybeSingle();
    if (!profile || (profile.role && profile.role !== "eleve")) continue;

    const { data: row } = await admin
      .from("prospect_sequence")
      .select("inactivity_notice_sent_at, marked_for_deletion_at")
      .eq("user_id", au.id)
      .maybeSingle();

    // 1) Email « conserver votre compte ? » (une seule fois)
    if (!row?.inactivity_notice_sent_at) {
      const nowISO = new Date().toISOString();
      // Claim : garantit la ligne puis pose l'horodatage si absent.
      await admin.from("prospect_sequence").upsert(
        { user_id: au.id, updated_at: nowISO },
        { onConflict: "user_id", ignoreDuplicates: true },
      );
      const { data: claimed } = await admin
        .from("prospect_sequence")
        .update({ inactivity_notice_sent_at: nowISO, updated_at: nowISO })
        .eq("user_id", au.id)
        .is("inactivity_notice_sent_at", null)
        .select("user_id");
      if (claimed && claimed.length > 0) {
        const tpl = tplAccountInactivity(firstName(profile.nom), brandingFrom(settings));
        await sendEmail({ userId: au.id, to: au.email, category: tpl.category, subject: tpl.subject, html: tpl.html, force: true });
        result.notices++;
      }
      continue;
    }

    // 2) Toujours inactif 30 j après l'email → « À supprimer » (validation admin requise)
    if (!row.marked_for_deletion_at) {
      const noticeAt = new Date(row.inactivity_notice_sent_at).getTime();
      const stillInactive = lastActive <= noticeAt; // aucune reconnexion depuis l'email
      if (now - noticeAt >= GRACE && stillInactive) {
        await admin
          .from("prospect_sequence")
          .update({ marked_for_deletion_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("user_id", au.id)
          .is("marked_for_deletion_at", null);
        result.marked++;
      }
    }
  }

  return { ok: true, ...result };
}
