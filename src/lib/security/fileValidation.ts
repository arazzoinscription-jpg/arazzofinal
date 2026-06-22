import { randomUUID, createHash } from "crypto";

/**
 * Validation de fichiers côté SERVEUR (la vraie défense — jamais se fier au client).
 * Vérifie : taille, extension, type déclaré, MAGIC BYTES (anti-spoofing MIME),
 * inspection de contenu (PDF actif, polyglotte ZIP, dimensions d'image),
 * et renvoie un nom de fichier sûr (UUID, jamais le nom original).
 */

export type UploadContext = "PAYMENT_PROOF" | "PATRON_PHOTO" | "PROFILE_AVATAR" | "RESOURCE";

interface ContextRule {
  mimeTypes: string[];
  extensions: string[];
  maxSizeMB: number;
}

export const ALLOWED_TYPES: Record<UploadContext, ContextRule> = {
  PAYMENT_PROOF: { mimeTypes: ["image/jpeg", "image/png", "application/pdf"], extensions: [".jpg", ".jpeg", ".png", ".pdf"], maxSizeMB: 5 },
  PATRON_PHOTO: { mimeTypes: ["image/jpeg", "image/png", "image/webp"], extensions: [".jpg", ".jpeg", ".png", ".webp"], maxSizeMB: 10 },
  PROFILE_AVATAR: { mimeTypes: ["image/jpeg", "image/png", "image/webp"], extensions: [".jpg", ".jpeg", ".png", ".webp"], maxSizeMB: 2 },
  RESOURCE: { mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"], extensions: [".jpg", ".jpeg", ".png", ".webp", ".pdf"], maxSizeMB: 25 },
};

const EXT_FOR_MIME: Record<string, string> = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf",
};

/** Détecte le vrai type via les premiers octets (magic bytes). */
function detectMime(b: Uint8Array): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf"; // %PDF
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp"; // RIFF....WEBP
  return null;
}

/** Nettoie un nom de fichier : retire séparateurs de chemin et caractères spéciaux. */
export function sanitizeFilename(name: string): string {
  const base = (name || "file").split(/[\\/]/).pop() || "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.{2,}/g, ".").replace(/^[._-]+/, "").slice(0, 100);
  return cleaned || "file";
}

function extFromName(name: string): string {
  const m = (name || "").toLowerCase().match(/\.[a-z0-9]+$/);
  return m ? m[0] : "";
}

/** Dimensions PNG/JPEG (pour détecter les pièges 1x1). null si inconnu. */
function imageDimensions(b: Uint8Array, mime: string): { w: number; h: number } | null {
  if (mime === "image/png" && b.length >= 24) {
    const w = (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19];
    const h = (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23];
    return { w, h };
  }
  if (mime === "image/jpeg") {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      // SOF0..SOF15 sauf DHT(C4)/JPG(C8)/DAC(CC)
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const h = (b[i + 5] << 8) | b[i + 6];
        const w = (b[i + 7] << 8) | b[i + 8];
        return { w, h };
      }
      const len = (b[i + 2] << 8) | b[i + 3];
      if (len <= 0) break;
      i += 2 + len;
    }
  }
  return null;
}

/** Inspection de contenu : code actif PDF, polyglotte ZIP, dimensions aberrantes. */
function inspectContent(b: Uint8Array, mime: string): string | null {
  // Polyglotte : archive ZIP embarquée (PK\x03\x04) dans les 4 premiers Ko
  const scanLen = Math.min(b.length - 4, 4096);
  for (let i = 1; i < scanLen; i++) {
    if (b[i] === 0x50 && b[i + 1] === 0x4b && b[i + 2] === 0x03 && b[i + 3] === 0x04) {
      return "Fichier suspect (archive intégrée détectée).";
    }
  }
  if (mime === "application/pdf") {
    const txt = Buffer.from(b).toString("latin1");
    if (/\/JavaScript\b|\/JS\b|\/Launch\b|\/EmbeddedFile\b|\/OpenAction\b/i.test(txt)) {
      return "PDF contenant du code actif (JavaScript/Launch) refusé.";
    }
  }
  if (mime.startsWith("image/")) {
    const dim = imageDimensions(b, mime);
    if (dim && (dim.w <= 1 || dim.h <= 1)) return "Image invalide (dimensions suspectes).";
  }
  return null;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
  mime?: string;
  buffer?: Uint8Array;
  sha256?: string;
}

