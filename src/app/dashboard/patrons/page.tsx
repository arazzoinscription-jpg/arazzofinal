import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Mes patrons — Arazzo Formation" };

export default async function PatronsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: purchases } = await supabase
    .from("patron_purchases")
    .select(`*, patron:patrons(id, titre, description, fichier_url, preview_url)`)
    .eq("user_id", user!.id)
    .order("paid_at", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">
          Mes patrons
        </h1>
        <p className="text-gray-500 mt-1">
          Téléchargez vos patrons PDF achetés
        </p>
      </div>

      {!purchases?.length ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-cream-200">
          <div className="text-6xl mb-4">📄</div>
          <p className="text-xl text-gray-400 mb-4">
            Vous n'avez pas encore de patron
          </p>
          <a
            href="/patrons"
            className="inline-block bg-orange-DEFAULT text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
          >
            Parcourir les patrons
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {purchases.map((purchase) => {
            const patron = purchase.patron as any;
            return (
              <div
                key={purchase.id}
                className="bg-white rounded-2xl border border-cream-200 overflow-hidden hover:shadow-lg transition-all"
              >
                <div className="aspect-[3/4] bg-cream-100 relative overflow-hidden">
                  {patron?.preview_url ? (
                    <img
                      src={patron.preview_url}
                      alt={patron.titre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-7xl">
                      📄
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {patron?.titre}
                  </h3>
                  {patron?.description && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                      {patron.description}
                    </p>
                  )}
                  <a
                    href={patron?.fichier_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-orange-DEFAULT text-white py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors text-sm"
                  >
                    ⬇️ Télécharger le PDF
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
