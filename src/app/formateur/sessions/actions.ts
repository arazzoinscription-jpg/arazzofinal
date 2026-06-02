"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  const ok = prof?.role === "formateur" || prof?.role === "admin";
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
