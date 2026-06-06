import { Ruler } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusSelect } from "./status-select";

export const metadata = { title: "Commandes sur mesure — Patronniste" };
export const dynamic = "force-dynamic";

const STATUT_BADGE: Record<string, string> = {
  en_attente: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  en_cours: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  termine: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  annule: "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/50",
};

export default async function SurMesurePage() {
  const admin = createAdminClient();
  const { data: orders } = await admin
    .from("patron_custom_orders")
    .select("id, titre, tissu, taille, mesures, note, statut, created_at, client:users!patron_custom_orders_client_id_fkey(nom, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="text-gray-900 dark:text-white">
      <h1 className="font-playfair text-3xl font-bold mb-1">Commandes sur mesure</h1>
      <p className="text-gray-500 dark:text-white/50 mb-6">{orders?.length ?? 0} demande(s) avec table de mesures.</p>

      {!orders?.length ? (
        <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-12 text-center text-gray-400">
          <Ruler size={32} className="mx-auto mb-3 opacity-40" />
          Aucune commande sur mesure pour l'instant.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {orders.map((o) => {
            const client = o.client as { nom?: string; email?: string } | null;
            const mesures = (o.mesures ?? {}) as Record<string, string | number>;
            const entries = Object.entries(mesures);
            return (
              <div key={o.id} className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{o.titre}</h3>
                    <p className="text-xs text-gray-400">{client?.nom ?? "—"} · {client?.email}</p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${STATUT_BADGE[o.statut] ?? ""}`}>
                    {o.statut.replace("_", " ")}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
                  {o.taille && <span className="bg-cream-100 dark:bg-white/10 px-2 py-0.5 rounded">Taille : {o.taille}</span>}
                  {o.tissu && <span className="bg-cream-100 dark:bg-white/10 px-2 py-0.5 rounded">Tissu : {o.tissu}</span>}
                </div>

                {entries.length > 0 && (
                  <div className="rounded-xl border border-cream-200 dark:border-white/10 overflow-hidden mb-3">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-cream-100 dark:divide-white/5">
                        {entries.map(([k, v]) => (
                          <tr key={k}>
                            <td className="px-3 py-1.5 text-gray-500 dark:text-white/50">{k}</td>
                            <td className="px-3 py-1.5 text-end font-medium">{String(v)} cm</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {o.note && <p className="text-sm text-gray-500 dark:text-white/50 mb-3 italic">« {o.note} »</p>}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString("fr-FR")}</span>
                  <StatusSelect id={o.id} current={o.statut} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
