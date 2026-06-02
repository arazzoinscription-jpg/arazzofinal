import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Emails — Admin" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  sent: { label: "Envoyé", cls: "bg-green-100 text-green-700" },
  skipped: { label: "Ignoré (opt-out)", cls: "bg-gray-100 text-gray-500" },
  failed: { label: "Échec", cls: "bg-red-100 text-red-700" },
};

export default async function AdminEmailsPage() {
  const admin = createAdminClient();
  const { data: logs } = await admin
    .from("email_log")
    .select("to_email, category, subject, status, created_at")
    .order("created_at", { ascending: false })
    .limit(80);

  const counts: Record<string, number> = { sent: 0, skipped: 0, failed: 0 };
  (logs ?? []).forEach((l) => { counts[l.status] = (counts[l.status] ?? 0) + 1; });

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Journal des emails</h1>
      <p className="text-gray-500 mb-6 font-dm">Traçabilité de tous les envois (et opt-out respectés).</p>

      <div className="flex flex-wrap gap-3 mb-6">
        {Object.entries(STATUS).map(([k, v]) => (
          <div key={k} className="bg-white rounded-xl px-4 py-2 border border-cream-200 text-sm font-dm">
            {v.label} : <strong>{counts[k] ?? 0}</strong>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream-50">
            <tr className="text-left text-gray-500 font-dm">
              <th className="px-5 py-3 font-medium">Destinataire</th>
              <th className="px-5 py-3 font-medium">Catégorie</th>
              <th className="px-5 py-3 font-medium">Sujet</th>
              <th className="px-5 py-3 font-medium">Statut</th>
              <th className="px-5 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-100">
            {!logs?.length ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Aucun email envoyé.</td></tr>
            ) : logs.map((l, i) => (
              <tr key={i} className="hover:bg-cream-50 font-dm">
                <td className="px-5 py-3 text-gray-700">{l.to_email}</td>
                <td className="px-5 py-3 text-gray-500">{l.category}</td>
                <td className="px-5 py-3 text-gray-500 truncate max-w-xs">{l.subject}</td>
                <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS[l.status]?.cls}`}>{STATUS[l.status]?.label}</span></td>
                <td className="px-5 py-3 text-gray-400 whitespace-nowrap">{new Date(l.created_at).toLocaleDateString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
