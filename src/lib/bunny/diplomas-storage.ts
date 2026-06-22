import "server-only";

const ZONE = process.env.BUNNY_DIPLOMAS_ZONE ?? "";
const KEY = process.env.BUNNY_DIPLOMAS_KEY ?? "";
const CDN = (process.env.NEXT_PUBLIC_BUNNY_DIPLOMAS_CDN ?? "").replace(/\/$/, "");
const API = "https://storage.bunnycdn.com";

export function isDiplomasConfigured(): boolean {
  return Boolean(ZONE && KEY && CDN);
}

/** Upload un PDF de diplôme vers la zone Bunny Storage « diplômes ». Renvoie l'URL CDN. */
export async function uploadDiploma(buffer: ArrayBuffer, path: string): Promise<string> {
  if (!isDiplomasConfigured()) throw new Error("Bunny Storage diplômes non configuré.");
  const res = await fetch(`${API}/${ZONE}/${path}`, {
    method: "PUT",
    headers: { AccessKey: KEY, "Content-Type": "application/pdf" },
    body: new Uint8Array(buffer),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Bunny Storage: ${res.status}${detail ? ` — ${detail}` : ""}`);
  }
  return `${CDN}/${path}`;
}
