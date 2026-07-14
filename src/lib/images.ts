import "server-only";
import sharp from "sharp";

/**
 * Compresse et redimensionne une image en WebP côté serveur (économie de
 * stockage ET de bande passante Supabase — jusqu'à 5–10× plus léger).
 * Retourne le WebP, ou `null` si l'entrée n'est pas une image exploitable
 * (l'appelant garde alors le fichier d'origine).
 */
export async function compressImageToWebp(
  input: ArrayBuffer | Buffer | Uint8Array,
  maxSize = 1280,
  quality = 72,
): Promise<Buffer | null> {
  try {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(input as ArrayBuffer);
    return await sharp(buf)
      .rotate()                                   // respecte l'orientation EXIF (photos de téléphone)
      .resize(maxSize, maxSize, { fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
  } catch {
    return null;
  }
}
