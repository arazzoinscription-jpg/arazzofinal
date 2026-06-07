import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MANAGE_ROLES = ["patronniste", "formateur", "admin"];
const MAX = 52428800; // 50 Mo

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!prof || !MANAGE_ROLES.includes(prof.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const form = await req.formData();
  const id = (form.get("id") as string) || null;
  const titre = String(form.get("titre") || "").trim();
  if (!titre) return NextResponse.json({ error: "Le titre est requis" }, { status: 400 });

  const num = (k: string) => {
    const v = form.get(k);
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const str = (k: string) => {
    const v = String(form.get(k) || "").trim();
    return v === "" ? null : v;
  };

  const admin = createAdminClient();

  // Upload helper
  async function upload(file: File): Promise<string> {
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${randomUUID()}-${safe}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await admin.storage.from("patrons").upload(path, buf, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (error) throw new Error("Upload échoué : " + error.message);
    return admin.storage.from("patrons").getPublicUrl(path).data.publicUrl;
  }

  const previewFile = form.get("preview") as File | null;
  const pdfFile = form.get("pdf") as File | null;
  const galleryFiles = (form.getAll("gallery") as File[]).filter((f) => f && f.size > 0);

  if (previewFile && previewFile.size > MAX) return NextResponse.json({ error: "Visuel trop volumineux (max 50 Mo)" }, { status: 400 });
  if (pdfFile && pdfFile.size > MAX) return NextResponse.json({ error: "PDF trop volumineux (max 50 Mo)" }, { status: 400 });

  const courseId = str("course_id");
  const row: Record<string, unknown> = {
    titre,
    description: str("description"),
    prix_dzd: num("prix_dzd") ?? 0,
    prix_eur: num("prix_eur") ?? 0,
    tailles: str("tailles"),
    tissu: str("tissu"),
    taille_table: str("taille_table"),
    nb_pages: num("nb_pages"),
    format: str("format"),
    video_url: str("video_url"),
    conseils: str("conseils"),
    course_id: courseId,
  };

  try {
    if (previewFile && previewFile.size > 0) row.preview_url = await upload(previewFile);
    if (pdfFile && pdfFile.size > 0) row.fichier_url = await upload(pdfFile);
    if (galleryFiles.length > 0) {
      const urls: string[] = [];
      for (const f of galleryFiles) {
        if (f.size > MAX) return NextResponse.json({ error: "Image de galerie trop volumineuse (max 50 Mo)" }, { status: 400 });
        urls.push(await upload(f));
      }
      row.images = urls;
    }

    if (id) {
      const { error } = await admin.from("patrons").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, id });
    } else {
      // Création : fichier_url est NOT NULL → fallback sur le visuel si aucun PDF fourni
      if (!row.fichier_url) row.fichier_url = row.preview_url ?? "/images/patrons/1.png";
      if (!row.preview_url) row.preview_url = row.fichier_url;
      row.formateur_id = user.id;
      const { data, error } = await admin.from("patrons").insert(row).select("id").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, id: data.id });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
