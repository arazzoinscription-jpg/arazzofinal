"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateCoupon } from "@/lib/coupons";
import { sendOrderReceived } from "./emails";
import { generateInvoice } from "./invoices";

// ── Schémas ──────────────────────────────────────────────────────────────
const CartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
});

const CustomerSchema = z.object({
  full_name: z.string().min(2, "Nom complet requis."),
  phone: z.string().min(6, "Téléphone requis."),
  email: z.string().email("Email invalide."),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  wilaya: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});

const PaymentMethodSchema = z.enum(["ccp", "paypal", "cod", "transfer"]);

export interface CreateOrderResult {
  ok: boolean;
  error?: string;
  orderId?: string;
  orderNumber?: string;
}

/**
 * Crée une commande.
 *  - Les prix sont TOUJOURS revalidés depuis la DB (jamais ceux du client).
 *  - Le stock est vérifié pour les produits à stock limité.
 *  - Crée la commande + ses lignes (snapshot du titre/prix).
 */
export async function createOrder(
  cartItems: unknown,
  customerInfo: unknown,
  paymentMethod: unknown
): Promise<CreateOrderResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connectez-vous pour passer commande." };

  const itemsParsed = z.array(CartItemSchema).min(1).safeParse(cartItems);
  const custParsed = CustomerSchema.safeParse(customerInfo);
  const methodParsed = PaymentMethodSchema.safeParse(paymentMethod);
  if (!itemsParsed.success) return { ok: false, error: "Panier invalide." };
  if (!custParsed.success) return { ok: false, error: custParsed.error.issues[0].message };
  if (!methodParsed.success) return { ok: false, error: "Mode de paiement invalide." };

  // Dédoublonnage des lignes (cumul des quantités)
  const merged = new Map<string, number>();
  for (const it of itemsParsed.data) merged.set(it.productId, (merged.get(it.productId) ?? 0) + it.quantity);
  const ids = [...merged.keys()];

  // Prix + stock RÉELS depuis la DB
  const { data: products } = await supabase
    .from("products")
    .select("id, title, price, stock, is_active, course_id")
    .in("id", ids);

  if (!products || products.length !== ids.length) {
    return { ok: false, error: "Un produit du panier est introuvable." };
  }

  const lines: { product_id: string; title: string; price: number; quantity: number; course_id: string | null }[] = [];
  let subtotal = 0;
  for (const p of products) {
    if (!p.is_active) return { ok: false, error: `« ${p.title} » n'est plus disponible.` };
    const qty = merged.get(p.id)!;
    if (p.stock != null && qty > p.stock) {
      return { ok: false, error: `Stock insuffisant pour « ${p.title} » (reste ${p.stock}).` };
    }
    const price = Number(p.price);
    subtotal += price * qty;
    lines.push({ product_id: p.id, title: p.title, price, quantity: qty, course_id: p.course_id });
  }

  // Code promo (revalidé côté serveur sur le sous-total réel)
  let discount = 0;
  let couponId: string | null = null;
  const promoCode = (await cookies()).get("promo")?.value;
  if (promoCode) {
    const admin = createAdminClient();
    const r = await validateCoupon(admin, promoCode, subtotal);
    if (r.valid) { discount = r.discount ?? 0; couponId = r.couponId ?? null; }
  }
  const total = Math.max(0, subtotal - discount);
  const c = custParsed.data;

  // Création de la commande (order_number rempli par trigger)
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      customer_id: user.id,
      status: "pending",
      full_name: c.full_name,
      phone: c.phone,
      email: c.email,
      address: c.address ?? null,
      city: c.city ?? null,
      wilaya: c.wilaya ?? null,
      country: c.country ?? "Algérie",
      subtotal,
      discount,
      total,
      payment_method: methodParsed.data,
    })
    .select("id, order_number")
    .single();

  if (orderErr || !order) return { ok: false, error: orderErr?.message ?? "Création de commande impossible." };

  // Lignes de commande
  const { error: itemsErr } = await supabase.from("order_items").insert(
    lines.map((l) => ({
      order_id: order.id,
      product_id: l.product_id,
      title: l.title,
      price: l.price,
      quantity: l.quantity,
      course_id: l.course_id,
    }))
  );
  if (itemsErr) {
    // Annule la commande pour ne pas laisser de coquille vide
    await supabase.from("orders").delete().eq("id", order.id);
    return { ok: false, error: "Impossible d'enregistrer les articles." };
  }

  // Vide le panier DB de l'utilisateur
  await supabase.from("cart_items").delete().eq("user_id", user.id);

  // Incrémente l'usage du coupon + retire le code appliqué
  if (couponId) {
    try {
      const admin = createAdminClient();
      const { data: cur } = await admin.from("coupons").select("used_count").eq("id", couponId).single();
      await admin.from("coupons").update({ used_count: (cur?.used_count ?? 0) + 1 }).eq("id", couponId);
    } catch { /* ignore */ }
  }
  try { (await cookies()).delete("promo"); } catch { /* ignore */ }

  // Facture (proforma) générée dès la commande (best-effort)
  try { await generateInvoice(order.id); } catch { /* ignore */ }

  // Notification dashboard : commande reçue, en cours de traitement
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      user_id: user.id,
      type: "system",
      title: `🛍️ Commande ${order.order_number ?? ""} reçue`,
      body: "Votre demande est en cours de traitement.",
      link: `/dashboard/commandes`,
    });
  } catch { /* ignore */ }

  // Email « commande reçue » + facture + lien de suivi/preuve (best-effort)
  try { await sendOrderReceived(order.id); } catch { /* ignore */ }

  revalidatePath("/compte/commandes");
  return { ok: true, orderId: order.id, orderNumber: order.order_number ?? undefined };
}

/** Détail d'une commande (propriétaire ou admin via RLS). */
export async function getOrder(orderId: string) {
  const parsed = z.string().uuid().safeParse(orderId);
  if (!parsed.success) return { ok: false, error: "Commande invalide." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data: order } = await supabase
    .from("orders")
    .select(`
      id, order_number, status, full_name, phone, email, address, city, wilaya, country,
      subtotal, discount, total, payment_method, created_at,
      order_items(id, title, price, quantity, product_id, course_id),
      order_payments(id, method, status, amount, created_at),
      invoices(id, invoice_number, amount, issued_at)
    `)
    .eq("id", parsed.data)
    .maybeSingle();

  if (!order) return { ok: false, error: "Commande introuvable." };
  return { ok: true, order };
}

/** Liste les commandes de l'utilisateur connecté (plus récentes d'abord). */
export async function getMyOrders() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié.", orders: [] };

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, total, payment_method, created_at, order_items(id, title, quantity)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  return { ok: true, orders: orders ?? [] };
}

/** Annule une commande non encore confirmée (propriétaire uniquement). */
export async function cancelOrder(orderId: string) {
  const parsed = z.string().uuid().safeParse(orderId);
  if (!parsed.success) return { ok: false, error: "Commande invalide." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data: order } = await supabase
    .from("orders").select("id, status, customer_id").eq("id", parsed.data).maybeSingle();
  if (!order) return { ok: false, error: "Commande introuvable." };
  if (order.customer_id !== user.id) return { ok: false, error: "Accès refusé." };

  const cancellable = ["pending", "payment_pending", "payment_review"];
  if (!cancellable.includes(order.status)) {
    return { ok: false, error: "Cette commande ne peut plus être annulée." };
  }

  const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/compte/commandes");
  return { ok: true };
}
