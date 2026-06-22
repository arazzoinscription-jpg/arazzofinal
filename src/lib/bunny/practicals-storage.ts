import "server-only";

const ZONE = process.env.BUNNY_PRACTICALS_ZONE ?? "";
const KEY = process.env.BUNNY_PRACTICALS_KEY ?? "";
const CDN = (process.env.NEXT_PUBLIC_BUNNY_PRACTICALS_CDN ?? "").replace(/\/$/, "");
const API = "https://storage.bunnycdn.com";

export function isPracticalsConfigured(): boolean {
  return Boolean(ZONE && KEY && CDN);
}

/**
 * Upload un fichier vers la zone Bunny Storage "travaux-pratiques".
 * Renvoie l'URL CDN publique du fichier.
 */
export async function uploadPracticalFile(
  buffer: ArrayBuffer,
  path: string,
  contentType: string
): Promise<string> {
  if (!isPracticalsConfigured()) throw new Error("Bunny Storage travaux-pratiques non configuré.");
  const res = await fetch(`${API}/${ZONE}/${path}`, {
    method: "PUT",
    headers: { AccessKey: KEY, "Content-Type": contentType },
    body: new Uint8Array(buffer),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Bunny Storage: ${res.status}${detail ? ` — ${detail}` : ""}`);
  }
  return `${CDN}/${path}`;
}

/** Supprime un fichier de la zone (ex : si on remplace un travail). */
export async function deletePracticalFile(path: string): Promise<void> {
  if (!isPracticalsConfigured()) return;
  await fetch(`${API}/${ZONE}/${path}`, {
    method: "DELETE",
    headers: { AccessKey: KEY },
  });
}
