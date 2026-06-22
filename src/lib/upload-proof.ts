import { createClient } from "@/lib/supabase/client";
import { createProofUploadUrl, recordCCPProof } from "@/app/actions/payments";

const MAX = 10 * 1024 * 1024; // 10 Mo
const PROOFS_BUCKET = "proofs";

/**
 * Envoie une preuve de paiement en 3 temps :
 *  1) demande une URL signée au serveur (action légère, JSON) ;
 *  2) upload le fichier DIRECTEMENT vers Supabase (navigateur → Supabase),
 *     ce qui contourne la limite de 4,5 Mo des fonctions serverless Vercel ;
 *  3) enregistre la preuve côté serveur.
 */
export async function uploadPaymentProof(
  orderId: string,
  file: File,
  transactionId?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!file || file.size === 0) return { ok: false, error: "Fichier requis." };
  if (file.size > MAX) return { ok: false, error: "Fichier trop lourd (max 10 Mo)." };

  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const fileType =
    file.type === "image/png" || ext === "png" ? "png"
    : file.type === "application/pdf" || ext === "pdf" ? "pdf"
    : file.type === "image/jpeg" || ext === "jpg" || ext === "jpeg" ? "jpg"
    : null;
  if (!fileType) return { ok: false, error: "Format non supporté (JPG, PNG ou PDF uniquement)." };

  // 1) URL signée
  const urlRes = await createProofUploadUrl(orderId, ext || fileType);
  if (!urlRes.ok) return { ok: false, error: urlRes.error };

  // 2) Upload direct vers Supabase Storage
  const supabase = createClient();
  const { error: upErr } = await supabase.storage
    .from(PROOFS_BUCKET)
    .uploadToSignedUrl(urlRes.path, urlRes.token, file, { contentType: file.type || undefined });
  if (upErr) return { ok: false, error: "Envoi du fichier échoué : " + upErr.message };

  // 3) Enregistrement
  return await recordCCPProof(orderId, urlRes.path, fileType, file.size, transactionId);
}
