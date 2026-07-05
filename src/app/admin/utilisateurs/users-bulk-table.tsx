"use client";

import { useState, useTransition } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { Ban, PauseCircle, CheckCircle2, Trash2, X, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { bulkSetUserStatus, bulkDeleteUsers, bulkActivateAndInvite } from "@/app/admin/actions";
import { RoleSelect } from "./role-select";
import { UserActions, StatusBadge } from "./user-actions";

type Status = "actif" | "veille" | "bloque";

export interface UserRowLite {
  id: string;
  nom: string;
  email: string;
  ville: string | null;
  pays: string | null;
  points: number;
  role: string;
  roles: string[];
  status: Status;
  isAdmin: boolean;
}

export function UsersBulkTable({ rows }: { rows: UserRowLite[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  // Les comptes admin ne sont pas sélectionnables (on évite de se bloquer/supprimer soi-même).
  const selectableIds = rows.filter((r) => !r.isAdmin).map((r) => r.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => sel.has(id));

  function toggle(id: string) {
    setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSel(() => (allSelected ? new Set() : new Set(selectableIds)));
  }

  function applyStatus(status: Status) {
    const list = [...sel];
    if (!list.length) return;
    start(async () => {
      const res = await bulkSetUserStatus({ userIds: list, status });
      if (res.ok) { toast(`${res.count} compte(s) mis à jour ✅`, "success"); setSel(new Set()); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  function activateSelected() {
    const list = [...sel];
    if (!list.length) return;
    if (!confirm(`Activer le compte et envoyer le lien d'activation (création de mot de passe) à ${list.length} personne(s) ?`)) return;
    start(async () => {
      const res = await bulkActivateAndInvite(list);
      if (res.ok && res.sent) {
        const more = res.remaining ? ` · ${res.remaining} restant(s) — relancez` : "";
        toast(`Lien d'activation envoyé à ${res.sent} personne(s)${more} ✅`, res.remaining ? "info" : "success");
        setSel(new Set());
        router.refresh();
      } else toast(res.error ?? "Envoi impossible", "error");
    });
  }

  function removeSelected() {
    const list = [...sel];
    if (!list.length) return;
    if (!confirm(`Supprimer définitivement ${list.length} compte(s) ?\nCette action est irréversible (compte, inscriptions et données associées seront effacés).`)) return;
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
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} Activer &amp; envoyer le lien
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
              <TableHead className="px-5 py-3 font-medium">Utilisatrice</TableHead>
              <TableHead className="px-5 py-3 font-medium">Localisation</TableHead>
              <TableHead className="px-5 py-3 font-medium">Points</TableHead>
              <TableHead className="px-5 py-3 font-medium">Rôle</TableHead>
              <TableHead className="px-5 py-3 font-medium">Statut</TableHead>
              <TableHead className="px-5 py-3 font-medium text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">Aucun utilisateur.</TableCell></TableRow>
            ) : rows.map((u) => {
              const checked = sel.has(u.id);
              return (
                <TableRow key={u.id} className={`font-dm ${checked ? "bg-orange-50/50" : "hover:bg-gray-50"}`}>
                  <TableCell className="px-5 py-3">
                    {u.isAdmin ? (
                      <span className="inline-block w-4 h-4" aria-hidden />
                    ) : (
                      <input type="checkbox" checked={checked} onChange={() => toggle(u.id)}
                        aria-label={`Sélectionner ${u.nom}`} className="w-4 h-4 accent-orange-600" />
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <div className="font-medium text-gray-900">{u.nom}</div>
                    <div className="text-xs text-gray-400">{u.email}</div>
                  </TableCell>
                  <TableCell className="px-5 py-3 text-gray-500">{u.ville ? `${u.ville}, ${u.pays}` : u.pays ?? "—"}</TableCell>
                  <TableCell className="px-5 py-3 text-gray-500">{u.points}</TableCell>
                  <TableCell className="px-5 py-3"><RoleSelect userId={u.id} roles={u.roles} /></TableCell>
                  <TableCell className="px-5 py-3"><StatusBadge status={u.status} /></TableCell>
                  <TableCell className="px-5 py-3 text-end"><UserActions userId={u.id} status={u.status} isAdmin={u.isAdmin} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
