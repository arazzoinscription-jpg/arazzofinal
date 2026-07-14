"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeText } from "@/lib/security/sanitize";
import { compressImageToWebp } from "@/lib/images";
import { uploadPracticalFile as bunnyUpload, isPracticalsConfigured } from "@/lib/bunny/practicals-storage";
import { MAX_PRACTICAL_PHOTOS, MAX_PRACTICAL_VIDEOS } from "@/lib/practicals-limits";
import { ensureNextInstallmentOrder } from "@/lib/subscriptions";
import { isFormateur } from "@/lib/roles";

async function ctx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: prof } = await supabase.from("users").select("role, roles").eq("id", user.id).single();
  const role = prof?.role ?? "eleve";
  return { user, role, isStaff: isFormateur(prof) };
}

async function lessonCourse(admin: ReturnType<typeof createAdminClient>, lessonId: string) {
  const { data } = await admin
    .from("lessons").select("id, is_preview, chapter:chapters(course_id)").eq("id", lessonId).maybeSingle();
  if (!data) return null;
  return { courseId: (data.chapter as any)?.course_id as string | undefined, isPreview: !!data.is_preview };
}

/** Formateur propriétaire + titres, pour notifier lors d'une question / d'un travail. */
async function courseOwner(admin: ReturnType<typeof createAdminClient>, lessonId: string) {
  const { data: l } = await admin.from("lessons").select("titre, chapter:chapters(course_id)").eq("id", lessonId).maybeSingle();
  const courseId = (l?.chapter as any)?.course_id as string | undefined;
  if (!courseId) return null;
  const { data: course } = await admin.from("courses").select("formateur_id, titre_fr").eq("id", courseId).maybeSingle();
  return { formateurId: (course?.formateur_id as string | null) ?? null, courseTitre: course?.titre_fr ?? "", lessonTitre: (l as any)?.titre ?? "Leçon" };
}

/** Notifie le formateur du cours (in-app → push via webhook). Best-effort. */
async function notifyFormateur(admin: ReturnType<typeof createAdminClient>, lessonId: string, studentId: string, title: string, body: string, link: string) {
  try {
    const owner = await courseOwner(admin, lessonId);
    if (owner?.formateurId && owner.formateurId !== studentId) {
      await admin.from("notifications").insert({ user_id: owner.formateurId, type: "reply", title, body: body.slice(0, 140) || null, link });
    }
  } catch { /* ne bloque jamais l'action élève */ }
}

async function hasAccess(admin: ReturnType<typeof createAdminClient>, userId: string, isStaff: boolean, lessonId: string) {
  const lc = await lessonCourse(admin, lessonId);
  if (!lc) return false;
  if (isStaff || lc.isPreview) return true;
  const { data: enr } = await admin
    .from("enrollments").select("id").eq("user_id", userId).eq("course_id", lc.courseId).maybeSingle();
  return !!enr;
}

/** Pose une question (ou répond si parentId). */
export async function askQuestion(lessonId: string, content: string, parentId?: string | null) {
  const c = await ctx();
  if (!c) return { ok: false, error: "Non authentifié." };
  const text = sanitizeText(content).slice(0, 1000);
  if (text.length < 2) return { ok: false, error: "Message trop court." };

  const admin = createAdminClient();
  if (!(await hasAccess(admin, c.user.id, c.isStaff, lessonId))) return { ok: false, error: "Accès refusé." };

  const { error } = await admin.from("lesson_questions").insert({
    lesson_id: lessonId, user_id: c.user.id, content: text, parent_id: parentId ?? null,
  });
  if (error) return { ok: false, error: error.message };

  // Une question posée par une ÉLÈVE notifie le formateur du cours (push).
  if (!c.isStaff) {
    const { data: me } = await admin.from("users").select("nom").eq("id", c.user.id).maybeSingle();
    await notifyFormateur(admin, lessonId, c.user.id,
      `❓ Question de ${me?.nom ?? "une élève"}`, text, `/dashboard/cours/${lessonId}`);
  }

  revalidatePath(`/dashboard/cours/${lessonId}`);
  return { ok: true };
}

