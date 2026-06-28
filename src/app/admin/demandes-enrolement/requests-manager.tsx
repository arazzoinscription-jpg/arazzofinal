"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, Loader2, Users } from "lucide-react";
import { bulkEnrollRequests, dismissEnrollmentRequest } from "../actions";
import { toast } from "@/components/ui/toast";

export interface ReqRow {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
}
export interface CourseGroup {
  courseId: string;
  courseTitle: string;
  pending: number;
  rows: ReqRow[];
}

/** Gestion des demandes d'enrôlement par formation : sélection + enrôlement en masse. */
export function RequestsManager({ groups }: { groups: CourseGroup[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  function toggle(id: string) {
    setSel((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleGroup(rows: ReqRow[], on: boolean) {
    setSel((prev) => {
      const next = new Set(prev);
      for (const r of rows) { if (r.status === "pending") on ? next.add(r.id) : next.delete(r.id); }
      return next;
    });
  }

  function enroll(ids: string[]) {
    if (!ids.length) { toast("Sélectionnez au moins une demande", "error"); return; }
    if (!confirm(`Enrôler ${ids.length} personne(s) dans cette formation ?`)) return;
    start(async () => {
      const res = await bulkEnrollRequests(ids);
      if (res.ok) {
        toast(`${res.enrolled} enrôlé(s)${res.skipped ? `, ${res.skipped} ignoré(s)` : ""} ✅`, "success");
        setSel(new Set());
        router.refresh();
      } else toast(res.error ?? "Erreur", "error");
    });
  }

  function dismiss(id: string) {
    start(async () => {
      const res = await dismissEnrollmentRequest(id);
      if (res.ok) router.refresh();
      else toast(res.error ?? "Erreur", "error");
    });
  }

  if (!groups.length) {
    return <p className="text-gray-400 font-dm py-10 text-center">Aucune demande d'enrôlement pour l'instant.</p>;
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => {
        const pendingRows = g.rows.filter((r) => r.status === "pending");
        const groupSelected = pendingRows.filter((r) => sel.has(r.id)).map((r) => r.id);
        const allOn = pendingRows.length > 0 && groupSelected.length === pendingRows.length;
        return (
          <div key={g.courseId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-gray-50 border-b border-gray-100">
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900 truncate">{g.courseTitle}</h2>
                <p className="text-xs text-gray-500 font-dm inline-flex items-center gap-1.5">
                  <Users size={12} /> {g.pending} en attente · {g.rows.length} demande(s) au total
                </p>
              </div>
              <button
                onClick={() => enroll(groupSelected)}
                disabled={pending || groupSelected.length === 0}
                className="shrink-0 inline-flex items-center gap-2 bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-800 disabled:opacity-40 transition-colors">
                {pending ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                Enrôler la sélection ({groupSelected.length})
              </button>
            </div>

            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 font-dm bg-white">
                <tr className="border-b border-gray-50">
                  <th className="px-5 py-2.5 w-10">
                    <input type="checkbox" checked={allOn} onChange={(e) => toggleGroup(pendingRows, e.target.checked)} />
                  </th>
                  <th className="px-2 py-2.5 font-medium">Nom</th>
                  <th className="px-2 py-2.5 font-medium">Email</th>
                  <th className="px-2 py-2.5 font-medium">Téléphone</th>
                  <th className="px-2 py-2.5 font-medium">Statut</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-dm">
                {g.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-5 py-2.5">
                      {r.status === "pending" && (
                        <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} />
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-gray-900">{r.full_name ?? "—"}</td>
                    <td className="px-2 py-2.5 text-gray-600">{r.email}</td>
                    <td className="px-2 py-2.5 text-gray-500">{r.phone ?? "—"}</td>
                    <td className="px-2 py-2.5">
                      {r.status === "enrolled" ? (
                        <span className="text-green-600 font-semibold text-xs">✓ Enrôlé</span>
                      ) : r.status === "dismissed" ? (
                        <span className="text-gray-400 text-xs">Écarté</span>
                      ) : (
                        <span className="text-orange-600 text-xs font-semibold">En attente</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      {r.status === "pending" && (
                        <button onClick={() => dismiss(r.id)} disabled={pending} title="Écarter"
                          className="text-gray-400 hover:text-red-500 transition-colors">
                          <X size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
