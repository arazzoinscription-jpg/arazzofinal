"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFormateur } from "@/lib/roles";
import { compressImageToWebp } from "@/lib/images";

async function requireStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, ok: false };
  const { data: p } = await supabase.from("users").select("role, roles").eq("id", user.id).single();
  return { supabase, user, ok: isFormateur(p) };
}

/**
 * Upload la photo d'un pack vers le stockage public et renvoie son URL.
 * Appelé depuis le formulaire client (FormData) pour garder le service role côté serveur.
 */
export async function uploadPackImage(formData: FormData) {
  const { ok } = await requireStaff();
  if (!ok) return { ok: false as const, error: "Accès refusé." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false as const, error: "Photo manquante." };
  if (!file.type.startsWith("image/")) return { ok: false as const, error: "Le fichier doit être une image." };
  // Les photos de téléphone dépassent souvent 8 Mo : on accepte jusqu'à 15 Mo en
  // entrée et on COMPRESSE en WebP (léger + affichage rapide). C'est ce qui manquait
  // avant → les grosses photos étaient refusées et « ne s'affichaient pas ».
  if (file.size > 15 * 1024 * 1024) return { ok: false as const, error: "Image trop volumineuse (max 15 Mo)." };

  const admin = createAdminClient();
  const raw = await file.arrayBuffer();
  const webp = await compressImageToWebp(raw, 1280, 78);
  const bytes = webp ? new Uint8Array(webp) : new Uint8Array(raw);
  const contentType = webp ? "image/webp" : file.type;
  const ext = webp ? "webp" : ((file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg");
  const path = `packs/${randomUUID()}.${ext}`;
  const { error } = await admin.storage.from("posts").upload(path, bytes, { contentType, upsert: false, cacheControl: "31536000" });
  if (error) return { ok: false as const, error: error.message };
  const url = admin.storage.from("posts").getPublicUrl(path).data.publicUrl;
  return { ok: true as const, url };
}

/**
 * Upload UNE photo de la galerie du pack (carrousel), compressée en WebP.
 * Renvoie l'URL publique ; la galerie (liste d'URLs) est enregistrée avec le pack
 * au moment de l'enregistrement du formulaire → pas besoin d'un packId ici.
 */
export async function uploadPackGalleryImage(formData: FormData) {
  const { ok } = await requireStaff();
  if (!ok) return { ok: false as const, error: "Accès refusé." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false as const, error: "Photo manquante." };
  if (!file.type.startsWith("image/")) return { ok: false as const, error: "Le fichier doit être une image." };
  if (file.size > 15 * 1024 * 1024) return { ok: false as const, error: "Image trop volumineuse (max 15 Mo)." };

  const admin = createAdminClient();
  const raw = await file.arrayBuffer();
  const webp = await compressImageToWebp(raw, 1280, 78);
  const bytes = webp ? new Uint8Array(webp) : new Uint8Array(raw);
  const contentType = webp ? "image/webp" : file.type;
  const ext = webp ? "webp" : ((file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg");
  const path = `pack-gallery/${randomUUID()}.${ext}`;
  const { error } = await admin.storage.from("posts").upload(path, bytes, { contentType, upsert: false, cacheControl: "31536000" });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, url: admin.storage.from("posts").getPublicUrl(path).data.publicUrl };
}

/** Enregistre la galerie du pack (colonne migration 092). Repli silencieux si absente. */
async function setPackGallerySafe(admin: ReturnType<typeof createAdminClient>, packId: string, gallery: string[] | undefined) {
  if (!gallery) return;
  try { await admin.from("course_packs").update({ gallery }).eq("id", packId); }
  catch { /* migration 092 non appliquée */ }
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
  category_id: z.string().uuid().nullable().optional(),
  courseIds: z.array(z.string().uuid()).min(1, "Sélectionnez au moins un cours."),
  gallery: z.array(z.string().url()).max(30).optional(),
});

// Écriture tolérante de la catégorie du pack (colonne migration 074). Si la
// colonne n'existe pas encore, on ignore l'erreur — la création/màj réussit
// quand même (la catégorie ne s'affichera dans l'offre qu'après la migration).
async function setPackCategorySafe(admin: ReturnType<typeof createAdminClient>, packId: string, categoryId: string | null | undefined) {
  try { await admin.from("course_packs").update({ category_id: categoryId ?? null }).eq("id", packId); }
  catch { /* migration 074 non appliquée */ }
}

/**
 * Insère les cours d'un pack EN CONSERVANT L'ORDRE (colonne `ordre`, migration 091).
 * `courseIds` est déjà dans l'ordre voulu. Repli sans `ordre` si la colonne n'existe
 * pas encore → la création réussit quand même (ordre par défaut).
 */
async function insertPackItemsOrdered(
  client: { from: (t: string) => any },
  packId: string,
  courseIds: string[],
): Promise<{ error: { message: string } | null }> {
  const withOrder = courseIds.map((course_id, i) => ({ pack_id: packId, course_id, ordre: i }));
  let { error } = await client.from("course_pack_items").insert(withOrder);
  if (error && (error.code === "42703" || /ordre/i.test(error.message ?? ""))) {
    const bare = courseIds.map((course_id) => ({ pack_id: packId, course_id }));
    ({ error } = await client.from("course_pack_items").insert(bare));
  }
  return { error };
}

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

  // Cours inclus dans le pack, dans l'ordre choisi.
  const { error: itemsError } = await insertPackItemsOrdered(supabase, pack.id, d.courseIds);
  if (itemsError) return { ok: false, error: itemsError.message };

  await setPackCategorySafe(createAdminClient(), pack.id, d.category_id);
  await setPackGallerySafe(createAdminClient(), pack.id, d.gallery);

  revalidatePath("/formateur/packs");
  revalidatePath("/offre");
  return { ok: true, id: pack.id };
}

const PackUpdateSchema = PackSchema.extend({ id: z.string().uuid() });

/** Met à jour un pack existant (infos + cours inclus). Propriétaire ou admin. */
export async function updatePack(input: z.infer<typeof PackUpdateSchema>) {
  const parsed = PackUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase, user, ok } = await requireStaff();
  if (!ok || !user) return { ok: false, error: "Accès refusé." };

  const d = parsed.data;
  const admin = createAdminClient();

  // Autorisation : propriétaire du pack ou admin.
  const { data: pack } = await admin.from("course_packs").select("id, formateur_id").eq("id", d.id).single();
  if (!pack) return { ok: false, error: "Pack introuvable." };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (pack.formateur_id !== user.id && prof?.role !== "admin") return { ok: false, error: "Ce pack appartient à un autre formateur." };

  const { error: upErr } = await admin
    .from("course_packs")
    .update({
      titre_fr: d.titre_fr,
      titre_ar: d.titre_ar || null,
      description_fr: d.description_fr || null,
      prix_dzd: d.prix_dzd,
      prix_eur: d.prix_eur,
      thumbnail: d.thumbnail || null,
      published: d.published,
    })
    .eq("id", d.id);
  if (upErr) return { ok: false, error: upErr.message };

  // Remplace la liste des cours inclus (les items ne portent aucune donnée à préserver).
  const { error: delErr } = await admin.from("course_pack_items").delete().eq("pack_id", d.id);
  if (delErr) return { ok: false, error: delErr.message };
  const { error: insErr } = await insertPackItemsOrdered(admin, d.id, d.courseIds);
  if (insErr) return { ok: false, error: insErr.message };

  await setPackCategorySafe(admin, d.id, d.category_id);
  await setPackGallerySafe(admin, d.id, d.gallery);

  // Synchronise le produit boutique (bundle) : reprend le titre et la PHOTO DU PACK
  // pour que la vignette boutique affiche bien la photo ajoutée au pack.
  try {
    const { data: bundles } = await admin.from("products").select("id, files").eq("type", "bundle");
    const prod = (bundles ?? []).find((p) => ((p.files as string[]) ?? []).includes(`pack:${d.id}`));
    if (prod) {
      const patch: Record<string, unknown> = { title: d.titre_fr };
      if (d.thumbnail) patch.images = [d.thumbnail];
      await admin.from("products").update(patch).eq("id", prod.id);
    }
  } catch { /* pas bloquant */ }

  revalidatePath("/formateur/packs");
  revalidatePath(`/formateur/packs/${d.id}/edit`);
  revalidatePath("/offre");
  revalidatePath("/boutique");
  return { ok: true, id: d.id };
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
