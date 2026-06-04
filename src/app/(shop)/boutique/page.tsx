import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductCard, type ShopProduct } from "./product-card";

export const metadata = { title: "Boutique — Arazzo" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "", label: "Tout" },
  { value: "course", label: "Formations" },
  { value: "digital_file", label: "Fichiers" },
  { value: "patron_pdf", label: "Patrons PDF" },
  { value: "bundle", label: "Packs" },
];

export default async function BoutiquePage({ searchParams }: { searchParams: { type?: string } }) {
  const supabase = await createClient();
  const type = searchParams.type ?? "";

  let query = supabase
    .from("products")
    .select("id, title, description, type, price, compare_price, images, stock, slug, is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (type) query = query.eq("type", type);

  const { data: products } = await query;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Boutique</h1>
        <p className="text-gray-500 mt-1 font-dm">Formations, fichiers numériques et patrons PDF.</p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <Link key={f.value} href={f.value ? `/boutique?type=${f.value}` : "/boutique"}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold font-dm transition-colors ${
              type === f.value ? "bg-orange-DEFAULT text-white" : "bg-white text-gray-600 border border-cream-200 hover:bg-cream-50"
            }`}>
            {f.label}
          </Link>
        ))}
      </div>

      {!products?.length ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-cream-200">
          <div className="text-6xl mb-4">🛍️</div>
          <p className="text-xl text-gray-400">Aucun produit disponible pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {products.map((p) => <ProductCard key={p.id} product={p as ShopProduct} />)}
        </div>
      )}
    </div>
  );
}
