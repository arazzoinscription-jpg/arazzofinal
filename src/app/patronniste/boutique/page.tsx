import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { patronImage } from "@/lib/patron-images";
import { SellList, type SellItem } from "@/app/formateur/boutique/sell-list";

export const metadata = { title: "Mise en vente — Patronniste" };
export const dynamic = "force-dynamic";

export default async function PatronnisteBoutiquePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from("users").select("role").eq("id", user!.id).single();
  const isAdmin = prof?.role === "admin";

  const admin = createAdminClient();

  let pq = admin
    .from("patrons").select("id, titre, prix_dzd, preview_url").order("created_at", { ascending: false });
  if (!isAdmin) pq = pq.eq("formateur_id", user!.id);
  const { data: patrons } = await pq;

  const { data: products } = await admin
    .from("products").select("id, patron_id, price, is_active");

  const byPatron = new Map<string, { id: string; price: number; is_active: boolean }>();
  for (const p of products ?? []) {
    if (p.patron_id) byPatron.set(p.patron_id, { id: p.id, price: Number(p.price), is_active: p.is_active });
  }

  const patronItems: SellItem[] = (patrons ?? []).map((p) => {
    const prod = byPatron.get(p.id);
    return {
      id: p.id, title: p.titre ?? "Patron", image: p.preview_url || patronImage(p.id),
      sourcePrice: Number(p.prix_dzd ?? 0),
      productId: prod?.id ?? null, active: prod?.is_active ?? false, currentPrice: prod?.price ?? null,
    };
  });

  return (
    <div className="text-gray-900 dark:text-white">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <h1 className="font-playfair text-3xl font-bold">Mise en vente</h1>
        <Link href="/boutique" target="_blank"
          className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300 hover:underline">
          Voir la boutique <ExternalLink size={15} />
        </Link>
      </div>
      <p className="text-gray-500 dark:text-white/50 mb-8">
        Choisissez les patrons à vendre, fixez le prix, et ils apparaîtront dans la boutique en ligne avec le bouton « Ajouter au panier ».
      </p>

      <SellList courses={[]} patrons={patronItems} />
    </div>
  );
}
