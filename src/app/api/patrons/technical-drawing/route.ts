import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inspectUploadBuffer, buildStoragePath } from "@/lib/security/fileValidation";
import { generateTechnicalDrawing, isGeminiConfigured } from "@/lib/ai/technical-drawing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MANAGE_ROLES = ["patronniste", "formateur", "admin"];
const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
const MAX = 15 * 1024 * 1024; // 15 Mo (photo source)

/**
 * Génère un dessin technique à partir d'une photo (FormData `photo`) via Gemini,
 * l'upload dans le bucket `patrons` et renvoie son URL publique.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!prof || !MANAGE_ROLES.includes(prof.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json({ error: "Génération IA non configurée (clé Gemini manquante)." }, { status: 503 });
  }

  const form = await req.formData();
  const photo = form.get("photo") as File | null;
  if (!photo || photo.size === 0) return NextResponse.json({ error: "Photo manquante." }, { status: 400 });
  if (photo.size > MAX) return NextResponse.json({ error: "Photo trop volumineuse (max 15 Mo)." }, { status: 400 });

  // Valide le contenu réel de la photo source (magic bytes).
  const srcBuf = new Uint8Array(await photo.arrayBuffer());
  const check = inspectUploadBuffer(srcBuf, IMAGE_MIMES);
  if (!check.ok) return NextResponse.json({ error: check.error || "Photo invalide." }, { status: 400 });

  // Génère le dessin technique via Gemini.
  const base64 = Buffer.from(srcBuf).toString("base64");
  const gen = await generateTechnicalDrawing(base64, check.mime!);
  if (!gen.ok) return NextResponse.json({ error: gen.error }, { status: 502 });

  // Upload du résultat dans Supabase Storage.
  const admin = createAdminClient();
  const ext = gen.mime.includes("jpeg") ? ".jpg" : gen.mime.includes("webp") ? ".webp" : ".png";
  const path = buildStoragePath(user.id, "patron-dessin", `${randomUUID()}${ext}`);
  const { error } = await admin.storage.from("patrons").upload(path, gen.buffer, {
    contentType: gen.mime,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: "Upload échoué : " + error.message }, { status: 500 });

  const url = admin.storage.from("patrons").getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ ok: true, url });
}
