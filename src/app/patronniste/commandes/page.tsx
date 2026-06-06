import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Commandes clients — Patronniste" };
export const dynamic = "force-dynamic";

export default async function CommandesPage() {
  const admin = createAdminClient();
  const { data: achats } = await admin
    .from("patron_purchases")
    .select("id, paid_at, client:users(nom, email), patron:patrons(titre, prix_dzd)")
    .order("paid_at", { ascending: false })
    .limit(200);

  return (
    <div className="text-gray-900 dark:text-white">
      <h1 className="font-playfair text-3xl font-bold mb-1">Achats clients</h1>
      <p className="text-gray-500 dark:text-white/50 mb-6">{achats?.length ?? 0} achat(s) de patrons.</p>

      <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 overflow-hidden">
        {!achats?.length ? (
          <div className="p-12 text-center text-gray-400">Aucun achat pour l'instant.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream-100 dark:bg-white/5 text-gray-500 dark:text-white/50 text-xs uppercase">
                <tr>
                  <th className="text-start font-semibold px-4 py-3">Client</th>
                  <th className="text-start font-semibold px-4 py-3">Patron</th>
                  <th className="text-start font-semibold px-4 py-3">Prix</th>
                  <th className="text-start font-semibold px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100 dark:divide-white/5">
                {achats.map((a) => {
                  const client = a.client as { nom?: string; email?: string } | null;
                  const patron = a.patron as { titre?: string; prix_dzd?: number } | null;
                  return (
                    <tr key={a.id} className="hover:bg-cream-50 dark:hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <div className="font-medium">{client?.nom ?? "—"}</div>
                        <div className="text-xs text-gray-400">{client?.email}</div>
                      </td>
                      <td className="px-4 py-3">{patron?.titre ?? "—"}</td>
                      <td className="px-4 py-3 font-semibold text-orange-DEFAULT">{(patron?.prix_dzd ?? 0).toLocaleString("fr-DZ")} DA</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-white/50">{new Date(a.paid_at).toLocaleDateString("fr-FR")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
