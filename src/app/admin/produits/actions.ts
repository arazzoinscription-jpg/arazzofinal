"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, admin: null };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (prof?.role !== "admin") return { ok: false as const, admin: null };
  return { ok: true as const, admin: createAdminClient() };
}

function slugify(str: string) {
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const ProductSchema = z.object({
  title: z.string().min(2, "Titre requis."),
  description: z.string().optional().nullable(),
  type: z.enum(["course", "digital_file", "patron_pdf", "bundle"]),
  price: z.number().min(0),
  compare_price: z.number().min(0).optional().nullable(),
  image: z.string().url().optional().or(z.literal("")).nullable(),
  stock: z.number().int().min(0).optional().nullable(),
  course_id: z.string().uuid().optional().nullable(),
});

/** Crée un produit (admin). */
export async function createProduct(input: z.infer<typeof ProductSchema>) {
  const parsed = ProductSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const d = parsed.data;
  const slug = slugify(d.title) + "-" + Date.now().toString(36);

  const { error } = await admin.from("products").insert({
    title: d.title,
    description: d.description || null,
    type: d.type,
    price: d.price,
    compare_price: d.compare_price ?? null,
    images: d.image ? [d.image] : [],
    stock: d.stock ?? null,
    course_id: d.course_id ?? null,
    slug,
    is_active: true,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/produits");
  revalidatePath("/boutique");
  return { ok: true };
}

/** Active / désactive un produit. */
export async function toggleProductActive(id: string, isActive: boolean) {
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };
  const { error } = await admin.from("products").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/produits");
  revalidatePath("/boutique");
  return { ok: true };
}

/** Supprime un produit. */
export async function deleteProduct(id: string) {
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };
  const { error } = await admin.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/produits");
  revalidatePath("/boutique");
  return { ok: true };
}
