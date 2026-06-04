import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DeletePackButton } from "./delete-pack-button";

export const metadata = { title: "Packs de cours — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function PacksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isAdmin = prof?.role === "admin";

  // Packs du formateur (ou tous pour l'admin) avec les cours inclus
  const admin = createAdminClient();
  let query = admin
    .from("course_packs")
    .select("id, titre_fr, description_fr, prix_dzd, prix_eur, published, created_at, items:course_pack_items(course:courses(titre_fr))")
    .order("created_at", { ascending: false });
  if (!isAdmin) query = query.eq("formateur_id", user.id);
  const { data: packs } = await query;

  return (
    <div>
      <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
        <div>
          <h1 className="font-playfair text-3xl font-bold text-gray-900">Packs de cours</h1>
          <p className="text-gray-500 mt-1 font-dm">Regroupez plusieurs cours en une offre groupée.</p>
        </div>
        <Link href="/formateur/packs/nouveau"
          className="bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
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
            const titres = ((p.items as any[]) ?? [])
              .map((it) => (it.course as { titre_fr?: string } | null)?.titre_fr)
              .filter(Boolean) as string[];
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-cream-200 p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-gray-900 font-dm">{p.titre_fr}</h3>
                  <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    p.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {p.published ? "● Publié" : "○ Brouillon"}
                  </span>
                </div>
                {p.description_fr && <p className="text-sm text-gray-500 font-dm line-clamp-2 mb-3">{p.description_fr}</p>}

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {titres.slice(0, 4).map((t, i) => (
                    <span key={i} className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                  {titres.length > 4 && <span className="text-xs text-gray-400">+{titres.length - 4}</span>}
                </div>

                <div className="flex items-center justify-between border-t border-cream-100 pt-3">
                  <span className="font-bold text-orange-600 font-playfair">
                    {Number(p.prix_dzd).toLocaleString("fr-DZ")} DA · {Number(p.prix_eur).toFixed(0)} €
                  </span>
                  <DeletePackButton id={p.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