/** Validation complète d'un fichier pour un contexte donné. */
export async function validateFile(file: File, context: UploadContext): Promise<ValidationResult> {
  const rule = ALLOWED_TYPES[context];

  if (!file || file.size === 0) return { valid: false, error: "Fichier vide ou manquant." };
  if (file.size > rule.maxSizeMB * 1024 * 1024) return { valid: false, error: `Fichier trop volumineux (max ${rule.maxSizeMB} Mo).` };

  const ext = extFromName(file.name);
  if (!rule.extensions.includes(ext)) return { valid: false, error: "Extension de fichier non autorisée." };
  if (file.type && !rule.mimeTypes.includes(file.type)) return { valid: false, error: "Type de fichier non autorisé." };

  const buffer = new Uint8Array(await file.arrayBuffer());
  if (buffer.length === 0) return { valid: false, error: "Fichier vide (0 octet)." };

  // Magic bytes : le VRAI type
  const realMime = detectMime(buffer);
  if (!realMime || !rule.mimeTypes.includes(realMime)) {
    return { valid: false, error: "Contenu du fichier non reconnu ou non autorisé." };
  }
  // Anti-spoofing : type déclaré ≠ contenu réel
  if (file.type && file.type !== realMime) {
    return { valid: false, error: "Type déclaré incohérent avec le contenu du fichier (MIME spoofing)." };
  }

  const inspect = inspectContent(buffer, realMime);
  if (inspect) return { valid: false, error: inspect };

  const sanitizedName = `${randomUUID()}${EXT_FOR_MIME[realMime] ?? ext}`;
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  return { valid: true, sanitizedName, mime: realMime, buffer, sha256 };
}

/**
 * Inspection bas-niveau d'un buffer déjà lu : magic bytes + contenu (sans contrainte
 * de taille stricte). Utile quand la route gère sa propre limite de taille.
 */
export function inspectUploadBuffer(buffer: Uint8Array, allowedMimes: string[]): { ok: boolean; mime?: string; ext?: string; error?: string } {
  if (!buffer || buffer.length === 0) return { ok: false, error: "Fichier vide." };
  const mime = detectMime(buffer);
  if (!mime || !allowedMimes.includes(mime)) return { ok: false, error: "Contenu du fichier non reconnu ou non autorisé." };
  const bad = inspectContent(buffer, mime);
  if (bad) return { ok: false, error: bad };
  return { ok: true, mime, ext: EXT_FOR_MIME[mime] ?? "" };
}

/**
 * Construit un chemin de stockage sûr : userId/context/uuid.ext.
 * userId DOIT venir de la session, jamais de la requête. Bloque tout path traversal.
 */
export function buildStoragePath(userId: string, context: string, sanitizedName: string): string {
  const safeUser = sanitizeFilename(userId);
  const safeCtx = sanitizeFilename(context);
  const name = sanitizeFilename(sanitizedName);
  const path = `${safeUser}/${safeCtx}/${name}`;
  if (/(\.\.|%2e|%2f|%5c|[\\])/i.test(path)) throw new Error("Chemin de fichier invalide.");
  return path;
}

/**
 * Analyse VirusTotal optionnelle (par hash, gratuit, sans upload).
 * Activée seulement si VIRUSTOTAL_API_KEY est défini. Rejette si positives > 2.
 * Fail-open : en cas d'erreur réseau, ne bloque pas.
 */
export async function scanHashVirusTotal(sha256: string): Promise<{ ok: boolean; reason?: string }> {
  const key = process.env.VIRUSTOTAL_API_KEY;
  if (!key) return { ok: true };
  try {
    const res = await fetch(`https://www.virustotal.com/api/v3/files/${sha256}`, { headers: { "x-apikey": key } });
    if (res.status === 404) return { ok: true }; // inconnu de VT → on laisse passer
    if (!res.ok) return { ok: true };
    const data = (await res.json()) as any;
    const malicious = data?.data?.attributes?.last_analysis_stats?.malicious ?? 0;
    if (malicious > 2) return { ok: false, reason: "Fichier signalé comme malveillant." };
    return { ok: true };
  } catch {
    return { ok: true };
  }
}
