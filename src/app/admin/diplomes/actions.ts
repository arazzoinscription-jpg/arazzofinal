"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureDiploma } from "@/lib/diplomas";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (prof?.role !== "admin") return { ok: false as const };
  return { ok: true as const, admin: createAdminClient() };
}

/** Recherche d'étudiants (nom / email) pour la génération manuelle. */
export async function searchStudentsForDiploma(query: string) {
  const a = await requireAdmin();
  if (!a.ok) return { ok: false as const, results: [] };
  const q = (query ?? "").trim();
  if (q.length < 2) return { ok: true as const, results: [] };
  const { data } = await a.admin
    .from("users").select("id, nom, email").or(`nom.ilike.%${q}%,email.ilike.%${q}%`).limit(15);
  return { ok: true as const, results: data ?? [] };
}

/** Formations d'un étudiant (ses inscriptions) — pour choisir le cours du diplôme. */
export async function studentCourses(userId: string) {
  const a = await requireAdmin();
  if (!a.ok) return { ok: false as const, courses: [] };
  const { data } = await a.admin.from("enrollments").select("course:courses(id, titre_fr)").eq("user_id", userId);
  const courses = (data ?? []).map((e: any) => e.course).filter(Boolean).map((c: any) => ({ id: c.id, titre: c.titre_fr ?? "Formation" }));
  return { ok: true as const, courses };
}

/** GÉNÉRATION MANUELLE : l'admin déclenche le diplôme d'un étudiant + email CNI. */
export async function manualGenerateDiploma(input: { userId: string; courseId: string }) {
  const parsed = z.object({ userId: z.string().uuid(), courseId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Données invalides." };
  const a = await requireAdmin();
  if (!a.ok) return { ok: false as const, error: "Accès refusé." };
  const res = await ensureDiploma(a.admin, parsed.data.userId, parsed.data.courseId);
  if (!res.ok) return { ok: false as const, error: res.error ?? "Erreur." };
  revalidatePath("/admin/diplomes");
  return { ok: true as const, created: res.created };
}

/** Change le statut d'un diplôme (eligible → cni_uploaded → generated → shipped). */
export async function setDiplomaStatus(id: string, status: "eligible" | "cni_uploaded" | "generated" | "shipped") {
  const parsed = z.object({ id: z.string().uuid(), status: z.enum(["eligible", "cni_uploaded", "generated", "shipped"]) }).safeParse({ id, status });
  if (!parsed.success) return { ok: false as const, error: "Données invalides." };
  const a = await requireAdmin();
  if (!a.ok) return { ok: false as const, error: "Accès refusé." };
  const { error } = await a.admin.from("diplomas").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  // 🎉 Diplôme « généré » → célébration diffusée en temps réel à tous les élèves
  // (popup + son). On utilise le PSEUDO de l'élève (jamais son nom réel) si dispo.
  if (status === "generated") {
    try {
      const { data: dip } = await a.admin
        .from("diplomas").select("user:users(nom, username), course:courses(titre_fr)").eq("id", id).maybeSingle();
      const u = (dip as any)?.user;
      const name = u?.username ? `@${u.username}` : (u?.nom?.split(" ")[0] ?? "Une élève");
      await a.admin.from("celebrations").insert({ student_name: name, course_titre: (dip as any)?.course?.titre_fr ?? null });
    } catch { /* la célébration ne doit pas bloquer le changement de statut */ }
  }

  revalidatePath("/admin/diplomes");
  return { ok: true as const };
}

/** URL signée temporaire pour consulter la CNI (bucket privé proofs). */
export async function getCniSignedUrl(id: string) {
  const a = await requireAdmin();
  if (!a.ok) return { ok: false as const, error: "Accès refusé." };
  const { data: dip } = await a.admin.from("diplomas").select("cni_path").eq("id", id).maybeSingle();
  if (!dip?.cni_path) return { ok: false as const, error: "Aucune CNI envoyée." };
  const { data, error } = await a.admin.storage.from("proofs").createSignedUrl(dip.cni_path as string, 60 * 10);
  if (error || !data) return { ok: false as const, error: "Lien indisponible." };
  return { ok: true as const, url: data.signedUrl };
}
