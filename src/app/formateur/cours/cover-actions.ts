"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/roles";
import { compressImageToWebp } from "@/lib/images";

const MAX_COVER = 8 * 1024 * 1024; // 8 Mo (photo avant compression)

/**
 * Vérifie que l'utilisateur courant peut gérer un cours donné :
 * formateur propriétaire, cours importé non assigné (formateur_id NULL), ou admin.
 */
async function requireCourseAccess(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const { data: prof } = await supabase.from("users").select("role, roles").eq("id", user.id).single();
  const admin = createAdminClient();

  const { data: course } = await admin
    .from("courses").select("formateur_id").eq("id", courseId).single();
  if (!course) return { ok: false as const, error: "Cours introuvable." };

  const isOwner = course.formateur_id === user.id || course.formateur_id === null;
  if (!isOwner && !isAdmin(prof)) return { ok: false as const, error: "Accès refusé." };

  return { ok: true as const, admin };
}

/**
 * Téléverse (ou remplace) l'image de couverture d'un cours.
 * L'image est compressée en WebP puis stockée dans le bucket public `posts`
 * sous `course-covers/<courseId>/<uuid>.webp`, et l'URL publique est enregistrée
 * dans `courses.thumbnail`.
 *
 * FormData attendu : courseId (uuid), cover (File image).
 */
export async function uploadCourseCover(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  if (!z.string().uuid().safeParse(courseId).success) return { ok: false as const, error: "Cours invalide." };

  const file = formData.get("cover");
  if (!(file instanceof File) || file.size === 0) return { ok: false as const, error: "Aucune image sélectionnée." };
  if (!file.type.startsWith("image/")) return { ok: false as const, error: "Le fichier doit être une image." };
  if (file.size > MAX_COVER) return { ok: false as const, error: "Image trop lourde (max 8 Mo)." };

  const access = await requireCourseAccess(courseId);
  if (!access.ok) return { ok: false as const, error: access.error };
  const admin = access.admin;

  // Compression WebP (couverture large, 1280px) — plus léger pour le stockage et le chargement.
  const raw = await file.arrayBuffer();
  const webp = await compressImageToWebp(raw, 1280, 76);
  const bytes = webp ? new Uint8Array(webp) : new Uint8Array(raw);
  const contentType = webp ? "image/webp" : file.type;
  const ext = webp ? "webp" : ((file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg");

  const path = `course-covers/${courseId}/${randomUUID()}.${ext}`;
  const { error: upErr } = await admin.storage.from("posts").upload(path, bytes, {
    contentType,
    upsert: false,
    cacheControl: "31536000",
  });
  if (upErr) return { ok: false as const, error: "Envoi échoué : " + upErr.message };

  const publicUrl = admin.storage.from("posts").getPublicUrl(path).data.publicUrl;

  const { error } = await admin.from("courses").update({ thumbnail: publicUrl }).eq("id", courseId);
  if (error) return { ok: false as const, error: error.message };

  // Revalider toutes les vues qui affichent la couverture.
  revalidatePath("/formateur/cours");
  revalidatePath("/formateur/cours/couvertures");
  revalidatePath(`/formateur/cours/${courseId}/edit`);
  revalidatePath("/admin/formations");
  revalidatePath("/formations");
  revalidatePath("/");

  return { ok: true as const, url: publicUrl };
}

// ─── Galerie du cours (carrousel en-tête de la page publique) ────────────────

const MAX_GALLERY = 15; // nombre max de photos par cours

/** Message clair si la colonne `gallery` n'existe pas encore (migration 090). */
function galleryMigrationHint(error: { message?: string; code?: string } | null): string | null {
  if (!error) return null;
  if (error.code === "42703" || /gallery/i.test(error.message ?? "")) {
    return "Galerie non activée : appliquez d'abord la migration 090 (colonne gallery) dans Supabase.";
  }
  return error.message ?? "Erreur.";
}

/**
 * Téléverse une ou plusieurs photos dans la galerie d'un cours.
 * Chaque image est compressée en WebP et stockée dans le bucket public `posts`
 * sous `course-gallery/<courseId>/<uuid>.webp` ; les URLs sont AJOUTÉES au
 * tableau `courses.gallery`.
 *
 * FormData : courseId (uuid), images (un ou plusieurs File image).
 */
export async function uploadCourseGallery(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  if (!z.string().uuid().safeParse(courseId).success) return { ok: false as const, error: "Cours invalide." };

  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false as const, error: "Aucune image sélectionnée." };

  const access = await requireCourseAccess(courseId);
  if (!access.ok) return { ok: false as const, error: access.error };
  const admin = access.admin;

  // Galerie actuelle (lecture ; détecte si la migration n'est pas appliquée).
  const { data: current, error: readErr } = await admin.from("courses").select("gallery").eq("id", courseId).single();
  const hint = galleryMigrationHint(readErr);
  if (hint) return { ok: false as const, error: hint };
  const existing: string[] = (current?.gallery as string[] | null) ?? [];

  if (existing.length >= MAX_GALLERY) {
    return { ok: false as const, error: `Maximum ${MAX_GALLERY} photos par cours.` };
  }

  const room = MAX_GALLERY - existing.length;
  const added: string[] = [];
  for (const file of files.slice(0, room)) {
    if (!file.type.startsWith("image/")) continue;
    if (file.size > MAX_COVER) continue; // 8 Mo max, comme la couverture
    const raw = await file.arrayBuffer();
    const webp = await compressImageToWebp(raw, 1280, 76);
    const bytes = webp ? new Uint8Array(webp) : new Uint8Array(raw);
    const contentType = webp ? "image/webp" : file.type;
    const ext = webp ? "webp" : ((file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg");
    const path = `course-gallery/${courseId}/${randomUUID()}.${ext}`;
    const { error: upErr } = await admin.storage.from("posts").upload(path, bytes, { contentType, upsert: false, cacheControl: "31536000" });
    if (upErr) continue;
    added.push(admin.storage.from("posts").getPublicUrl(path).data.publicUrl);
  }

  if (added.length === 0) return { ok: false as const, error: "Aucune image n'a pu être envoyée." };

  const gallery = [...existing, ...added];
  const { error } = await admin.from("courses").update({ gallery }).eq("id", courseId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/formateur/cours/${courseId}/edit`);
  revalidatePath("/formations");
  return { ok: true as const, gallery };
}

/** Retire une photo de la galerie d'un cours (par son URL). */
export async function removeCourseGalleryImage(courseId: string, url: string) {
  if (!z.string().uuid().safeParse(courseId).success) return { ok: false as const, error: "Cours invalide." };
  const access = await requireCourseAccess(courseId);
  if (!access.ok) return { ok: false as const, error: access.error };
  const admin = access.admin;

  const { data: current, error: readErr } = await admin.from("courses").select("gallery").eq("id", courseId).single();
  const hint = galleryMigrationHint(readErr);
  if (hint) return { ok: false as const, error: hint };
  const existing: string[] = (current?.gallery as string[] | null) ?? [];
  const gallery = existing.filter((u) => u !== url);

  const { error } = await admin.from("courses").update({ gallery }).eq("id", courseId);
  if (error) return { ok: false as const, error: error.message };

  // Supprime le fichier du storage (best-effort) si c'est bien une image du bucket posts.
  const marker = "/storage/v1/object/public/posts/";
  const i = url.indexOf(marker);
  if (i >= 0) { try { await admin.storage.from("posts").remove([url.slice(i + marker.length)]); } catch { /* best-effort */ } }

  revalidatePath(`/formateur/cours/${courseId}/edit`);
  revalidatePath("/formations");
  return { ok: true as const, gallery };
}
