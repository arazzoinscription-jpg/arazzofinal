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

/** Liste les cours du formateur (tous si admin) pour choisir une promotion. */
export async function staffCourses() {
  const { user, ok } = await requireStaff();
  if (!ok || !user) return { ok: false, courses: [] as { id: string; titre: string }[] };
  // Espace formateur = SES propres cours uniquement.
  const admin = createAdminClient();
  const { data } = await admin.from("courses").select("id, titre_fr")
    .eq("formateur_id", user.id)
    .order("ordre", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
  return { ok: true, courses: (data ?? []).map((c) => ({ id: c.id, titre: c.titre_fr ?? "Formation" })) };
}

/** Packs (course_packs) du formateur — ou tous pour l'admin. */
export async function staffPacks() {
  const { user, ok } = await requireStaff();
  if (!ok || !user) return { ok: false, packs: [] as { id: string; titre: string }[] };
  // Espace formateur = SES propres packs uniquement.
  const admin = createAdminClient();
  const { data } = await admin.from("course_packs").select("id, titre_fr")
    .eq("formateur_id", user.id).order("created_at", { ascending: false });
  return { ok: true, packs: (data ?? []).map((p) => ({ id: p.id, titre: p.titre_fr ?? "Pack" })) };
}

/** Résout un cours OU un pack en une liste d'IDs de cours. */
async function resolveCourseIds(admin: ReturnType<typeof createAdminClient>, id: string, kind: "course" | "pack") {
  if (kind === "pack") {
    const { data } = await admin.from("course_pack_items").select("course_id").eq("pack_id", id);
    return [...new Set((data ?? []).map((i) => i.course_id))];
  }
  return [id];
}

/** Étudiants inscrits à un cours OU à un pack (union des cours du pack). */
export async function courseEnrollees(id: string, kind: "course" | "pack" = "course") {
  const { ok } = await requireStaff();
  if (!ok) return { ok: false, results: [] as { id: string; nom: string; email: string; avatar_url: string | null }[] };
  const admin = createAdminClient();
  const courseIds = await resolveCourseIds(admin, id, kind);
  if (courseIds.length === 0) return { ok: true, results: [] };
  const { data } = await admin
    .from("enrollments").select("user:users(id, nom, email, avatar_url)").in("course_id", courseIds);
  const map = new Map<string, { id: string; nom: string; email: string; avatar_url: string | null }>();
  for (const e of (data ?? []) as any[]) {
    const u = e.user;
    if (u?.id && !map.has(u.id)) map.set(u.id, { id: u.id, nom: u.nom ?? "Étudiant", email: u.email ?? "", avatar_url: u.avatar_url ?? null });
  }
  return { ok: true, results: [...map.values()] };
}

/** Ajoute en une fois tous les inscrits d'un cours OU d'un pack au groupe. */
export async function addCourseMembers(groupId: string, id: string, kind: "course" | "pack" = "course") {
  const { supabase, user, ok } = await requireStaff();
  if (!ok || !user) return { ok: false, error: "Accès refusé." };
  const { data: g } = await supabase.from("groups").select("creator_id").eq("id", groupId).single();
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!g || (g.creator_id !== user.id && prof?.role !== "admin")) return { ok: false, error: "Accès refusé." };

  const admin = createAdminClient();
  const courseIds = await resolveCourseIds(admin, id, kind);
  if (courseIds.length === 0) return { ok: true, added: 0 };
  const { data: enr } = await admin.from("enrollments").select("user_id").in("course_id", courseIds);
  const ids = [...new Set((enr ?? []).map((e) => e.user_id))];
  if (ids.length === 0) return { ok: true, added: 0 };

  const { data: existing } = await admin.from("group_members").select("user_id").eq("group_id", groupId);
  const have = new Set((existing ?? []).map((m) => m.user_id));
  const toAdd = ids.filter((id) => !have.has(id)).map((user_id) => ({ group_id: groupId, user_id }));
  if (toAdd.length === 0) return { ok: true, added: 0 };

  const { error } = await admin.from("group_members").insert(toAdd);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/formateur/groupes/${groupId}`);
  return { ok: true, added: toAdd.length };
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
