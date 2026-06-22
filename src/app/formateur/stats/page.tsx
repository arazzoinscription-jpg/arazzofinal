import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
export const metadata = { title: "Revenus & Statistiques — Arazzo Formation" };
export const dynamic = "force-dynamic";

interface EnrollRow { amount: number | null; currency: string | null; paid_at: string | null; course: { titre_fr?: string | null } | null; }

export default async function FormateurStatsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Lecture via le client ADMIN (la RLS `enrollments_read_own` masque les inscriptions
  // des autres au client de session → le formateur verrait ~0) et paginée pour dépasser
  // la limite PostgREST de 1000 lignes.
  const admin = createAdminClient();
  const enrollments: EnrollRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("enrollments")
      .select("amount, currency, paid_at, course:courses!inner(titre_fr, formateur_id)")
      .eq("courses.formateur_id", user!.id)
      .order("paid_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    enrollments.push(...(data as any[]));
    if (data.length < PAGE) break;
  }

  // Group by month
  const byMonth: Record<string, { dzd: number; eur: number; count: number }> = {};
  enrollments.forEach((e: any) => {
    if (!e.paid_at) return;
    const month = e.paid_at.slice(0, 7); // YYYY-MM
    if (!byMonth[month]) byMonth[month] = { dzd: 0, eur: 0, count: 0 };
    if (e.currency === "DZD") byMonth[month].dzd += e.amount;
    else byMonth[month].eur += e.amount;
    byMonth[month].count += 1;
  });

  const months = Object.entries(byMonth)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12);

  const totalDzd = enrollments.filter(e => e.currency === "DZD").reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalEur = enrollments.filter(e => e.currency === "EUR").reduce((s, e) => s + (Number(e.amount) || 0), 0);

  return (
    <div>
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-8">
        Revenus & Statistiques
      </h1>

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        {[
          { label: "Total DZD", value: `${totalDzd.toLocaleString("fr-DZ")} DA`, icon: "🇩🇿" },
          { label: "Total EUR", value: `${totalEur.toFixed(2)} €`, icon: "🌍" },
          { label: "Ventes totales", value: enrollments?.length ?? 0, icon: "📊" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-6 border border-cream-200">
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-3xl font-bold font-playfair text-orange-600">
              {s.value}
            </div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Monthly table */}
      <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
        <div className="p-5 border-b border-cream-100">
          <h2 className="font-semibold text-gray-900">Revenus par mois</h2>
        </div>
        {months.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Aucune vente pour l'instant</div>
        ) : (
          <Table className="w-full">
            <TableHeader className="bg-cream-50">
              <TableRow>
                <TableHead className="text-left px-6 py-3 text-sm text-gray-500">Mois</TableHead>
                <TableHead className="text-left px-6 py-3 text-sm text-gray-500">Ventes</TableHead>
                <TableHead className="text-left px-6 py-3 text-sm text-gray-500">DZD</TableHead>
                <TableHead className="text-left px-6 py-3 text-sm text-gray-500">EUR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-cream-100">
              {months.map(([month, data]) => {
                const [yr, mo] = month.split("-");
                const label = new Date(Number(yr), Number(mo) - 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
                return (
                  <TableRow key={month} className="hover:bg-cream-50">
                    <TableCell className="px-6 py-3 text-gray-700 capitalize">{label}</TableCell>
                    <TableCell className="px-6 py-3 text-gray-700 font-semibold">{data.count}</TableCell>
                    <TableCell className="px-6 py-3 text-gray-700">
                      {data.dzd > 0 ? `${data.dzd.toLocaleString("fr-DZ")} DA` : "—"}
                    </TableCell>
                    <TableCell className="px-6 py-3 text-gray-700">
                      {data.eur > 0 ? `${data.eur.toFixed(2)} €` : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Recent transactions */}
      <h2 className="font-playfair text-xl font-bold text-gray-900 mt-10 mb-5">
        Transactions récentes
      </h2>
      <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
        <Table className="w-full">
          <TableHeader className="bg-cream-50">
            <TableRow>
              <TableHead className="text-left px-6 py-3 text-sm text-gray-500">Cours</TableHead>
              <TableHead className="text-left px-6 py-3 text-sm text-gray-500">Date</TableHead>
              <TableHead className="text-left px-6 py-3 text-sm text-gray-500">Montant</TableHead>
              <TableHead className="text-left px-6 py-3 text-sm text-gray-500">Devise</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-cream-100">
            {enrollments?.slice(0, 20).map((e: any, i) => (
              <TableRow key={i} className="hover:bg-cream-50">
                <TableCell className="px-6 py-3 text-gray-700 text-sm">{e.course?.titre_fr}</TableCell>
                <TableCell className="px-6 py-3 text-gray-500 text-sm">
                  {new Date(e.paid_at).toLocaleDateString("fr-FR")}
                </TableCell>
                <TableCell className="px-6 py-3 font-semibold text-gray-900">
                  {e.currency === "DZD"
                    ? `${Number(e.amount).toLocaleString("fr-DZ")} DA`
                    : `${Number(e.amount).toFixed(2)} €`}
                </TableCell>
                <TableCell className="px-6 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    e.currency === "DZD" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {e.currency}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