/** Supprime une question/réponse (auteur ou staff). */
export async function deleteQuestion(id: string) {
  const c = await ctx();
  if (!c) return { ok: false, error: "Non authentifié." };
  const admin = createAdminClient();
  const { data: q } = await admin.from("lesson_questions").select("user_id, lesson_id").eq("id", id).maybeSingle();
  if (!q) return { ok: false, error: "Introuvable." };
  if (q.user_id !== c.user.id && !c.isStaff) return { ok: false, error: "Accès refusé." };
  await admin.from("lesson_questions").delete().eq("id", id);
  revalidatePath(`/dashboard/cours/${q.lesson_id}`);
  return { ok: true };
}

/**
 * Upload un fichier (photo ou vidéo) vers Bunny Storage "travaux-pratiques".
 * Appelé depuis le composant client via FormData pour garder la clé API côté serveur.
 */
export async function uploadPracticalToBunny(formData: FormData) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Non authentifié." };
  if (!isPracticalsConfigured()) return { ok: false as const, error: "Stockage Bunny non configuré." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false as const, error: "Fichier manquant." };

  const lessonId = (formData.get("lessonId") as string | null) ?? "";
  const type = (formData.get("type") as "photo" | "video") ?? "photo";

  const MAX = type === "photo" ? 8 * 1024 * 1024 : 100 * 1024 * 1024;
  if (file.size > MAX) return { ok: false as const, error: `Fichier trop volumineux (max ${type === "photo" ? "8 Mo" : "100 Mo"}).` };

  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();

  try {
    let buffer: ArrayBuffer | Uint8Array = await file.arrayBuffer();
    let outExt = ext;
    let contentType = file.type || "application/octet-stream";
    // Photo → compression WebP (poids & bande passante réduits, upload plus rapide).
    if (type === "photo") {
      const webp = await compressImageToWebp(buffer, 1600, 75);
      if (webp) { buffer = webp; outExt = "webp"; contentType = "image/webp"; }
    }
    const path = `${lessonId}/${c.user.id}/${type}-${crypto.randomUUID()}.${outExt}`;
    const url = await bunnyUpload(buffer, path, contentType);
    return { ok: true as const, url };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

/**
 * Enregistre un travail pratique (URLs déjà obtenues).
 * Filet de sécurité : toute exception inattendue ici ferait planter le rendu
 * (« An error occurred in the Server Components render » digest) au lieu de
 * remonter un message exploitable — donc TOUT est capturé et renvoyé proprement.
 */
export async function recordPractical(lessonId: string, photoUrl: string | null, videoUrl: string | null, note: string | null) {
  try {
    const c = await ctx();
    if (!c) return { ok: false, error: "Non authentifié." };
    if (!photoUrl && !videoUrl && !(note ?? "").trim()) return { ok: false, error: "Ajoutez une photo, une vidéo ou une note." };

    const admin = createAdminClient();
    if (!(await hasAccess(admin, c.user.id, c.isStaff, lessonId))) return { ok: false, error: "Accès refusé." };

    // Limite par leçon pour les élèves : 3 photos et 2 vidéos maximum (le staff n'est pas limité).
    if (!c.isStaff && (photoUrl || videoUrl)) {
      const { data: mine } = await admin
        .from("lesson_practicals")
        .select("photo_url, video_url")
        .eq("lesson_id", lessonId)
        .eq("user_id", c.user.id);
      const photos = (mine ?? []).filter((m: { photo_url: string | null }) => m.photo_url).length;
      const videos = (mine ?? []).filter((m: { video_url: string | null }) => m.video_url).length;
      if (photoUrl && photos >= MAX_PRACTICAL_PHOTOS) return { ok: false, error: `Limite atteinte : ${MAX_PRACTICAL_PHOTOS} photos maximum pour cette leçon.` };
      if (videoUrl && videos >= MAX_PRACTICAL_VIDEOS) return { ok: false, error: `Limite atteinte : ${MAX_PRACTICAL_VIDEOS} vidéos maximum pour cette leçon.` };
    }

    const { error } = await admin.from("lesson_practicals").insert({
      lesson_id: lessonId, user_id: c.user.id, photo_url: photoUrl, video_url: videoUrl, note: sanitizeText(note).slice(0, 1000) || null,
    });
    if (error) return { ok: false, error: error.message };

    // Un travail pratique déposé par une ÉLÈVE notifie le formateur (push) → à corriger.
    if (!c.isStaff) {
      const { data: me } = await admin.from("users").select("nom").eq("id", c.user.id).maybeSingle();
      await notifyFormateur(admin, lessonId, c.user.id,
        `🪡 Nouveau travail de ${me?.nom ?? "une élève"}`, "Un travail pratique attend votre correction.", `/formateur/pratiques`);
    }

    revalidatePath(`/dashboard/cours/${lessonId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Erreur inattendue : " + ((e as Error)?.message ?? "réessayez.") };
  }
}

/**
 * Supprime un travail pratique déjà déposé.
 * Autorisé à l'AUTEUR (l'élève, son propre travail) OU au STAFF (formateur/admin).
 * La ligne community_media liée est retirée automatiquement (FK ON DELETE CASCADE).
 */
export async function deletePractical(id: string) {
  const c = await ctx();
  if (!c) return { ok: false, error: "Non authentifié." };
  const admin = createAdminClient();
  const { data: row } = await admin.from("lesson_practicals").select("user_id, lesson_id").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "Introuvable." };
  if (row.user_id !== c.user.id && !c.isStaff) return { ok: false, error: "Accès refusé." };

  const { error } = await admin.from("lesson_practicals").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/cours/${row.lesson_id}`);
  revalidatePath("/dashboard/pratiques");
  revalidatePath("/formateur/pratiques");
  return { ok: true };
}

/**
 * Payer le MOIS SUIVANT en avance : prépare (ou réutilise) la commande d'échéance
 * pending, que l'élève règle ensuite dans /dashboard/commandes (facture + reçu).
 * À la validation admin, le palier suivant s'ouvre automatiquement.
 */
export async function payNextInstallment(courseId: string, targetMonth?: number) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Non authentifié." };
  if (!courseId) return { ok: false as const, error: "Formation inconnue." };
  const admin = createAdminClient();
  const target = Number.isFinite(Number(targetMonth)) && Number(targetMonth) > 0 ? Number(targetMonth) : undefined;
  const res = await ensureNextInstallmentOrder(admin, c.user.id, courseId, target);
  return res.ok ? { ok: true as const, orderId: res.orderId } : { ok: false as const, error: res.error, done: res.done };
}

/**
 * Suppression EN MASSE de travaux pratiques (sélection).
 * Chaque ligne n'est supprimée que si l'utilisateur en est l'AUTEUR ou est STAFF.
 */
export async function bulkDeletePracticals(ids: string[]) {
  const c = await ctx();
  if (!c) return { ok: false, error: "Non authentifié." };
  const list = [...new Set((ids ?? []).filter(Boolean))].slice(0, 200);
  if (list.length === 0) return { ok: false, error: "Aucune sélection." };

  const admin = createAdminClient();
  const { data: rows } = await admin.from("lesson_practicals").select("id, user_id, lesson_id").in("id", list);
  const allowed = (rows ?? []).filter((r: { user_id: string }) => c.isStaff || r.user_id === c.user.id);
  const allowedIds = allowed.map((r: { id: string }) => r.id);
  if (allowedIds.length === 0) return { ok: false, error: "Accès refusé." };

  const { error } = await admin.from("lesson_practicals").delete().in("id", allowedIds);
  if (error) return { ok: false, error: error.message };

  const lessonIds = [...new Set(allowed.map((r: { lesson_id: string }) => r.lesson_id))];
  for (const lid of lessonIds) revalidatePath(`/dashboard/cours/${lid}`);
  revalidatePath("/dashboard/pratiques");
  revalidatePath("/formateur/pratiques");
  return { ok: true, count: allowedIds.length };
}

/**
 * Enregistre l'IMAGE ANNOTÉE d'un travail pratique (staff) : la photo de l'élève
 * sur laquelle le formateur a dessiné ses remarques (façon Telegram).
 *
 * ⚠️ REMPLACE la photo d'origine EN PLACE dans Supabase Storage (bucket public
 * `practicals`, le même où l'élève dépose ses photos) → aucun doublon, pas de
 * saturation du stockage. Un paramètre `?v=` force l'affichage de la version à jour.
 */
export async function savePracticalAnnotation(id: string, dataUrl: string) {
  const c = await ctx();
  if (!c || !c.isStaff) return { ok: false as const, error: "Accès refusé." };
  const m = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl ?? "");
  if (!m) return { ok: false as const, error: "Image d'annotation invalide." };

  const original = Buffer.from(m[2], "base64");
  if (original.byteLength > 10 * 1024 * 1024) return { ok: false as const, error: "Annotation trop lourde (max 10 Mo)." };
  // Compression WebP → allège le bucket Supabase « practicals ».
  const webp = await compressImageToWebp(original, 1600, 78);
  const bytes = webp ?? original;
  const annotContentType = webp ? "image/webp" : "image/jpeg";

  const admin = createAdminClient();
  const { data: row } = await admin.from("lesson_practicals").select("lesson_id, photo_url").eq("id", id).maybeSingle();
  if (!row) return { ok: false as const, error: "Travail introuvable." };
  const photoUrl = (row.photo_url as string | null) ?? null;
  if (!photoUrl) return { ok: false as const, error: "Ce travail n'a pas de photo à annoter." };

  // Chemin du fichier dans le bucket Supabase `practicals`.
  const MARKER = "/storage/v1/object/public/practicals/";
  const clean = photoUrl.split("?")[0];
  const idx = clean.indexOf(MARKER);

  try {
    let baseUrl: string;
    if (idx >= 0) {
      // Écrase le fichier d'origine (upsert) → même URL, pas de doublon.
      const path = decodeURIComponent(clean.slice(idx + MARKER.length));
      const { error: upErr } = await admin.storage.from("practicals").upload(path, bytes, { upsert: true, contentType: annotContentType, cacheControl: "31536000" });
      if (upErr) return { ok: false as const, error: upErr.message };
      baseUrl = admin.storage.from("practicals").getPublicUrl(path).data.publicUrl;
    } else {
      // Repli (photo hébergée ailleurs) : un seul nouvel objet dans `practicals`.
      const path = `annotations/${id}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await admin.storage.from("practicals").upload(path, bytes, { upsert: false, contentType: annotContentType, cacheControl: "31536000" });
      if (upErr) return { ok: false as const, error: upErr.message };
      baseUrl = admin.storage.from("practicals").getPublicUrl(path).data.publicUrl;
    }
    // Cache-bust pour forcer l'affichage de la version annotée. `annotation_url`
    // sert de marqueur « corrigée » (même image que photo_url désormais).
    const busted = `${baseUrl}?v=${Date.now()}`;
    const { error } = await admin.from("lesson_practicals").update({ photo_url: busted, annotation_url: busted }).eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath(`/dashboard/cours/${row.lesson_id}`);
    revalidatePath("/formateur/pratiques");
    return { ok: true as const, url: busted };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

/** Retour de la formatrice sur un travail pratique (staff). */
export async function setPracticalFeedback(id: string, feedback: string, status: "reviewed" | "approved") {
  const c = await ctx();
  if (!c || !c.isStaff) return { ok: false, error: "Accès refusé." };
  const admin = createAdminClient();
  const { data: row } = await admin.from("lesson_practicals").select("lesson_id, user_id").eq("id", id).maybeSingle();
  const { error } = await admin
    .from("lesson_practicals")
    .update({ feedback: (feedback ?? "").trim() || null, status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Horodate la validation/correction (migration 076) → tri « À partager » par
  // validation récente. Résilient : ignore si la colonne n'existe pas encore.
  await admin.from("lesson_practicals").update({ reviewed_at: new Date().toISOString() }).eq("id", id).then(
    () => {}, () => {},
  );

  // Progression diplôme : à l'approbation, notifs d'encouragement + éligibilité (best-effort).
  if (status === "approved" && row?.user_id && row?.lesson_id) {
    try {
      const { handleApprovalProgress } = await import("@/lib/diplomas");
      await handleApprovalProgress(admin, row.user_id as string, row.lesson_id as string);
    } catch { /* ne bloque jamais l'approbation */ }
  }

  if (row) revalidatePath(`/dashboard/cours/${row.lesson_id}`);
  revalidatePath("/formateur/pratiques");
  return { ok: true };
}
