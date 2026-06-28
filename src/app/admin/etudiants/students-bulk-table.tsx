"use client";

import { useMemo, useState, useTransition } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { Ban, PauseCircle, CheckCircle2, Trash2, X, Loader2, Mail, UserX, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { bulkSetUserStatus, bulkDeleteUsers, bulkActivateAndInvite, cancelStudentEnrollments } from "@/app/admin/actions";

export type AccessStatus = "none" | "valid" | "used" | "expired";

export interface StudentRowLite {
  id: string;
  nom: string;
  email: string;
  dateInscriptionText: string;
  dateInscriptionIso: string | null;
  formation: string;
  formateurNom: string | null;
  formateurEmail: string | null;
  active: boolean;
  accessStatus: AccessStatus;
}

type SortKey = "date_desc" | "date_asc" | "nom_asc" | "nom_desc";
type ActiveFilter = "all" | "active" | "inactive";
type AccessFilter = "all" | AccessStatus;

const ACCESS_META: Record<AccessStatus, { label: string; cls: string }> = {
  none: { label: "Non envoyé", cls: "bg-gray-100 text-gray-500" },
  valid: { label: "Envoyé · valable", cls: "bg-blue-100 text-blue-700" },
  used: { label: "Utilisé ✓", cls: "bg-green-100 text-green-700" },
  expired: { label: "Expiré", cls: "bg-red-100 text-red-700" },
};

export function StudentsBulkTable({ rows }: { rows: StudentRowLite[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  // ── Tri & filtres (côté client, sur les lignes déjà chargées) ──────────────
  const [sort, setSort] = useState<SortKey>("date_desc");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");

  const view = useMemo(() => {
    let r = rows.filter((row) => {
      if (activeFilter === "active" && !row.active) return false;
      if (activeFilter === "inactive" && row.active) return false;
      if (accessFilter !== "all" && row.accessStatus !== accessFilter) return false;
      return true;
    });
    const ts = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);
    r = [...r].sort((a, b) => {
      switch (sort) {
        case "nom_asc": return a.nom.localeCompare(b.nom, "fr");
        case "nom_desc": return b.nom.localeCompare(a.nom, "fr");
        case "date_asc": return ts(a.dateInscriptionIso) - ts(b.dateInscriptionIso);
        default: return ts(b.dateInscriptionIso) - ts(a.dateInscriptionIso);
      }
    });
    return r;
  }, [rows, sort, activeFilter, accessFilter]);

  const ids = view.map((r) => r.id);
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

  function cancelEnrollment(r: StudentRowLite) {
    if (!confirm(`Annuler l'inscription de ${r.nom} ?\nL'élève perdra l'accès à ses cours (le compte est conservé).`)) return;
    start(async () => {
      const res = await cancelStudentEnrollments(r.id);
      if (res.ok) { toast(`Inscription annulée (${res.count ?? 0} cours retiré(s)) ✅`, "success"); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  const selCls = "border border-gray-200 rounded-xl px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Barre de tri / filtres */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/60">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 me-1">
          <ArrowUpDown size={15} /> Trier / filtrer
        </span>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={selCls} aria-label="Trier">
          <option value="date_desc">Inscription : plus récents</option>
          <option value="date_asc">Inscription : plus anciens</option>
          <option value="nom_asc">Nom : A → Z</option>
          <option value="nom_desc">Nom : Z → A</option>
        </select>
        <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)} className={selCls} aria-label="Filtrer actif">
          <option value="all">Tous (actifs + inactifs)</option>
          <option value="active">Actifs seulement</option>
          <option value="inactive">Inactifs seulement</option>
        </select>
        <select value={accessFilter} onChange={(e) => setAccessFilter(e.target.value as AccessFilter)} className={selCls} aria-label="Filtrer accès">
          <option value="all">Tous les accès</option>
          <option value="none">Accès non envoyé</option>
          <option value="valid">Accès envoyé · valable</option>
          <option value="used">Accès utilisé</option>
          <option value="expired">Accès expiré</option>
        </select>
        <span className="ms-auto text-xs text-gray-400 font-dm">{view.length} affiché(s)</span>
      </div>

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
              <TableHead className="px-5 py-3 font-medium">Accès envoyé</TableHead>
              <TableHead className="px-5 py-3 font-medium">Statut</TableHead>
              <TableHead className="px-5 py-3 font-medium text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            {view.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-gray-400">Aucun étudiant.</TableCell></TableRow>
            ) : view.map((r) => {
              const checked = sel.has(r.id);
              const acc = ACCESS_META[r.accessStatus];
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
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${acc.cls}`}>
                      {acc.label}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                      r.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {r.active ? "● Actif" : "○ Inactif"}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-3 text-right">
                    <button onClick={() => cancelEnrollment(r)} disabled={pending}
                      title="Annuler l'inscription (retire l'accès aux cours, garde le compte)"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50">
                      <UserX size={14} /> Annuler
                    </button>
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
