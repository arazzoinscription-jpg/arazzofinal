import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFormateur } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TYPES = ["pdf", "patron", "zip", "video", "autre"];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: prof } = await supabase.from("users").select("role, roles").eq("id", user.id).single();
  if (!isFormateur(prof)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const titre = String(form.get("titre") || "").trim();
  const type = String(form.get("type") || "pdf");
  const courseId = (form.get("course_id") as string) || null;
  const chapterId = (form.get("chapter_id") as string) || null;

  if (!file || !titre) return NextResponse.json({ error: "Fichier et titre requis" }, { status: 400 });
  if (file.size > 52428800) return NextResponse.json({ error: "Fichier trop volumineux (max 50 Mo)" }, { status: 400 });
  if (!TYPES.includes(type)) return NextResponse.json({ error: "Type invalide" }, { status: 400 });

  const admin = createAdminClient();
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${courseId || "general"}/${randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await admin.storage.from("resources").upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: "Upload échoué : " + upErr.message }, { status: 500 });

  const { error: insErr } = await admin.from("resources").insert({
    course_id: courseId,
    chapter_id: chapterId,
    formateur_id: user.id,
    titre,
    type,
    file_path: path,
    taille_ko: Math.round(file.size / 1024),
  });
  if (insErr) {
    await admin.storage.from("resources").remove([path]); // rollback
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
