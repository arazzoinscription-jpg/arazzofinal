"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasRole, isFormateur } from "@/lib/roles";
import { resolveLive } from "@/lib/live";
import { brandedSiteUrl } from "@/lib/site-url";
import { lireDateHeureLocale, migrationAbsente } from "@/lib/live-care/repli";
import { annulerLive } from "@/lib/live-care/load";
import { instantAlger } from "@/lib/live-care/temps";

const SessionSchema = z.object({
  titre: z.string().min(2, "Titre trop court"),
  description: z.string().optional(),
  course_id: z.string().uuid().nullable().optional(),
  starts_at: z.string().min(1), // datetime-local ISO
  meet_url: z.string().url("Lien invalide").optional().or(z.literal("")),
  replay_url: z.string().url().optional().or(z.literal("")),
});

async function requireStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, ok: false };
  const { data: prof } = await supabase.from("users").select("role, roles").eq("id", user.id).single();
  const ok = isFormateur(prof);
  return { supabase, user, ok, estAdmin: hasRole(prof, "admin") };
}

/**
 * Propriétaire et origine d'une session (colonnes de la migration 096 si elle est appliquée).
 * Une formatrice n'agit que sur SES sessions ; l'administratrice sur toutes.
 */
async function lireCible(id: string) {
  const admin = createAdminClient();
  const r = await admin.from("live_sessions").select("id, formateur_id, created_via, series_id").eq("id", id).maybeSingle();
  if (r.error && migrationAbsente(r.error)) {
    const repli = await admin.from("live_sessions").select("id, formateur_id").eq("id", id).maybeSingle();
    return { admin, cible: repli.data as { id: string; formateur_id: string; created_via?: string | null; series_id?: string | null } | null, erreur: repli.error?.message };
  }
  return { admin, cible: r.data as { id: string; formateur_id: string; created_via?: string | null; series_id?: string | null } | null, erreur: r.error?.message };
}

