import { GraduationCap, Shapes } from "lucide-react";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { createAdminClient } from "@/lib/supabase/admin";
import { RowActions } from "./row-actions";
export const metadata = { title: "Demandes de rôle — Admin" };
export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = { formateur: "Formatrice", patronniste: "Patronniste" };
const STATUT: Record<string, string> = { en_attente: "En attente", approuve: "Approuvée", refuse: "Refusée" };
const BADGE: Record<string, string> = {
  en_attente: "bg-orange-50 text-orange-700",
  approuve: "bg-green-50 text-green-700",
  refuse: "bg-gray-100 text-gray-500",
};

export default async function DemandesPage() {
  const admin = createAdminClient();
  const { data: reqs } = await admin
    .from("role_requests")
    .select("id, requested_role, statut, message, created_at, user:users!role_requests_user_id_fkey(nom, email)")
    .order("created_at", { ascending: false })
    .limit(300);

  const pending = (reqs ?? []).filter((r) => r.statut === "en_attente");
  const others = (reqs ?? []).filter((r) => r.statut !== "en_attente");

  return (
    <div className="min-h-screen bg-[#faf7ff] dark:bg-transparent p-8">
      <div className="px-4 lg:px-8 py-6 text-gray-900 dark:text-white">
        <h1 className="font-playfair text-3xl font-bold mb-1">Demandes de rôle</h1>
        <p className="text-gray-500 dark:text-white/50 mb-6">{pending.length} demande(s) en attente.</p>

        <div className="space-y-3 mb-10">
          {!pending.length ? (
            <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-gray-100 dark:border-white/10 p-10 text-center text-gray-400">
              Aucune demande en attente.
            </div>
          ) : (
            pending.map((r) => {
              const u = r.user as { nom?: string; email?: string } | null;
              const Icon = r.requested_role === "patronniste" ? Shapes : GraduationCap;
              return (
                <div key={r.id} className="rounded-2xl bg-white dark:bg-white/[0.04] border border-gray-100 dark:border-white/10 p-4 flex flex-wrap items-center gap-4">
                  <span className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300 flex items-center justify-center"><Icon size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{u?.nom ?? "—"} <span className="text-gray-400 font-normal">· {u?.email}</span></div>
                    <div className="text-sm text-gray-500 dark:text-white/50">
                      Souhaite devenir <strong>{ROLE_LABEL[r.requested_role]}</strong> · {new Date(r.created_at).toLocaleDateString("fr-FR")}
                    </div>
                    {r.message && <p className="text-sm text-gray-400 italic mt-1">« {r.message} »</p>}
                  </div>
                  <RowActions id={r.id} />
                </div>
              );
            })
          )}
        </div>

        {others.length > 0 && (
          <>
            <h2 className="font-semibold mb-3">Historique</h2>
            <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-gray-100 dark:border-white/10 overflow-hidden">
              <Table className="w-full text-sm">
                <TableBody className="divide-y divide-gray-50 dark:divide-white/5">
                  {others.map((r) => {
                    const u = r.user as { nom?: string; email?: string } | null;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="px-4 py-3">{u?.nom ?? "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 dark:text-white/50">{ROLE_LABEL[r.requested_role]}</TableCell>
                        <TableCell className="px-4 py-3">
                          <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${BADGE[r.statut]}`}>{STATUT[r.statut]}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-400 text-end">{new Date(r.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
