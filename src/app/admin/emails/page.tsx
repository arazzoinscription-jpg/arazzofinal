import { createAdminClient } from "@/lib/supabase/admin";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
export const metadata = { title: "Emails — Admin" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  sent: { label: "Envoyé", cls: "bg-green-100 text-green-700" },
  skipped: { label: "Ignoré (opt-out)", cls: "bg-gray-100 text-gray-500" },
  failed: { label: "Échec", cls: "bg-red-100 text-red-700" },
};

export default async function AdminEmailsPage({ searchParams }: { searchParams: { q?: string; category?: string } }) {
  const admin = createAdminClient();
  const q = (searchParams.q ?? "").trim();
  const category = (searchParams.category ?? "").trim();

  let query = admin
    .from("email_log")
    .select("to_email, category, subject, status, error, created_at")
    .order("created_at", { ascending: false });
  if (q) query = query.ilike("to_email", `%${q}%`);
  if (category) query = query.eq("category", category);
  const { data: logs } = await query.limit(200);

  const counts: Record<string, number> = { sent: 0, skipped: 0, failed: 0 };
  (logs ?? []).forEach((l) => { counts[l.status] = (counts[l.status] ?? 0) + 1; });

  return (
    <div className="px-4 lg:px-8 py-6">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Journal des emails</h1>
      <p className="text-gray-500 mb-6 font-dm">Traçabilité de tous les envois (et opt-out respectés).</p>

      {/* Recherche par destinataire + filtre catégorie */}
      <form className="flex flex-wrap gap-3 mb-6">
        <input name="q" defaultValue={q} placeholder="Rechercher un destinataire (email)…"
          className="flex-1 min-w-56 border border-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <select name="category" defaultValue={category} className="border border-gray-100 rounded-xl px-4 py-2.5 bg-white">
          <option value="">Toutes catégories</option>
          <option value="prospect">Prospect (séquence)</option>
          <option value="welcome">Bienvenue / compte</option>
          <option value="purchases">Achats</option>
          <option value="reactivation">Réactivation</option>
          <option value="announcements">Annonces</option>
          <option value="certificates">Certificats</option>
        </select>
        <button className="bg-orange-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-700">Filtrer</button>
      </form>

      <div className="flex flex-wrap gap-3 mb-6">
        {Object.entries(STATUS).map(([k, v]) => (
          <div key={k} className="bg-white rounded-xl px-4 py-2 border border-gray-100 text-sm font-dm">
            {v.label} : <strong>{counts[k] ?? 0}</strong>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <Table className="w-full text-sm">
          <TableHeader className="bg-gray-50">
            <TableRow className="text-left text-gray-500 font-dm">
              <TableHead className="px-5 py-3 font-medium">Destinataire</TableHead>
              <TableHead className="px-5 py-3 font-medium">Catégorie</TableHead>
              <TableHead className="px-5 py-3 font-medium">Sujet</TableHead>
              <TableHead className="px-5 py-3 font-medium">Statut</TableHead>
              <TableHead className="px-5 py-3 font-medium">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            {!logs?.length ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-gray-400">Aucun email envoyé.</TableCell></TableRow>
            ) : logs.map((l, i) => (
              <TableRow key={i} className="hover:bg-gray-50 font-dm">
                <TableCell className="px-5 py-3 text-gray-700">{l.to_email}</TableCell>
                <TableCell className="px-5 py-3 text-gray-500">{l.category}</TableCell>
                <TableCell className="px-5 py-3 text-gray-500 truncate max-w-xs">{l.subject}</TableCell>
                <TableCell className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS[l.status]?.cls}`}>{STATUS[l.status]?.label}</span></TableCell>
                <TableCell className="px-5 py-3 text-gray-400 whitespace-nowrap">{new Date(l.created_at).toLocaleDateString("fr-FR")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
