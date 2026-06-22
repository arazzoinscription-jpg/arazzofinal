import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DeletePackButton } from "./delete-pack-button";
import { PackBulkEnroll } from "./pack-bulk-enroll";
import { PackSellButton, type PackSellState } from "./pack-sell-button";

export const metadata = { title: "Packs de cours — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function PacksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Espace formateur = SES propres packs uniquement (la gestion globale est dans /admin).
  const admin = createAdminClient();
  const { data: packs } = await admin
    .from("course_packs")
    .select(`id, titre_fr, description_fr, prix_dzd, prix_eur, thumbnail, published, created_at,
      items:course_pack_items(course:courses(titre_fr, course_categories(category:categories(id, name_fr))))`)
    .eq("formateur_id", user.id)
    .order("created_at", { ascending: false });

  // État de vente boutique : produit de type 'bundle' référençant chaque pack via files ["pack:<id>"].
  const byPack = new Map<string, { id: string; price: number; active: boolean }>();
  const { data: bundles } = await admin.from("products").select("id, price, is_active, files").eq("type", "bundle");
  for (const p of bundles ?? []) {
    const ref = ((p.files as string[]) ?? []).find((f) => f.startsWith("pack:"));
    if (ref) byPack.set(ref.slice(5), { id: p.id, price: Number(p.price), active: !!p.is_active });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
        <div>
          <h1 className="font-playfair text-3xl font-bold text-gray-900">Packs de cours</h1>
          <p className="text-gray-500 mt-1 font-dm">Regroupez plusieurs cours en une offre groupée.</p>
        </div>
        <Link href="/formateur/packs/nouveau"
          className="shiny-cta bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
          ➕ Nouveau pack
        </Link>
      </div>

      {!packs?.length ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-cream-200">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-xl text-gray-400 mb-4">Vous n'avez pas encore créé de pack</p>
          <Link href="/formateur/packs/nouveau"
            className="inline-block bg-orange-DEFAULT text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
            Créer mon premier pack
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {packs.map((p) => {
            const items = (p.items as any[]) ?? [];
            const titres = items
              .map((it) => (it.course as { titre_fr?: string } | null)?.titre_fr)
              .filter(Boolean) as string[];

            // Catégories auto : union des catégories des cours inclus.
            const catMap = new Map<string, string>();
            for (const it of items) {
              for (const cc of (it.course?.course_categories as any[]) ?? []) {
                const c = cc.category;
                if (c?.id && c?.name_fr) catMap.set(c.id, c.name_fr);
              }
            }
            const categories = [...catMap.values()];

            const prod = byPack.get(p.id);
            const sale: PackSellState = {
              active: !!prod?.active,
              productId: prod?.id ?? null,
              currentPrice: prod?.price ?? null,
              defaultPrice: Number(p.prix_dzd) || 0,
            };

            return (
              <div key={p.id} className="bg-white rounded-2xl border border-cream-200 p-5 flex flex-col">
                {/* Photo + en-tête */}
                <div className="flex gap-4 mb-3">
                  <div className="w-24 h-24 rounded-xl bg-cream-100 overflow-hidden flex-shrink-0">
                    {p.thumbnail
                      ? <img src={p.thumbnail} alt={p.titre_fr} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 font-dm">{p.titre_fr}</h3>
                      <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        p.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {p.published ? "● Publié" : "○ Brouillon"}
                      </span>
                    </div>
                    {p.description_fr && <p className="text-sm text-gray-500 font-dm line-clamp-2 mt-1">{p.description_fr}</p>}
                  </div>
                </div>

                {/* Catégories (auto) */}
                {categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {categories.slice(0, 5).map((c, i) => (
                      <span key={i} className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">🏷️ {c}</span>
                    ))}
                  </div>
                )}

                {/* Cours inclus */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {titres.slice(0, 4).map((t, i) => (
                    <span key={i} className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                  {titres.length > 4 && <span className="text-xs text-gray-400">+{titres.length - 4}</span>}
                </div>

                <div className="flex items-center justify-between border-t border-cream-100 pt-3 mt-auto">
                  <span className="font-bold text-orange-600 font-playfair">
                    {Number(p.prix_dzd).toLocaleString("fr-DZ")} DA · {Number(p.prix_eur).toFixed(0)} €
                  </span>
                  <div className="flex items-center gap-3">
                    <Link href={`/formateur/packs/${p.id}/edit`}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:underline">
                      <Pencil size={14} /> Modifier
                    </Link>
                    <DeletePackButton id={p.id} />
                  </div>
                </div>

                {/* Mise en vente boutique */}
                <div className="border-t border-cream-100 pt-3 mt-3 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-gray-500">Boutique</span>
                  <PackSellButton packId={p.id} sale={sale} />
                </div>

                {/* Inscrire des élèves (sélection groupée) */}
                <div className="border-t border-cream-100 pt-3 mt-3">
                  <PackBulkEnroll packId={p.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
