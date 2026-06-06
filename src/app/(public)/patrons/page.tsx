import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { createClient } from "@/lib/supabase/server";
import { patronImage } from "@/lib/patron-images";

export const metadata = {
  title: "Patrons numériques — Arazzo Formation",
  description: "Bibliothèque de patrons PDF pour couture, caftan, djellaba et broderie.",
};

export default async function PatronsPage() {
  const supabase = await createClient();
  const { data: patrons } = await supabase
    .from("patrons")
    .select("*, formateur:users(nom)")
    .order("created_at", { ascending: false });

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream-DEFAULT">
        <div className="bg-gradient-to-br from-orange-DEFAULT to-orange-600 pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="font-playfair text-4xl lg:text-5xl font-bold text-white mb-4">
              Bibliothèque de patrons
            </h1>
            <p className="text-orange-100 text-xl">
              {patrons?.length ?? 0} patrons PDF prêts à imprimer
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {!patrons?.length ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-xl">Les premiers patrons arrivent bientôt…</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {patrons.map((patron) => (
                <div
                  key={patron.id}
                  className="bg-white rounded-2xl border border-cream-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="aspect-[3/4] bg-cream-100 overflow-hidden">
                    <img
                      src={patron.preview_url || patronImage(patron.id)}
                      alt={patron.titre}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                      {patron.titre}
                    </h3>
                    {(patron.formateur as any)?.nom && (
                      <p className="text-sm text-gray-500 mb-3">
                        par {(patron.formateur as any).nom}
                      </p>
                    )}

                    {/* Attributs */}
                    {((patron as any).tailles || (patron as any).tissu || (patron as any).nb_pages != null) && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(patron as any).tailles && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-violet-50 text-violet-700 px-2 py-1 rounded-lg">
                            📏 {(patron as any).tailles}
                          </span>
                        )}
                        {(patron as any).tissu && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-orange-50 text-orange-700 px-2 py-1 rounded-lg line-clamp-1 max-w-full">
                            🧵 {(patron as any).tissu}
                          </span>
                        )}
                        {(patron as any).nb_pages != null && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-cream-100 text-gray-600 px-2 py-1 rounded-lg">
                            📄 {(patron as any).nb_pages} p.
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xl font-bold text-orange-DEFAULT">
                        {patron.prix_dzd.toLocaleString("fr-DZ")} DA
                      </span>
                      <span className="text-sm text-gray-400">{patron.prix_eur}€</span>
                    </div>
                    <a
                      href={`/patrons/${patron.id}`}
                      className="block w-full text-center bg-orange-DEFAULT text-white py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors text-sm"
                    >
                      Acheter ce patron
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
