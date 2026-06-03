"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, ok: false };
  const { data: p } = await supabase.from("users").select("role").eq("id", user.id).single();
  return { supabase, user, ok: p?.role === "formateur" || p?.role === "admin" };
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const PackSchema = z.object({
  titre_fr: z.string().min(2, "Le titre est requis."),
  titre_ar: z.string().nullable().optional(),
  description_fr: z.string().nullable().optional(),
  prix_dzd: z.number().int().min(0),
  prix_eur: z.number().int().min(0),
  thumbnail: z.string().nullable().optional(),
  published: z.boolean(),
  courseIds: z.array(z.string().uuid()).min(1, "Sélectionnez au moins un cours."),
});

/** Crée un pack de cours (bundle) appartenant au formateur courant. */
export async function createPack(input: z.infer<typeof PackSchema>) {
  const parsed = PackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase, user, ok } = await requireStaff();
  if (!ok || !user) return { ok: false, error: "Accès refusé." };

  const d = parsed.data;
  const slug = slugify(d.titre_fr) + "-" + Date.now();

  const { data: pack, error } = await supabase
    .from("course_packs")
    .insert({
      titre_fr: d.titre_fr,
      titre_ar: d.titre_ar || null,
      slug,
      description_fr: d.description_fr || null,
      prix_dzd: d.prix_dzd,
      prix_eur: d.prix_eur,
      thumbnail: d.thumbnail || null,
      formateur_id: user.id,
      published: d.published,
    })
    .select("id")
    .single();

  if (error || !pack) return { ok: false, error: error?.message ?? "Erreur lors de la création." };

  // Cours inclus dans le pack
  const items = d.courseIds.map((course_id) => ({ pack_id: pack.id, course_id }));
  const { error: itemsError } = await supabase.from("course_pack_items").insert(items);
  if (itemsError) return { ok: false, error: itemsError.message };

  revalidatePath("/formateur/packs");
  return { ok: true, id: pack.id };
}

/** Supprime un pack (le formateur propriétaire uniquement, via RLS). */
export async function deletePack(id: string) {
  const { supabase, ok } = await requireStaff();
  if (!ok) return { ok: false, error: "Accès refusé." };
  const { error } = await supabase.from("course_packs").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/formateur/packs");
  return { ok: true };
}
