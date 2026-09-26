import { createClient } from "@/lib/supabase/client";
import { createOnlineProofUploadUrl } from "@/app/actions/online-enrollment";

const MAX = 10 * 1024 * 1024; // 10 Mo
const PROOFS_BUCKET = "online-proofs";

/**
 * Envoie le reçu d'une inscription EN LIGNE en 2 temps (sans compte requis) :
 *  1) demande une URL d'upload signée au serveur ;
 *  2) upload le fichier DIRECTEMENT navigateur → Supabase (contourne la limite
 *     de 4,5 Mo des fonctions serverless Vercel).
 * Retourne le CHEMIN déposé, que `submitOnlineEnrollment` transforme en URL
 * publique et attache à la demande.
 */
export async function uploadOnlineProof(
  file: File,
): Promise<{ ok: boolean; path?: string; error?: string }> {
  if (!file || file.size === 0) return { ok: false, error: "Fichier requis." };
  if (file.size > MAX) return { ok: false, error: "Fichier trop lourd (max 10 Mo)." };

  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const ok = ["jpg", "jpeg", "png", "pdf"].includes(ext)
    || ["image/jpeg", "image/png", "application/pdf"].includes(file.type);
  if (!ok) return { ok: false, error: "Format non supporté (JPG, PNG ou PDF uniquement)." };

  const urlRes = await createOnlineProofUploadUrl(ext || file.type);
  if (!urlRes.ok) return { ok: false, error: urlRes.error };

  const supabase = createClient();
  const { error: upErr } = await supabase.storage
    .from(PROOFS_BUCKET)
    .uploadToSignedUrl(urlRes.path, urlRes.token, file, { contentType: file.type || undefined });
  if (upErr) return { ok: false, error: "Envoi du fichier échoué : " + upErr.message };

  return { ok: true, path: urlRes.path };
}
