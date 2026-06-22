"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserX } from "lucide-react";
import { bulkCancelEnrollment } from "./actions";
import { StudentActions, StudentStatusBadge } from "./student-actions";
import { toast } from "@/components/ui/toast";

type Status = "actif" | "veille" | "bloque";
export interface EnrolledRow {
  id: string;
  userId: string;
  nom: string;
  email: string;
  amount: number;
  currency: string;
  paidAt: string;
  status: Status;
}

/** Tableau des inscrits avec sélection multiple + désinscription en masse. */
export function EnrolledStudentsTable({ courseId, rows }: { courseId: string; rows: EnrolledRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const allChecked = rows.length > 0 && selected.size === rows.length;
  const someChecked = selected.size > 0 && !allChecked;

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.userId)));
  }
  function toggle(userId: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(userId) ? n.delete(userId) : n.add(userId);
      return n;
    });
  }

  function removeSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Désinscrire ${selected.size} élève(s) de ce cours ? Cette action est irréversible.`)) return;
    start(async () => {
      const res = await bulkCancelEnrollment(courseId, [...selected]);
      if (res.ok) {
        toast(`${res.removed} élève(s) désinscrite(s) ✓`, "success");
        setSelected(new Set());
        router.refresh();
      } else {
        toast(res.error ?? "Erreur", "error");
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Barre d'actions de sélection */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50">
        <span className="text-sm text-gray-600 font-dm">
          {selected.size > 0 ? `${selected.size} sélectionnée(s)` : `${rows.length} inscrit(s)`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={removeSelected}
            disabled={selected.size === 0 || pending}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? <Loader2 size={15} className="animate-spin" /> : <UserX size={15} />} Désinscrire la sélection
          </button>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left text-gray-500 font-dm">
            <th className="px-5 py-3 w-10">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => { if (el) el.indeterminate = someChecked; }}
                onChange={toggleAll}
                aria-label="Tout sélectionner"
                className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
              />
            </th>
            <th className="px-5 py-3 font-medium">Étudiant</th>
            <th className="px-5 py-3 font-medium">Date d'inscription</th>
            <th className="px-5 py-3 font-medium">Montant</th>
            <th className="px-5 py-3 font-medium text-end">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((e) => {
            const checked = selected.has(e.userId);
            return (
              <tr key={e.id} className={`font-dm transition-colors ${checked ? "bg-violet-50" : "hover:bg-gray-50"}`}>
                <td className="px-5 py-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(e.userId)}
                    aria-label={`Sélectionner ${e.nom}`}
                    className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                  />
                </td>
                <td className="px-5 py-3">
                  <div className="font-medium text-gray-900">{e.nom}<StudentStatusBadge status={e.status} /></div>
                  <div className="text-xs text-gray-400">{e.email}</div>
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {new Date(e.paidAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {e.currency === "DZD" ? `${Number(e.amount).toLocaleString("fr-DZ")} DA` : `${Number(e.amount).toFixed(0)} €`}
                </td>
                <td className="px-5 py-3 text-end">
                  <StudentActions courseId={courseId} userId={e.userId} status={e.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
