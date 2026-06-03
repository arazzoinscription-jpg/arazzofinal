"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, ok: false };
  const { data: p } = await supabase.from("users").select("role").eq("id", user.id).single();
  return { supabase, user, ok: p?.role === "formateur" || p?.role === "admin" };
}

/** Crée un groupe (prof/admin). FormData : name, description, cover (image optionnelle). */
export async function createGroup(formData: FormData) {
  const { supabase, user, ok } = await requireStaff();
  if (!ok || !user) return { ok: false, error: "Accès refusé." };

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const cover = formData.get("cover");
  if (name.length < 2) return { ok: false, error: "Le nom du groupe est requis." };

  let coverUrl: string | null = null;
  if (cover instanceof File && cover.size > 0) {
    if (cover.size > 10 * 1024 * 1024) return { ok: false, error: "Image trop lourde (max 10 Mo)." };
    const admin = createAdminClient();
    const ext = (cover.name.split(".").pop() || "jpg").toLowerCase();
    const path = `groups/${user.id}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await cover.arrayBuffer());
    const { error: upErr } = await admin.storage.from("posts").upload(path, buffer, {
      contentType: cover.type || "image/jpeg", upsert: false,
    });
    if (!upErr) coverUrl = admin.storage.from("posts").getPublicUrl(path).data.publicUrl;
  }

  const { data: group, error } = await supabase
    .from("groups")
    .insert({ creator_id: user.id, name, description: description || null, cover_image_url: coverUrl })
    .select("id")
    .single();
  if (error || !group) return { ok: false, error: error?.message ?? "Création impossible." };

  revalidatePath("/formateur/groupes");
  return { ok: true, id: group.id };
}

/** Supprime un groupe (créateur via RLS). */
export async function deleteGroup(id: string) {
  const { supabase, ok } = await requireStaff();
  if (!ok) return { ok: false, error: "Accès refusé." };
  const { error } = await supabase.from("groups").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/formateur/groupes");
  return { ok: true };
}

const MemberSchema = z.object({ groupId: z.string().uuid(), userId: z.string().uuid() });

/** Ajoute un étudiant au groupe (créateur via RLS). */
export async function addMember(input: z.infer<typeof MemberSchema>) {
  const parsed = MemberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const { supabase, ok } = await requireStaff();
  if (!ok) return { ok: false, error: "Accès refusé." };
  const { error } = await supabase
    .from("group_members")
    .insert({ group_id: parsed.data.groupId, user_id: parsed.data.userId });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Déjà membre du groupe." };
    return { ok: false, error: error.message };
  }
  revalidatePath(`/formateur/groupes/${parsed.data.groupId}`);
  return { ok: true };
}

/** Retire un étudiant du groupe. */
export async function removeMember(input: z.infer<typeof MemberSchema>) {
  const parsed = MemberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const { supabase, ok } = await requireStaff();
  if (!ok) return { ok: false, error: "Accès refusé." };
  const { error } = await supabase
    .from("group_members").delete()
    .eq("group_id", parsed.data.groupId).eq("user_id", parsed.data.userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/formateur/groupes/${parsed.data.groupId}`);
  return { ok: true };
}

/** Recherche d'étudiants (par nom ou email) pour les ajouter à un groupe. */
export async function searchStudents(query: string) {
  const { ok } = await requireStaff();
  if (!ok) return { ok: false, error: "Accès refusé.", results: [] };
  const q = query.trim();
  if (q.length < 2) return { ok: true, results: [] };
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id, nom, email, avatar_url")
    .eq("role", "eleve")
    .or(`nom.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(10);
  return { ok: true, results: data ?? [] };
}
