import { createClient } from "@/lib/supabase/server";
import { CustomOrderForm } from "./order-form";

export const metadata = { title: "Commande sur mesure — Arazzo" };
export const dynamic = "force-dynamic";

const STATUT_LABEL: Record<string, string> = {
  en_attente: "En attente", en_cours: "En cours", termine: "Terminé", annule: "Annulé",
};
const STATUT_BADGE: Record<string, string> = {
  en_attente: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  en_cours: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  termine: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  annule: "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/50",
};

export default async function SurMesurePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: orders } = await supabase
    .from("patron_custom_orders")
    .select("id, titre, tissu, taille, mesures, statut, created_at")
    .eq("client_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="text-gray-900 dark:text-white">
      <h1 className="font-playfair text-3xl font-bold mb-1">Patron sur mesure</h1>
      <p className="text-gray-500 dark:text-white/50 mb-6">Commandez un patron réalisé d'après vos propres mesures.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CustomOrderForm />

        <div>
          <h2 className="font-semibold mb-3">Mes demandes</h2>
          {!orders?.length ? (
            <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-8 text-center text-gray-400 text-sm">
              Vous n'avez pas encore de commande sur mesure.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => {
                const mesures = (o.mesures ?? {}) as Record<string, string | number>;
                return (
                  <div key={o.id} className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{o.titre}</h3>
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${STATUT_BADGE[o.statut] ?? ""}`}>
                        {STATUT_LABEL[o.statut] ?? o.statut}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(o.created_at).toLocaleDateString("fr-FR")}
                      {o.taille ? ` · Taille ${o.taille}` : ""}{o.tissu ? ` · ${o.tissu}` : ""}
                      {Object.keys(mesures).length ? ` · ${Object.keys(mesures).length} mesures` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
