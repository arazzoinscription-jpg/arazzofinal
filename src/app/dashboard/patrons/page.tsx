import { Ruler, Scissors, FileText, Download } from "lucide-react";
import { DashHeader } from "../dash-header";
import { createClient } from "@/lib/supabase/server";
import { patronImage } from "@/lib/patron-images";

export const metadata = { title: "Mes patrons — Arazzo Formation" };

export default async function PatronsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: purchases } = await supabase
    .from("patron_purchases")
    .select(`*, patron:patrons(id, titre, description, fichier_url, preview_url, tailles, tissu, taille_table, nb_pages, format)`)
    .eq("user_id", user!.id)
    .order("paid_at", { ascending: false });

  return (
    <div>
      <DashHeader index="14" eyebrow="Boutique" title="Mes patrons" subtitle="Téléchargez vos patrons PDF achetés." />

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
                  <img
                    src={patron?.preview_url || patronImage(patron?.id)}
                    alt={patron?.titre}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {patron?.titre}
                  </h3>
                  {patron?.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                      {patron.description}
                    </p>
                  )}

                  {/* Attributs */}
                  <dl className="space-y-1.5 mb-4 text-sm">
                    {patron?.tailles && (
                      <div className="flex items-center gap-2">
                        <Ruler size={15} className="text-violet-600 flex-shrink-0" />
                        <dt className="text-gray-400">Tailles</dt>
                        <dd className="ms-auto font-medium text-gray-700">{patron.tailles}</dd>
                      </div>
                    )}
                    {patron?.tissu && (
                      <div className="flex items-start gap-2">
                        <Scissors size={15} className="text-violet-600 flex-shrink-0 mt-0.5" />
                        <dt className="text-gray-400">Tissu</dt>
                        <dd className="ms-auto text-end font-medium text-gray-700">{patron.tissu}</dd>
                      </div>
                    )}
                    {patron?.nb_pages != null && (
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-violet-600 flex-shrink-0" />
                        <dt className="text-gray-400">Pages</dt>
                        <dd className="ms-auto font-medium text-gray-700">{patron.nb_pages} · {patron.format}</dd>
                      </div>
                    )}
                  </dl>

                  {patron?.taille_table && (
                    <p className="text-xs text-gray-400 bg-cream-100 rounded-lg p-2.5 mb-4">{patron.taille_table}</p>
                  )}

                  <a
                    href={patron?.fichier_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-orange-DEFAULT text-white py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors text-sm"
                  >
                    <Download size={16} /> Télécharger le PDF
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