export async function createSession(input: z.infer<typeof SessionSchema>) {
  const parsed = SessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase, user, ok } = await requireStaff();
  if (!ok || !user) return { ok: false, error: "Accès refusé." };

  const d = parsed.data;
  // Le champ « datetime-local » donne une heure SANS fuseau, pensée à Alger. Le serveur
  // tourne en UTC : `new Date("…T19:00")` y donnait 19:00 UTC (= 20:00 à Alger).
  const local = lireDateHeureLocale(d.starts_at);
  let startsAt: string;
  try {
    startsAt = local ? instantAlger(local.jour, local.heure) : new Date(d.starts_at).toISOString();
  } catch {
    return { ok: false, error: "Date ou heure invalide." };
  }
  const { error } = await supabase.from("live_sessions").insert({
    formateur_id: user.id,
    titre: d.titre,
    description: d.description || null,
    course_id: d.course_id || null,
    starts_at: startsAt,
    meet_url: d.meet_url || null,
    replay_url: d.replay_url || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/formateur/sessions");
  return { ok: true };
}

export async function deleteSession(id: string) {
  const { supabase, user, ok, estAdmin } = await requireStaff();
  if (!ok || !user) return { ok: false, error: "Accès refusé." };
  const { admin, cible, erreur } = await lireCible(id);
  if (erreur) return { ok: false, error: erreur };
  if (!cible) return { ok: false, error: "Session introuvable." };
  if (cible.formateur_id !== user.id && !estAdmin) return { ok: false, error: "Cette session ne vous appartient pas." };

  // Programmée par l'administration (/admin/lives) : ANNULÉE, pas effacée — la ligne reste,
  // la série ne la recrée pas, ses rappels passent en « annulé », le cron reste verrouillé.
  if (cible.created_via === "admin_lives" || cible.series_id) {
    try {
      await annulerLive(admin, id, "occurrence", "Retirée par la formatrice (/formateur/sessions)", { userId: user.id, maintenant: new Date(), niveaux: [] });
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Annulation impossible." };
    }
    revalidatePath("/formateur/sessions");
    revalidatePath("/admin/lives");
    return { ok: true, annulee: true };
  }

  const { error } = await supabase.from("live_sessions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/formateur/sessions");
  return { ok: true };
}

export async function addReplay(id: string, replayUrl: string) {
  const { supabase, user, ok, estAdmin } = await requireStaff();
  if (!ok || !user) return { ok: false, error: "Accès refusé." };
  const { cible, erreur } = await lireCible(id);
  if (erreur) return { ok: false, error: erreur };
  if (!cible) return { ok: false, error: "Session introuvable." };
  if (cible.formateur_id !== user.id && !estAdmin) return { ok: false, error: "Cette session ne vous appartient pas." };
  const { error } = await supabase.from("live_sessions").update({ replay_url: replayUrl }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/formateur/sessions");
  return { ok: true };
}

// ── Passage EN DIRECT maintenant (YouTube/Facebook intégré + audience) ───────

const StartLiveSchema = z.object({
  titre: z.string().trim().min(2, "Titre trop court."),
  live_url: z.string().url("Lien de direct invalide."),
  audience: z.enum(["public", "group", "link"]),
  group_id: z.string().uuid().nullable().optional(),
});

/** Démarre un direct : crée la session (is_live=true) + notifie l'audience. */
export async function startLive(input: z.infer<typeof StartLiveSchema>) {
  const parsed = StartLiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { user, ok } = await requireStaff();
  if (!ok || !user) return { ok: false as const, error: "Accès refusé." };
  if (!resolveLive(d.live_url).platform) return { ok: false as const, error: "Lien non reconnu (YouTube, Facebook, TikTok ou Instagram)." };
  if (d.audience === "group" && !d.group_id) return { ok: false as const, error: "Choisissez un groupe." };

  const admin = createAdminClient();
  const token = (randomUUID() + randomUUID()).replace(/-/g, "");

  // Un seul direct actif à la fois pour ce formateur : on coupe les précédents.
  await admin.from("live_sessions").update({ is_live: false }).eq("formateur_id", user.id).eq("is_live", true);

  const { data: row, error } = await admin.from("live_sessions").insert({
    formateur_id: user.id,
    titre: d.titre,
    starts_at: new Date().toISOString(),
    live_url: d.live_url,
    meet_url: d.live_url,
    audience: d.audience,
    group_id: d.audience === "group" ? d.group_id : null,
    access_token: token,
    is_live: true,
  }).select("id").single();
  if (error || !row) return { ok: false as const, error: error?.message ?? "Impossible de démarrer le direct." };

  // Notifier l'audience (in-app + push via webhook). Le lien-secret ne notifie personne.
  try {
    const link = "/communaute/live";
    let targets: string[] = [];
    if (d.audience === "public") {
      const { data: us } = await admin.from("users").select("id").contains("roles", ["eleve"]);
      targets = (us ?? []).map((u: { id: string }) => u.id).filter((id) => id !== user.id);
    } else if (d.audience === "group" && d.group_id) {
      const { data: ms } = await admin.from("group_members").select("user_id").eq("group_id", d.group_id);
      targets = (ms ?? []).map((m: { user_id: string }) => m.user_id).filter((id) => id !== user.id);
    }
    if (targets.length) {
      await admin.from("notifications").insert(
        targets.map((uid) => ({ user_id: uid, type: "session", title: `🔴 En direct : ${d.titre}`, body: "Le direct vient de commencer — rejoignez-le !", link })),
      );
    }
  } catch { /* la notif ne doit jamais bloquer le direct */ }

  revalidatePath("/formateur/sessions");
  revalidatePath("/communaute/live");
  const shareUrl = `${brandedSiteUrl()}/live/${token}`;
  return { ok: true as const, id: row.id as string, token, shareUrl };
}

/** Arrête le direct en cours (le formateur propriétaire ou un admin). */
export async function stopLive(id: string) {
  const { user, ok } = await requireStaff();
  if (!ok || !user) return { ok: false as const, error: "Accès refusé." };
  const admin = createAdminClient();
  await admin.from("live_sessions").update({ is_live: false }).eq("id", id).eq("formateur_id", user.id);
  revalidatePath("/formateur/sessions");
  revalidatePath("/communaute/live");
  return { ok: true as const };
}
