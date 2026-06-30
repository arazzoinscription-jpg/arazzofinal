import { Ruler, LayoutGrid } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminOrderActions } from "./order-actions";
import { orderType, SUR_MESURE } from "@/app/dashboard/sur-mesure/constants";

export const metadata = { title: "Commandes sur mesure — Admin" };
export const dynamic = "force-dynamic";

const STATUT_BADGE: Record<string, string> = {
  price_requested: "bg-gray-100 text-gray-600",
  price_proposed: "bg-orange-100 text-orange-700",
  refused: "bg-gray-100 text-gray-500",
  awaiting_patronniste: "bg-blue-100 text-blue-700",
  en_cours: "bg-violet-100 text-violet-700",
  delivered: "bg-amber-100 text-amber-700",
  payment_review: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  annule: "bg-gray-100 text-gray-500",
  en_attente: "bg-orange-100 text-orange-700",
  termine: "bg-green-100 text-green-700",
};
const STATUT_LABEL: Record<string, string> = {
  price_requested: "prix demandé", price_proposed: "prix proposé", refused: "refusé",
  awaiting_patronniste: "disponible", en_cours: "en cours", delivered: "livré",
  payment_review: "paiement à valider", completed: "terminé", annule: "annulé",
};

export default async function AdminSurMesurePage() {
  const admin = createAdminClient();
  const { data: orders } = await admin
    .from("patron_custom_orders")
    .select("id, titre, note, mesures, statut, proposed_price_dzd, payment_proof_path, file_path, created_at, claimed_at, photo_url, video_url, patronniste_id, client:users!patron_custom_orders_client_id_fkey(nom, email), responsable:users!patron_custom_orders_patronniste_id_fkey(nom, email)")
    .order("created_at", { ascending: false })
    .limit(500);

  const list = orders ?? [];
  const toPrice = list.filter((o) => o.statut === "price_requested").length;
  const toApprove = list.filter((o) => o.statut === "payment_review").length;

  return (
    <div className="px-4 lg:px-8 py-6">
      <div className="flex items-center gap-3 mb-1">
        <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-orange-600">Patronnage</span>
      </div>
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Commandes sur mesure</h1>
      <p className="text-gray-500 mb-6 font-dm">
        {list.length} commande(s) · <span className="text-orange-600 font-semibold">{toPrice} prix à proposer</span> · <span className="text-blue-600 font-semibold">{toApprove} paiement(s) à valider</span>
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
                <TableHead className="text-left px-5 py-3 text-sm text-gray-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100">
              {list.map((o) => {
                const client = o.client as { nom?: string; email?: string } | null;
                const responsable = o.responsable as { nom?: string; email?: string } | null;
                const type = orderType(o as any);
                const TypeIcon = type === "placement" ? LayoutGrid : Ruler;
                return (
                  <TableRow key={o.id} className="hover:bg-gray-50">
                    <TableCell className="px-5 py-3 font-medium text-gray-900">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-1 ${type === "placement" ? "bg-violet-100 text-violet-700" : "bg-orange-100 text-orange-700"}`}>
                        <TypeIcon size={11} /> {SUR_MESURE[type].short}
                      </span>
                      <div>{o.titre}</div>
                    </TableCell>
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
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${STATUT_BADGE[o.statut] ?? ""}`}>{STATUT_LABEL[o.statut] ?? o.statut}</span>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-sm">
                      {responsable ? (
                        <span className="font-medium text-violet-700">{responsable.nom ?? responsable.email}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-sm text-gray-500">{new Date(o.created_at).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="px-5 py-3">
                      <AdminOrderActions
                        orderId={o.id}
                        statut={o.statut}
                        proposedPrice={(o as any).proposed_price_dzd ?? null}
                        hasProof={!!(o as any).payment_proof_path}
                        hasFile={!!(o as any).file_path}
                        isPlacementPatron={((o as any).mesures ?? {}).kind === "placement_patron"}
                        paperPrice={((o as any).mesures ?? {}).prix_papier_dzd ?? null}
                        paperDelivery={(() => {
                          const md = ((o as any).mesures ?? {});
                          return md.kind === "placement_patron" && md.format_choisi === "papier" && md.livraison
                            ? { statut: md.livraison_statut, nom: md.livraison?.nom, wilaya: md.livraison?.wilaya }
                            : null;
                        })()}
                      />
                    </TableCell>
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
