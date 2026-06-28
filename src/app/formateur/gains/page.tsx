import { Wallet, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFormateurEarnings } from "@/lib/commissions";

export const metadata = { title: "Mes gains — Formateur" };
export const dynamic = "force-dynamic";

const dz = (n: number) => `${Number(n).toLocaleString("fr-DZ")} DA`;
const eu = (n: number) => `${Number(n).toLocaleString("fr-FR")} €`;

export default async function FormateurGainsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const e = await getFormateurEarnings(admin, user.id);
  const hasEur = e.totals.grossEur > 0;

  return (
    <div className="text-gray-900 dark:text-white">
      <h1 className="font-playfair text-3xl font-bold mb-1 flex items-center gap-2">
        <Wallet size={26} className="text-violet-600 dark:text-violet-300" /> Mes gains
      </h1>
      <p className="text-gray-500 dark:text-white/50 mb-6">
        Commission plateforme sur les formations : <strong>{e.rate}%</strong> · vous gagnez le montant payé moins la commission.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Chiffre d'affaires</p>
          <p className="font-playfair text-2xl font-bold mt-1">{dz(e.totals.grossDzd)}</p>
          {hasEur && <p className="text-sm text-gray-400">{eu(e.totals.grossEur)}</p>}
        </div>
        <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Commission plateforme</p>
          <p className="font-playfair text-2xl font-bold mt-1 text-gray-500">− {dz(e.totals.commissionDzd)}</p>
          {hasEur && <p className="text-sm text-gray-400">− {eu(e.totals.commissionEur)}</p>}
        </div>
        <div className="rounded-2xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 p-5">
          <p className="text-xs text-green-700/70 dark:text-green-300/70 uppercase tracking-wide">Vos gains nets</p>
          <p className="font-playfair text-2xl font-bold mt-1 text-green-700 dark:text-green-300">{dz(e.totals.netDzd)}</p>
          {hasEur && <p className="text-sm text-green-600/80">{eu(e.totals.netEur)}</p>}
        </div>
      </div>

      <h2 className="flex items-center gap-2 font-semibold mb-3"><BookOpen size={18} className="text-violet-600 dark:text-violet-300" /> Mes formations</h2>
      {e.courses.length === 0 ? (
        <p className="text-gray-400 text-sm">Aucune formation pour l'instant.</p>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream-50 dark:bg-white/5 text-left text-gray-500 dark:text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Formation</th>
                <th className="px-4 py-3 font-medium text-right">Prix</th>
                <th className="px-4 py-3 font-medium text-right">Ventes</th>
                <th className="px-4 py-3 font-medium text-right">CA</th>
                <th className="px-4 py-3 font-medium text-right">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100 dark:divide-white/5">
              {e.courses.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2.5 font-medium">{c.titre}</td>
                  <td className="px-4 py-2.5 text-right">{dz(c.prixDzd)}</td>
                  <td className="px-4 py-2.5 text-right">{c.sales}</td>
                  <td className="px-4 py-2.5 text-right">
                    {dz(c.grossDzd)}{c.grossEur > 0 && <span className="text-gray-400"> · {eu(c.grossEur)}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-600">
                    {dz(c.netDzd)}{c.netEur > 0 && <span className="text-green-500/80"> · {eu(c.netEur)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
