import { createAdminClient } from "@/lib/supabase/admin";
import { ProductCreateForm, ProductRow } from "./product-admin";

export const metadata = { title: "Produits — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminProduitsPage() {
  const admin = createAdminClient();
  const { data: products } = await admin
    .from("products")
    .select("id, title, type, price, stock, is_active")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Produits</h1>
      <p className="text-gray-500 mb-6 font-dm">{products?.length ?? 0} produit(s) au catalogue.</p>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1"><ProductCreateForm /></div>
        <div className="lg:col-span-2 space-y-3">
          {!products?.length ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-cream-200 text-gray-400">Aucun produit.</div>
          ) : products.map((p) => <ProductRow key={p.id} product={p} />)}
        </div>
      </div>
    </div>
  );
}
