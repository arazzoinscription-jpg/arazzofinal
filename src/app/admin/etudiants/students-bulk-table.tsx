"use client";

import { useState, useTransition } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { Ban, PauseCircle, CheckCircle2, Trash2, X, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { bulkSetUserStatus, bulkDeleteUsers, bulkActivateAndInvite } from "@/app/admin/actions";

export interface StudentRowLite {
  id: string;
  nom: string;
  email: string;
  dateInscriptionText: string;
  formation: string;
  formateurNom: string | null;
  formateurEmail: string | null;
  active: boolean;
}

export function StudentsBulkTable({ rows }: { rows: StudentRowLite[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const ids = rows.map((r) => r.id);
  const allSelected = ids.length > 0 && ids.every((id) => sel.has(id));

  function toggle(id: string) {
    setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSel(() => (allSelected ? new Set() : new Set(ids)));
  }

  function applyStatus(status: "actif" | "veille" | "bloque") {
    const list = [...sel];
    if (!list.length) return;
    start(async () => {
      const res = await bulkSetUserStatus({ userIds: list, status });
      if (res.ok) { toast(`${res.count} élève(s) mis à jour ✅`, "success"); setSel(new Set()); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  function activateSelected() {
    const list = [...sel];
    if (!list.length) return;
    if (!confirm(`Activer le compte et envoyer un email de création de mot de passe à ${list.length} élève(s) ?`)) return;
    start(async () => {
      const res = await bulkActivateAndInvite(list);
      if (res.ok && res.sent) {
        const more = res.remaining ? ` · ${res.remaining} restant(s) — relancez` : "";
        toast(`Accès envoyé à ${res.sent} élève(s)${more} ✅`, res.remaining ? "info" : "success");
        setSel(new Set());
        router.refresh();
      } else toast(res.error ?? "Envoi impossible", "error");
    });
  }

  function removeSelected() {
    const list = [...sel];
    if (!list.length) return;
    if (!confirm(`Supprimer définitivement ${list.length} compte(s) élève ?\nCette action est irréversible (compte, inscriptions et données associées seront effacés).`)) return;
    start(async () => {
      const res = await bulkDeleteUsers(list);
      if (res.ok) { toast(`${res.count} compte(s) supprimé(s) ✅`, "success"); setSel(new Set()); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Barre d'actions groupées (apparaît dès qu'une sélection existe) */}
      {sel.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-violet-50 border-b border-violet-100">
          <span className="text-sm font-semibold text-violet-900 me-2">{sel.size} sélectionné(s)</span>
          <Button size="sm" disabled={pending} onClick={activateSelected}
            className="gap-2 bg-violet-600 text-white hover:bg-violet-700">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} Activer &amp; envoyer l'accès
          </Button>
          <Button size="sm" disabled={pending} onClick={() => applyStatus("bloque")}
            className="gap-2 bg-red-600 text-white hover:bg-red-700">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />} Bloquer
          </Button>
          <Button size="sm" disabled={pending} onClick={() => applyStatus("veille")}
            className="gap-2 bg-amber-500 text-white hover:bg-amber-600">
            <PauseCircle className="size-4" /> Mettre en veille
          </Button>
          <Button size="sm" disabled={pending} onClick={() => applyStatus("actif")}
            className="gap-2 bg-green-600 text-white hover:bg-green-700">
            <CheckCircle2 className="size-4" /> Réactiver
          </Button>
          <Button size="sm" variant="destructive" disabled={pending} onClick={removeSelected}
            className="gap-2 bg-gray-900 text-white hover:bg-black">
            <Trash2 className="size-4" /> Supprimer
          </Button>
          <button onClick={() => setSel(new Set())} className="ms-auto inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
            <X size={15} /> Désélectionner
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table className="w-full text-sm">
          <TableHeader className="bg-gray-50">
            <TableRow className="text-left text-gray-500 font-dm">
              <TableHead className="px-5 py-3 w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Tout sélectionner"
                  className="w-4 h-4 accent-orange-600" />
              </TableHead>
              <TableHead className="px-5 py-3 font-medium">Étudiant</TableHead>
              <TableHead className="px-5 py-3 font-medium">Formateur</TableHead>
              <TableHead className="px-5 py-3 font-medium">Date inscription</TableHead>
              <TableHead className="px-5 py-3 font-medium">Formation</TableHead>
              <TableHead className="px-5 py-3 font-medium">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-400">Aucun étudiant.</TableCell></TableRow>
            ) : rows.map((r) => {
              const checked = sel.has(r.id);
              return (
                <TableRow key={r.id} className={`font-dm align-top ${checked ? "bg-orange-50/50" : "hover:bg-gray-50"}`}>
                  <TableCell className="px-5 py-3">
                    <input type="checkbox" checked={checked} onChange={() => toggle(r.id)}
                      aria-label={`Sélectionner ${r.nom}`} className="w-4 h-4 accent-orange-600" />
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <div className="font-medium text-gray-900">{r.nom}</div>
                    <div className="text-xs text-gray-400">{r.email}</div>
                  </TableCell>
                  <TableCell className="px-5 py-3 text-gray-600">
                    {r.formateurNom ? (
                      <span>
                        {r.formateurNom}
                        {r.formateurEmail && <span className="text-gray-400 text-xs block">{r.formateurEmail}</span>}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">non assigné</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-gray-600 whitespace-nowrap">{r.dateInscriptionText}</TableCell>
                  <TableCell className="px-5 py-3">
                    {r.formation === "—" ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {r.formation.split(", ").map((part, i) => (
                          <span key={i} className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            part.startsWith("NIVEAU") ? "bg-orange-50 text-orange-700" : "bg-violet-50 text-violet-700"
                          }`}>
                            {part}
                          </span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                      r.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {r.active ? "● Actif" : "○ Inactif"}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
