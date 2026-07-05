"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaff, isAdmin } from "@/lib/roles";

async function guard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: prof } = await supabase.from("users").select("role, roles").eq("id", user.id).single();
  if (!isStaff(prof)) return null;
  return { user, role: isAdmin(prof) ? "admin" : (prof?.role ?? "eleve") };
}

function slugify(s: string): string {
  const base = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
  return `${base || "produit"}-${randomUUID().slice(0, 6)}`;
}

/** Met une formation en vente (crée/réactive le produit boutique lié). RÉSERVÉ À L'ADMIN. */
export async function publishCourse(courseId: string, price: number) {
  const g = await guard();
  if (!g) return { ok: false, error: "Accès refusé" };
  if (g.role !== "admin") return { ok: false, error: "La mise en vente des formations est gérée par l'administration." };
  const admin = createAdminClient();

  const { data: course } = await admin
    .from("courses").select("id, titre_fr, description_fr, prix_dzd, thumbnail, formateur_id")
    .eq("id", courseId).single();
  if (!course) return { ok: false, error: "Formation introuvable" };
  if (g.role === "formateur" && course.formateur_id && course.formateur_id !== g.user.id) {
    return { ok: false, error: "Cette formation ne vous appartient pas." };
  }

  const row = {
    title: course.titre_fr ?? "Formation",
    description: course.description_fr ?? null,
    type: "course",
    price: Number.isFinite(price) ? price : (course.prix_dzd ?? 0),
    images: course.thumbnail ? [course.thumbnail] : [],
    course_id: course.id,
    is_active: true,
  };

  const { data: existing } = await admin.from("products").select("id").eq("course_id", course.id).maybeSingle();
  if (existing) {
    const { error } = await admin.from("products").update(row).eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await admin.from("products").insert({ ...row, slug: slugify(row.title) });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/formateur/boutique");
  revalidatePath("/boutique");
  return { ok: true };
}

/** Met un patron en vente (crée/réactive le produit boutique lié). RÉSERVÉ À L'ADMIN. */
export async function publishPatron(patronId: string, price: number) {
  const g = await guard();
  if (!g) return { ok: false, error: "Accès refusé" };
  if (g.role !== "admin") return { ok: false, error: "La mise en vente des patrons est gérée par l'administration." };
  const admin = createAdminClient();

  const { data: patron } = await admin
    .from("patrons").select("id, titre, description, prix_dzd, preview_url, fichier_url")
    .eq("id", patronId).single();
  if (!patron) return { ok: false, error: "Patron introuvable" };

  const row = {
    title: patron.titre ?? "Patron",
    description: patron.description ?? null,
    type: "patron_pdf",
    price: Number.isFinite(price) ? price : (patron.prix_dzd ?? 0),
    images: patron.preview_url ? [patron.preview_url] : [],
    files: patron.fichier_url ? [patron.fichier_url] : [],
    patron_id: patron.id,
    is_active: true,
  };

  const { data: existing } = await admin.from("products").select("id").eq("patron_id", patron.id).maybeSingle();
  if (existing) {
    const { error } = await admin.from("products").update(row).eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await admin.from("products").insert({ ...row, slug: slugify(row.title) });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/formateur/boutique");
  revalidatePath("/boutique");
  return { ok: true };
}

/** Préfixe stockant la référence du pack dans products.files (lien sans colonne dédiée). */
const PACK_REF = "pack:";

/** Met un PACK en vente : crée/réactive un produit boutique de type 'bundle' lié au pack. */
export async function publishPack(packId: string, price: number) {
  const g = await guard();
  if (!g) return { ok: false, error: "Accès refusé" };
  const admin = createAdminClient();

  const { data: pack } = await admin
    .from("course_packs")
    .select("id, titre_fr, description_fr, prix_dzd, formateur_id, items:course_pack_items(course:courses(thumbnail))")
    .eq("id", packId).single();
  if (!pack) return { ok: false, error: "Pack introuvable" };
  if (g.role === "formateur" && pack.formateur_id && pack.formateur_id !== g.user.id) {
    return { ok: false, error: "Ce pack ne vous appartient pas." };
  }

  const firstThumb = ((pack.items as any[]) ?? []).map((it) => it.course?.thumbnail).find(Boolean) ?? null;
  const row = {
    title: pack.titre_fr ?? "Pack",
    description: pack.description_fr ?? null,
    type: "bundle" as const,
    price: Number.isFinite(price) ? price : (pack.prix_dzd ?? 0),
    images: firstThumb ? [firstThumb] : [],
    files: [PACK_REF + pack.id],
    is_active: true,
  };

  // Produit bundle déjà existant pour ce pack ?
  const { data: bundles } = await admin.from("products").select("id, files").eq("type", "bundle");
  const existing = (bundles ?? []).find((p) => ((p.files as string[]) ?? []).includes(PACK_REF + pack.id));
  if (existing) {
    const { error } = await admin.from("products").update(row).eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await admin.from("products").insert({ ...row, slug: slugify(row.title) });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/formateur/boutique");
  revalidatePath("/boutique");
  return { ok: true };
}

/** Retire un produit de la vente (désactive). Le retrait d'une formation est réservé à l'admin. */
export async function unpublishProduct(productId: string) {
  const g = await guard();
  if (!g) return { ok: false, error: "Accès refusé" };
  const admin = createAdminClient();
  const { data: prod } = await admin.from("products").select("type").eq("id", productId).single();
  if (prod?.type === "course" && g.role !== "admin") {
    return { ok: false, error: "La mise en vente des formations est gérée par l'administration." };
  }
  if (prod?.type === "patron_pdf" && g.role !== "admin") {
    return { ok: false, error: "La mise en vente des patrons est gérée par l'administration." };
  }
  const { error } = await admin.from("products").update({ is_active: false }).eq("id", productId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/formateur/boutique");
  revalidatePath("/boutique");
  return { ok: true };
}
