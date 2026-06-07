"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const COOKIE = "cart";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

// ── Types ────────────────────────────────────────────────────────────────
export interface CartLine {
  productId: string;
  quantity: number;
}
export interface CartLineDetailed extends CartLine {
  title: string;
  price: number;
  image: string | null;
  type: string;
  slug: string;
  stock: number | null;
  lineTotal: number;
}
export interface CartView {
  items: CartLineDetailed[];
  subtotal: number;
  count: number;
}

// ── Schémas ──────────────────────────────────────────────────────────────
const ProductIdSchema = z.string().uuid();
const QtySchema = z.number().int().min(1).max(99);

// ── Cookie (invité) ──────────────────────────────────────────────────────
async function readCookieCart(): Promise<CartLine[]> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((l) => typeof l?.productId === "string" && typeof l?.quantity === "number")
      .map((l) => ({ productId: l.productId, quantity: Math.max(1, Math.min(99, l.quantity)) }));
  } catch {
    return [];
  }
}

async function writeCookieCart(lines: CartLine[]): Promise<void> {
  (await cookies()).set(COOKIE, JSON.stringify(lines), {
    httpOnly: true, sameSite: "lax", maxAge: COOKIE_MAX_AGE, path: "/",
  });
}

// ── Lecture enrichie (prix revalidés depuis la DB) ───────────────────────
/** Renvoie le panier détaillé avec les prix ACTUELS de la base. */
export async function getCart(): Promise<CartView> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Lignes brutes (DB si connecté, sinon cookie)
  let lines: CartLine[];
  if (user) {
    const { data } = await supabase
      .from("cart_items").select("product_id, quantity").eq("user_id", user.id);
    lines = (data ?? []).map((r) => ({ productId: r.product_id, quantity: r.quantity }));
  } else {
    lines = await readCookieCart();
  }
  if (lines.length === 0) return { items: [], subtotal: 0, count: 0 };

  // Détails produits (prix serveur, produits actifs uniquement)
  const ids = lines.map((l) => l.productId);
  const { data: products } = await supabase
    .from("products")
    .select("id, title, price, images, type, slug, stock, is_active")
    .in("id", ids);

  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const items: CartLineDetailed[] = [];
  for (const l of lines) {
    const p = byId.get(l.productId);
    if (!p || !p.is_active) continue; // produit retiré/inactif → ignoré
    const qty = p.stock != null ? Math.min(l.quantity, Math.max(0, p.stock)) : l.quantity;
    if (qty <= 0) continue;
    items.push({
      productId: p.id,
      quantity: qty,
      title: p.title,
      price: Number(p.price),
      image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
      type: p.type,
      slug: p.slug,
      stock: p.stock,
      lineTotal: Number(p.price) * qty,
    });
  }

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  return { items, subtotal, count };
}

/** Nombre total d'articles dans le panier (pour le badge du menu). */
export async function getCartCount(): Promise<number> {
  const { count } = await getCart();
  return count;
}

// ── Mutations ────────────────────────────────────────────────────────────
/** Ajoute un produit au panier (cumule la quantité s'il y est déjà). */
export async function addToCart(productId: string, quantity = 1) {
  const pid = ProductIdSchema.safeParse(productId);
  const qty = QtySchema.safeParse(quantity);
  if (!pid.success || !qty.success) return { ok: false, error: "Données invalides." };

  const supabase = await createClient();

  // Le produit doit exister et être actif
  const { data: product } = await supabase
    .from("products").select("id, stock, is_active").eq("id", pid.data).maybeSingle();
  if (!product || !product.is_active) return { ok: false, error: "Produit indisponible." };

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: existing } = await supabase
      .from("cart_items").select("id, quantity").eq("user_id", user.id).eq("product_id", pid.data).maybeSingle();
    let newQty = (existing?.quantity ?? 0) + qty.data;
    if (product.stock != null) newQty = Math.min(newQty, product.stock);
    if (newQty < 1) return { ok: false, error: "Stock épuisé." };
    if (existing) {
      await supabase.from("cart_items").update({ quantity: newQty }).eq("id", existing.id);
    } else {
      await supabase.from("cart_items").insert({ user_id: user.id, product_id: pid.data, quantity: newQty });
    }
  } else {
    const lines = await readCookieCart();
    const found = lines.find((l) => l.productId === pid.data);
    let newQty = (found?.quantity ?? 0) + qty.data;
    if (product.stock != null) newQty = Math.min(newQty, product.stock);
    if (found) found.quantity = newQty;
    else lines.push({ productId: pid.data, quantity: newQty });
    await writeCookieCart(lines);
  }
  return { ok: true };
}

/** Définit la quantité exacte d'une ligne (supprime si 0). */
export async function updateQuantity(productId: string, quantity: number) {
  const pid = ProductIdSchema.safeParse(productId);
  if (!pid.success) return { ok: false, error: "Produit invalide." };
  if (quantity <= 0) return removeFromCart(pid.data);
  const qty = QtySchema.safeParse(quantity);
  if (!qty.success) return { ok: false, error: "Quantité invalide." };

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products").select("stock, is_active").eq("id", pid.data).maybeSingle();
  if (!product || !product.is_active) return { ok: false, error: "Produit indisponible." };
  let finalQty = qty.data;
  if (product.stock != null) finalQty = Math.min(finalQty, product.stock);

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("cart_items").update({ quantity: finalQty }).eq("user_id", user.id).eq("product_id", pid.data);
  } else {
    const lines = await readCookieCart();
    const found = lines.find((l) => l.productId === pid.data);
    if (found) { found.quantity = finalQty; await writeCookieCart(lines); }
  }
  return { ok: true };
}

/** Retire une ligne du panier. */
export async function removeFromCart(productId: string) {
  const pid = ProductIdSchema.safeParse(productId);
  if (!pid.success) return { ok: false, error: "Produit invalide." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("cart_items").delete().eq("user_id", user.id).eq("product_id", pid.data);
  } else {
    const lines = (await readCookieCart()).filter((l) => l.productId !== pid.data);
    await writeCookieCart(lines);
  }
  return { ok: true };
}

/** Vide entièrement le panier (DB + cookie). */
export async function clearCart() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from("cart_items").delete().eq("user_id", user.id);
  await writeCookieCart([]);
  return { ok: true };
}

/**
 * Fusionne le panier cookie (invité) dans la DB à la connexion,
 * puis vide le cookie. À appeler juste après un login réussi.
 */
export async function mergeCartOnLogin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const guestLines = await readCookieCart();
  if (guestLines.length === 0) return { ok: true };

  const { data: existing } = await supabase
    .from("cart_items").select("product_id, quantity").eq("user_id", user.id);
  const current = new Map((existing ?? []).map((r) => [r.product_id, r.quantity]));

  for (const l of guestLines) {
    // On ne fusionne que les produits encore actifs
    const { data: product } = await supabase
      .from("products").select("stock, is_active").eq("id", l.productId).maybeSingle();
    if (!product || !product.is_active) continue;

    let qty = (current.get(l.productId) ?? 0) + l.quantity;
    if (product.stock != null) qty = Math.min(qty, product.stock);

    if (current.has(l.productId)) {
      await supabase.from("cart_items").update({ quantity: qty }).eq("user_id", user.id).eq("product_id", l.productId);
    } else {
      await supabase.from("cart_items").insert({ user_id: user.id, product_id: l.productId, quantity: qty });
    }
  }

  await writeCookieCart([]);
  return { ok: true };
}
