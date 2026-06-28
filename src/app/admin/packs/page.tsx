import Link from "next/link";
import { Pencil, Package, ExternalLink } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PackSellButton, type PackSellState } from "@/app/formateur/packs/pack-sell-button";
import { PackPublishToggle } from "./pack-publish-toggle";

export const metadata = { title: "Packs de formation — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPacksPage({ searchParams }: { searchParams: { q?: string } }) {
  const admin = createAdminClient();
  const q = (searchParams.q ?? "").trim();

  let query = admin
    .from("course_packs")
    .select(`id, titre_fr, description_fr, prix_dzd, prix_eur, thumbnail, published, created_at,
      formateur:users(nom),
      items:course_pack_items(course:courses(titre_fr))`)
    .order("created_at", { ascending: false });
  if (q) query = query.ilike("titre_fr", `%${q}%`);
  const { data: packs } = await query.limit(200);

  // État de vente boutique : produit 'bundle' référençant chaque pack via files ["pack:<id>"].
  const byPack = new Map<string, { id: string; price: number; active: boolean }>();
  const { data: bundles } = await admin.from("products").select("id, price, is_active, files").eq("type", "bundle");
  for (const p of bundles ?? []) {
    const ref = ((p.files as string[]) ?? []).find((f) => f.startsWith("pack:"));
    if (ref) byPack.set(ref.slice(5), { id: p.id, price: Number(p.price), active: !!p.is_active });
  }

  const list = packs ?? [];
  const onSale = list.filter((p) => byPack.get(p.id)?.active).length;

  return (
    <div className="px-4 lg:px-8 py-6">
      <div className="flex items-center gap-3 mb-1">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100 text-orange-600"><Package size={20} /></span>
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Packs de formation</h1>
      </div>
      <p className="text-gray-500 mb-6 font-dm">
        {list.length} pack(s) · {onSale} en vente. Publiez un pack et mettez-le en vente dans la boutique / la page Offre.
      </p>

      <form className="flex gap-3 mb-6">
        <input name="q" defaultValue={q} placeholder="Rechercher un pack…"
          className="flex-1 min-w-56 border border-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <button className="bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600">Filtrer</button>
      </form>

      {list.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-xl text-gray-400 mb-4">Aucun pack pour le moment.</p>
          <Link href="/formateur/packs/nouveau"
            className="inline-block bg-orange-DEFAULT text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
            Créer un pack
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {list.map((p) => {
            const items = (p.items as any[]) ?? [];
            const titres = items.map((it) => (it.course as { titre_fr?: string } | null)?.titre_fr).filter(Boolean) as string[];
            const formateurNom = (p.formateur as { nom?: string } | null)?.nom ?? "—";
            const prod = byPack.get(p.id);
            const sale: PackSellState = {
              active: !!prod?.active,
              productId: prod?.id ?? null,
              currentPrice: prod?.price ?? null,
              defaultPrice: Number(p.prix_dzd) || 0,
            };
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
                <div className="flex gap-4 mb-3">
                  <div className="w-24 h-24 rounded-xl bg-cream-100 overflow-hidden flex-shrink-0">
                    {p.thumbnail
                      ? <img src={p.thumbnail} alt={p.titre_fr} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 font-dm">{p.titre_fr}</h3>
                      <PackPublishToggle packId={p.id} published={!!p.published} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Formateur : {formateurNom}</p>
                    {p.description_fr && <p className="text-sm text-gray-500 font-dm line-clamp-2 mt-1">{p.description_fr}</p>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {titres.slice(0, 4).map((t, i) => (
                    <span key={i} className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                  {titres.length > 4 && <span className="text-xs text-gray-400">+{titres.length - 4}</span>}
                  {titres.length === 0 && <span className="text-xs text-gray-400 italic">Aucun cours inclus</span>}
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-auto">
                  <span className="font-bold text-orange-600 font-playfair">
                    {Number(p.prix_dzd).toLocaleString("fr-DZ")} DA · {Number(p.prix_eur).toFixed(0)} €
                  </span>
                  <Link href={`/formateur/packs/${p.id}/edit`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:underline">
                    <Pencil size={14} /> Modifier
                  </Link>
                </div>

                <div className="border-t border-gray-100 pt-3 mt-3 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-gray-500">Mise en vente (boutique / offre)</span>
                  <PackSellButton packId={p.id} sale={sale} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6 inline-flex items-center gap-1.5">
        <ExternalLink size={13} /> Un pack « publié » + « en vente » apparaît dans la boutique. Les packs se créent et s'éditent dans l'espace formateur.
      </p>
    </div>
  );
}
