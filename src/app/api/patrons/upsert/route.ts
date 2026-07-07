import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inspectUploadBuffer, buildStoragePath } from "@/lib/security/fileValidation";
import { isPatronniste, isFormateur } from "@/lib/roles";

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
const DOC_MIMES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX = 52428800; // 50 Mo

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: prof } = await supabase.from("users").select("role, roles").eq("id", user.id).single();
  if (!isPatronniste(prof) && !isFormateur(prof)) {
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

  // Upload helper sécurisé : valide le contenu (magic bytes + anti-spoofing + inspection),
  // ignore le nom d'origine, et écrit dans userId/uuid.ext (pas de path traversal).
  async function upload(file: File, allowed: string[]): Promise<string> {
    const buf = new Uint8Array(await file.arrayBuffer());
    const check = inspectUploadBuffer(buf, allowed);
    if (!check.ok) throw new Error(check.error || "Fichier refusé.");
    const path = buildStoragePath(user!.id, "patron", `${randomUUID()}${check.ext}`);
    const { error } = await admin.storage.from("patrons").upload(path, buf, {
      contentType: check.mime,
      upsert: false,
    });
    if (error) throw new Error("Upload échoué : " + error.message);
    return admin.storage.from("patrons").getPublicUrl(path).data.publicUrl;
  }

  // fiche = fiche patronage composée → SEUL visuel produit (carte + page produit).
  // La photo réelle (`photo_reelle`) n'est PAS publiée seule : elle sert uniquement
  // à générer le dessin IA et est déjà intégrée dans la fiche → on l'ignore ici.
  const pdfFile = form.get("pdf") as File | null;
  const galleryFiles = (form.getAll("gallery") as File[]).filter((f) => f && f.size > 0);

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
    numero: str("numero"),
  };

  // Catégories (genre × type de vêtement) — validées contre la liste autorisée.
  const GENRE_OK = ["femme", "homme", "enfant", "mixte"];
  const TYPE_OK = ["robe", "jupe", "pantalon", "haut", "veste", "ensemble", "traditionnel", "accessoire"];
  const genre = str("genre");
  const typeVet = str("type_vetement");
  row.genre = genre && GENRE_OK.includes(genre) ? genre : null;
  row.type_vetement = typeVet && TYPE_OK.includes(typeVet) ? typeVet : null;

  // Dessin technique : URL IA déjà uploadée (champ caché). Un fichier `dessin`
  // téléversé manuellement (remplacement) écrase cette valeur plus bas.
  const dessinUrl = str("dessin_technique_url");
  if (dessinUrl && /^https?:\/\//.test(dessinUrl)) row.dessin_technique_url = dessinUrl;

  const dessinFile = form.get("dessin") as File | null;
  const ficheFile = form.get("fiche") as File | null;

  try {
    if (pdfFile && pdfFile.size > 0) row.fichier_url = await upload(pdfFile, DOC_MIMES);
    if (dessinFile && dessinFile.size > 0) row.dessin_technique_url = await upload(dessinFile, IMAGE_MIMES);

    // La fiche composée = SEUL visuel produit : preview_url (carte) + fiche_url.
    if (ficheFile && ficheFile.size > 0) {
      const ficheUrl = await upload(ficheFile, IMAGE_MIMES);
      row.fiche_url = ficheUrl;
      row.preview_url = ficheUrl;
    }

    // Photos supplémentaires (optionnelles, explicitement ajoutées par le patronniste).
    const imgs: string[] = [];
    for (const f of galleryFiles) {
      if (f.size > MAX) return NextResponse.json({ error: "Image de galerie trop volumineuse (max 50 Mo)" }, { status: 400 });
      imgs.push(await upload(f, IMAGE_MIMES));
    }
    if (imgs.length > 0) row.images = imgs;

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
