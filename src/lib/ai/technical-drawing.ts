import "server-only";

/**
 * Génération du dessin technique (croquis de mode à plat) à partir d'une photo
 * réelle, via Google Gemini (modèle image « Nano Banana »).
 *
 * Flux : on envoie la photo + un prompt strict → Gemini renvoie une image
 * (base64) d'un dessin technique noir & blanc à plat. Le buffer est ensuite
 * uploadé vers Supabase Storage par l'appelant (route API).
 */

const API_KEY = process.env.GEMINI_API_KEY ?? "";
// Modèle image de Gemini (configurable via GEMINI_IMAGE_MODEL si Google renomme).
// `gemini-3.1-flash-image` = modèle image « flash » actuel (le moins cher).
// ⚠️ La génération d'image Gemini n'a PAS de quota gratuit → facturation requise
// (sinon 429). Modèles image disponibles (juin 2026) : gemini-3.1-flash-image,
// gemini-3-pro-image, gemini-2.5-flash-image.
const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export function isGeminiConfigured(): boolean {
  return Boolean(API_KEY);
}

const PROMPT = [
  "Transform this clothing photo into a clean TECHNICAL FASHION FLAT SKETCH",
  "(croquis technique de mode à plat), exactly like a sewing-pattern technical drawing.",
  "Strict requirements:",
  "- Black line art on a PURE WHITE background, no color, no shading, no gradients.",
  "- Front view, garment shown FLAT, with NO body, NO model, NO mannequin.",
  "- Keep the exact same garment: same silhouette, same seams, darts, pleats,",
  "  buttons, pockets, hems, wrap/asymmetric details and proportions as the photo.",
  "- Clean, even, vector-style outlines (technical illustration look).",
  "- Centered, with a small margin, nothing else in the image.",
].join(" ");

type Result =
  | { ok: true; buffer: Buffer; mime: string }
  | { ok: false; error: string };

/**
 * Génère le dessin technique. `imageBase64` = photo source (sans préfixe data:),
 * `imageMime` = son type MIME.
 */
export async function generateTechnicalDrawing(imageBase64: string, imageMime: string): Promise<Result> {
  if (!isGeminiConfigured()) return { ok: false, error: "Génération IA non configurée (clé Gemini manquante)." };

  try {
    const res = await fetch(`${ENDPOINT}/${MODEL}:generateContent?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: imageMime, data: imageBase64 } },
            ],
          },
        ],
        // Ce modèle EXIGE les deux modalités (IMAGE seul → erreur). On ignore la
        // partie texte côté parsing et on ne garde que l'image.
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, error: `Gemini ${res.status}${detail ? " — " + detail.slice(0, 300) : ""}` };
    }

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { inline_data?: { data?: string; mime_type?: string }; inlineData?: { data?: string; mimeType?: string } }[] } }[];
    };

    // Le SDK REST renvoie soit inline_data (snake) soit inlineData (camel) selon la version.
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      const data = p.inline_data?.data ?? p.inlineData?.data;
      const mime = p.inline_data?.mime_type ?? p.inlineData?.mimeType ?? "image/png";
      if (data) return { ok: true, buffer: Buffer.from(data, "base64"), mime };
    }
    return { ok: false, error: "Gemini n'a pas renvoyé d'image. Réessayez." };
  } catch (e) {
    return { ok: false, error: "Service IA indisponible : " + (e as Error).message };
  }
}
