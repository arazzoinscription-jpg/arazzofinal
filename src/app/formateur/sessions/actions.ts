"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFormateur } from "@/lib/roles";
import { resolveLive } from "@/lib/live";
import { brandedSiteUrl } from "@/lib/site-url";

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
  return { supabase, user, ok };
}

export async function createSession(input: z.infer<typeof SessionSchema>) {
  const parsed = SessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase, user, ok } = await requireStaff();
  if (!ok || !user) return { ok: false, error: "Accès refusé." };

  const d = parsed.data;
  const { error } = await supabase.from("live_sessions").insert({
    formateur_id: user.id,
    titre: d.titre,
    description: d.description || null,
    course_id: d.course_id || null,
    starts_at: new Date(d.starts_at).toISOString(),
    meet_url: d.meet_url || null,
    replay_url: d.replay_url || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/formateur/sessions");
  return { ok: true };
}

export async function deleteSession(id: string) {
  const { supabase, ok } = await requireStaff();
  if (!ok) return { ok: false, error: "Accès refusé." };
  const { error } = await supabase.from("live_sessions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/formateur/sessions");
  return { ok: true };
}

export async function addReplay(id: string, replayUrl: string) {
  const { supabase, ok } = await requireStaff();
  if (!ok) return { ok: false, error: "Accès refusé." };
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
