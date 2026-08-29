import { redirect } from "next/navigation";
import { getCart } from "@/app/actions/cart";
import { getAppliedPromo } from "@/app/actions/promo";
import { createClient } from "@/lib/supabase/server";
import { CheckoutClient } from "./checkout-client";
import { CheckoutPixel } from "@/components/analytics/checkout-pixel";

export const metadata = { title: "Commander — Arazzo" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/checkout");

  const { items, subtotal } = await getCart();
  if (items.length === 0) redirect("/panier");

  const promo = await getAppliedPromo();
  const discount = promo?.discount ?? 0;
  const total = Math.max(0, subtotal - discount);

  // Pré-remplissage depuis le profil
  const { data: profile } = await supabase
    .from("users").select("nom, email, ville, pays").eq("id", user.id).single();

  const defaultCustomer = {
    full_name: profile?.nom ?? "",
    phone: "",
    email: profile?.email ?? user.email ?? "",
    address: "",
    city: profile?.ville ?? "",
    wilaya: "",
    country: profile?.pays ?? "Algérie",
  };

  // Métier du panier : formation si un cours/pack y figure, sinon patron.
  const category: "formation" | "patron" = items.some((i) => {
    const t = String(i.type ?? "").toLowerCase();
    return t.includes("formation") || t.includes("course") || t.includes("pack");
  }) ? "formation" : "patron";
  const numItems = items.reduce((n, i) => n + (i.quantity ?? 1), 0);

  return (
    <div>
      {/* Meta « InitiateCheckout » — début du paiement, étiqueté par métier. */}
      <CheckoutPixel value={total} currency="DZD" numItems={numItems} category={category} />
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-6">Finaliser ma commande</h1>
      <CheckoutClient items={items} subtotal={subtotal} discount={discount} total={total} appliedCode={promo?.code ?? null} defaultCustomer={defaultCustomer} />
    </div>
  );
}
