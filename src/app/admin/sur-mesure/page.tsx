import { Ruler } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Commandes sur mesure — Admin" };
export const dynamic = "force-dynamic";

const STATUT_BADGE: Record<string, string> = {
  en_attente: "bg-orange-100 text-orange-700",
  en_cours: "bg-violet-100 text-violet-700",
  termine: "bg-green-100 text-green-700",
  annule: "bg-gray-100 text-gray-500",
};
const DAY_MS = 24 * 60 * 60 * 1000;

export default async function AdminSurMesurePage() {
  const admin = createAdminClient();
  const { data: orders } = await admin
    .from("patron_custom_orders")
    .select("id, titre, statut, created_at, claimed_at, photo_url, video_url, patronniste_id, client:users!patron_custom_orders_client_id_fkey(nom, email), responsable:users!patron_custom_orders_patronniste_id_fkey(nom, email)")
    .order("created_at", { ascending: false })
    .limit(500);

  const list = orders ?? [];
  const waiting = list.filter((o) => !o.patronniste_id && o.statut === "en_attente").length;
  const overdue = list.filter((o) => !o.patronniste_id && o.statut === "en_attente" && Date.now() - new Date(o.created_at).getTime() > DAY_MS).length;

  return (
    <div className="px-4 lg:px-8 py-6">
      <div className="flex items-center gap-3 mb-1">
        <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-orange-600">Patronnage</span>
      </div>
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Commandes sur mesure</h1>
      <p className="text-gray-500 mb-6 font-dm">
        {list.length} commande(s) · {waiting} en attente · <span className="text-red-600 font-semibold">{overdue} en retard (+24 h)</span>
      </p>

      {list.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-100 p-12 text-center text-gray-400">
          <Ruler size={32} className="mx-auto mb-3 opacity-40" /> Aucune commande sur mesure.
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
          <Table className="w-full">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="text-left px-5 py-3 text-sm text-gray-500">Modèle</TableHead>
                <TableHead className="text-left px-5 py-3 text-sm text-gray-500">Cliente</TableHead>
                <TableHead className="text-left px-5 py-3 text-sm text-gray-500">Médias</TableHead>
                <TableHead className="text-left px-5 py-3 text-sm text-gray-500">Statut</TableHead>
                <TableHead className="text-left px-5 py-3 text-sm text-gray-500">Responsable</TableHead>
                <TableHead className="text-left px-5 py-3 text-sm text-gray-500">Reçue le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100">
              {list.map((o) => {
                const client = o.client as { nom?: string; email?: string } | null;
                const responsable = o.responsable as { nom?: string; email?: string } | null;
                const overdueRow = !o.patronniste_id && o.statut === "en_attente" && Date.now() - new Date(o.created_at).getTime() > DAY_MS;
                return (
                  <TableRow key={o.id} className="hover:bg-gray-50">
                    <TableCell className="px-5 py-3 font-medium text-gray-900">{o.titre}</TableCell>
                    <TableCell className="px-5 py-3 text-sm text-gray-600">{client?.nom ?? "—"}<br /><span className="text-xs text-gray-400">{client?.email}</span></TableCell>
                    <TableCell className="px-5 py-3 text-sm">
                      <div className="flex gap-1">
                        {o.photo_url && <a href={o.photo_url} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">photo</a>}
                        {o.photo_url && o.video_url && <span className="text-gray-300">·</span>}
                        {o.video_url && <a href={o.video_url} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">vidéo</a>}
                        {!o.photo_url && !o.video_url && <span className="text-gray-300">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${STATUT_BADGE[o.statut] ?? ""}`}>{o.statut.replace("_", " ")}</span>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-sm">
                      {responsable ? (
                        <span className="font-medium text-violet-700">{responsable.nom ?? responsable.email}</span>
                      ) : overdueRow ? (
                        <span className="text-red-600 font-semibold">Personne · en retard</span>
                      ) : (
                        <span className="text-gray-400">En attente d'une patronniste</span>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-sm text-gray-500">{new Date(o.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
