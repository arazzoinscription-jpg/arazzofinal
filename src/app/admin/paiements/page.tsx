import { createAdminClient } from "@/lib/supabase/admin";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RefundButton } from "./refund-button";
export const metadata = { title: "Paiements — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPaiementsPage() {
  const admin = createAdminClient();

  const { data: enrolls } = await admin
    .from("enrollments")
    .select("id, amount, currency, paid_at, user:users(nom, email), course:courses(titre_fr)")
    .order("paid_at", { ascending: false })
    .limit(50);

  // Totaux (toutes inscriptions)
  const { data: allAmounts } = await admin.from("enrollments").select("amount, currency");
  let totalDzd = 0, totalEur = 0, count = 0;
  (allAmounts ?? []).forEach((e) => {
    count++;
    if (e.currency === "EUR") totalEur += Number(e.amount);
    else totalDzd += Number(e.amount);
  });

  return (
    <div className="px-4 lg:px-8 py-6">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Paiements</h1>
      <p className="text-gray-500 mb-6 font-dm">Vue consolidée des transactions.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: "🇩🇿", label: "Revenus DZD", value: `${totalDzd.toLocaleString("fr-DZ")} DA` },
          { icon: "🌍", label: "Revenus EUR", value: `${totalEur.toFixed(0)} €` },
          { icon: "🧾", label: "Transactions", value: count },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold font-playfair text-orange-600">{s.value}</div>
            <div className="text-xs text-gray-500 font-dm">{s.label}</div>
          </div>
        ))}
      </div>

      <h2 className="font-playfair text-lg font-bold text-gray-900 mb-3">Transactions récentes</h2>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <Table className="w-full text-sm">
          <TableHeader className="bg-gray-50">
            <TableRow className="text-left text-gray-500 font-dm">
              <TableHead className="px-5 py-3 font-medium">Étudiante</TableHead>
              <TableHead className="px-5 py-3 font-medium">Formation</TableHead>
              <TableHead className="px-5 py-3 font-medium">Montant</TableHead>
              <TableHead className="px-5 py-3 font-medium">Date</TableHead>
              <TableHead className="px-5 py-3 font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            {!enrolls?.length ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-gray-400">Aucune transaction.</TableCell></TableRow>
            ) : enrolls.map((e) => (
              <TableRow key={e.id} className="hover:bg-gray-50 font-dm">
                <TableCell className="px-5 py-3 text-gray-700">{(e.user as any)?.nom ?? "—"}</TableCell>
                <TableCell className="px-5 py-3 text-gray-500 truncate max-w-xs">{(e.course as any)?.titre_fr ?? "—"}</TableCell>
                <TableCell className="px-5 py-3 font-semibold text-gray-900">
                  {e.currency === "EUR" ? `${Number(e.amount).toFixed(0)} €` : `${Number(e.amount).toLocaleString("fr-DZ")} DA`}
                </TableCell>
                <TableCell className="px-5 py-3 text-gray-400">{new Date(e.paid_at).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <a href={`/api/invoices/${e.id}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-orange-600 hover:underline">📄 Reçu</a>
                    <RefundButton enrollmentId={e.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
