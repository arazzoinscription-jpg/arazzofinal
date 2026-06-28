import { Wallet, Scissors, Ruler } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPatronnisteEarnings } from "@/lib/commissions";

export const metadata = { title: "Mes gains — Patronniste" };
export const dynamic = "force-dynamic";

const fmt = (n: number) => `${Number(n).toLocaleString("fr-DZ")} DA`;

export default async function PatronnisteGainsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const e = await getPatronnisteEarnings(admin, user.id);

  return (
    <div className="text-gray-900 dark:text-white">
      <h1 className="font-playfair text-3xl font-bold mb-1 flex items-center gap-2">
        <Wallet size={26} className="text-violet-600 dark:text-violet-300" /> Mes gains
      </h1>
      <p className="text-gray-500 dark:text-white/50 mb-6">
        Commission plateforme : <strong>{e.rate}%</strong> · vous gagnez le prix moins la commission sur chaque vente.
      </p>

      {/* Cartes de synthèse */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Chiffre d'affaires</p>
          <p className="font-playfair text-2xl font-bold mt-1">{fmt(e.totals.gross)}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Commission plateforme</p>
          <p className="font-playfair text-2xl font-bold mt-1 text-gray-500">− {fmt(e.totals.commission)}</p>
        </div>
        <div className="rounded-2xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 p-5">
          <p className="text-xs text-green-700/70 dark:text-green-300/70 uppercase tracking-wide">Vos gains nets</p>
          <p className="font-playfair text-2xl font-bold mt-1 text-green-700 dark:text-green-300">{fmt(e.totals.net)}</p>
        </div>
      </div>

      {/* Détail patrons */}
      <h2 className="flex items-center gap-2 font-semibold mb-3"><Scissors size={18} className="text-violet-600 dark:text-violet-300" /> Mes patrons</h2>
      {e.patrons.length === 0 ? (
        <p className="text-gray-400 text-sm mb-8">Aucun patron créé pour l'instant.</p>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead className="bg-cream-50 dark:bg-white/5 text-left text-gray-500 dark:text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Patron</th>
                <th className="px-4 py-3 font-medium text-right">Prix</th>
                <th className="px-4 py-3 font-medium text-right">Ventes</th>
                <th className="px-4 py-3 font-medium text-right">CA</th>
                <th className="px-4 py-3 font-medium text-right">Commission</th>
                <th className="px-4 py-3 font-medium text-right">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100 dark:divide-white/5">
              {e.patrons.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5 font-medium">{p.titre}</td>
                  <td className="px-4 py-2.5 text-right">{fmt(p.prix)}</td>
                  <td className="px-4 py-2.5 text-right">{p.sales}</td>
                  <td className="px-4 py-2.5 text-right">{fmt(p.gross)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">− {fmt(p.commission)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-600">{fmt(p.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Détail sur-mesure */}
      <h2 className="flex items-center gap-2 font-semibold mb-3"><Ruler size={18} className="text-orange-600" /> Commandes sur mesure terminées</h2>
      {e.surMesure.length === 0 ? (
        <p className="text-gray-400 text-sm">Aucune commande sur mesure terminée.</p>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream-50 dark:bg-white/5 text-left text-gray-500 dark:text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Modèle</th>
                <th className="px-4 py-3 font-medium text-right">Prix</th>
                <th className="px-4 py-3 font-medium text-right">Commission</th>
                <th className="px-4 py-3 font-medium text-right">Net</th>
                <th className="px-4 py-3 font-medium text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100 dark:divide-white/5">
              {e.surMesure.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2.5 font-medium">{s.titre}</td>
                  <td className="px-4 py-2.5 text-right">{fmt(s.prix)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">− {fmt(s.commission)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-600">{fmt(s.net)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">{s.date ? new Date(s.date).toLocaleDateString("fr-FR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
