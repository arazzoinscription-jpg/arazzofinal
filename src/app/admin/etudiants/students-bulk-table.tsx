"use client";

import { useMemo, useState, useTransition } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { Ban, PauseCircle, CheckCircle2, Trash2, X, Loader2, Mail, UserX, ArrowUpDown, BellRing, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { bulkSetUserStatus, bulkDeleteUsers, bulkActivateAndInvite, cancelStudentEnrollments, remindSubscriber } from "@/app/admin/actions";
import { extendTelegramProofDeadline } from "@/app/dashboard/telegram-proof-actions";

export type AccessStatus = "none" | "valid" | "used" | "expired";
export type StatusKind = "bloque" | "preuve_bloque" | "veille" | "non_active" | "preuve_attente" | "actif";

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
  statusKind: StatusKind;
  proofDaysLeft: number | null;
  canExtendProof: boolean;
  accessStatus: AccessStatus;
  payType: "abonnement" | "total";
  paidMonths: number;
  totalMonths: number;
  isPack: boolean;
}

type SortKey = "date_desc" | "date_asc" | "nom_asc" | "nom_desc";
type StatusFilter = "all" | StatusKind;
type AccessFilter = "all" | AccessStatus;

const ACCESS_META: Record<AccessStatus, { label: string; cls: string }> = {
  none: { label: "Non envoyé", cls: "bg-gray-100 text-gray-500" },
  valid: { label: "Envoyé · valable", cls: "bg-blue-100 text-blue-700" },
  used: { label: "Utilisé ✓", cls: "bg-green-100 text-green-700" },
  expired: { label: "Expiré", cls: "bg-red-100 text-red-700" },
};

// Statut RÉEL du compte : ● dot + libellé + couleur. Le rouge = compte bloqué.
const STATUS_META: Record<StatusKind, { label: string; cls: string; dot: string }> = {
  actif:          { label: "Actif",              cls: "bg-green-100 text-green-700",  dot: "🟢" },
  non_active:     { label: "Non activé",         cls: "bg-gray-100 text-gray-500",    dot: "⚪" },
  veille:         { label: "En veille",          cls: "bg-amber-100 text-amber-700",  dot: "🟠" },
  preuve_attente: { label: "Preuve en attente",  cls: "bg-yellow-100 text-yellow-800", dot: "🟡" },
  bloque:         { label: "Bloqué (manuel)",    cls: "bg-red-100 text-red-700",      dot: "🔴" },
  preuve_bloque:  { label: "Bloqué — preuve manquante", cls: "bg-red-100 text-red-700", dot: "🔴" },
};

export function StudentsBulkTable({ rows }: { rows: StudentRowLite[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  // ── Tri & filtres (côté client, sur les lignes déjà chargées) ──────────────
  const [sort, setSort] = useState<SortKey>("date_desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");

  const view = useMemo(() => {
    let r = rows.filter((row) => {
      if (statusFilter === "bloque" && row.statusKind !== "bloque" && row.statusKind !== "preuve_bloque") return false;
      if (statusFilter !== "all" && statusFilter !== "bloque" && row.statusKind !== statusFilter) return false;
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
  }, [rows, sort, statusFilter, accessFilter]);

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

  function remind(r: StudentRowLite) {
    start(async () => {
      const res = await remindSubscriber(r.id);
      if (res.ok) toast(`Rappel d'échéance envoyé à ${r.nom} 🔔`, "success");
      else toast(res.error ?? "Envoi impossible", "error");
    });
  }

  // Repart pour 7 jours pleins : débloque un compte bloqué faute de preuve
  // ET prolonge l'attente. S'applique à un élève (row) ou à la sélection.
  function extendProof(r: StudentRowLite) {
    if (!confirm(`Prolonger le délai de preuve de ${r.nom} ?\nSon compte repart pour 7 jours pleins et est débloqué immédiatement.`)) return;
    start(async () => {
      const res = await extendTelegramProofDeadline([r.id]);
      if (res.ok) { toast(`Délai de preuve prolongé pour ${r.nom} (7 jours) ✅`, "success"); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }
  function extendProofSelected() {
    const list = [...sel];
    if (!list.length) return;
    if (!confirm(`Prolonger le délai de preuve de ${list.length} élève(s) ?\nLeurs comptes repartent pour 7 jours pleins et sont débloqués.`)) return;
    start(async () => {
      const res = await extendTelegramProofDeadline(list);
      if (res.ok) { toast(`${res.count} délai(s) de preuve prolongé(s) ✅`, "success"); setSel(new Set()); router.refresh(); }
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
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className={selCls} aria-label="Filtrer par statut">
          <option value="all">Tous les statuts</option>
          <option value="actif">🟢 Actifs</option>
          <option value="non_active">⚪ Non activés</option>
          <option value="veille">🟠 En veille</option>
          <option value="preuve_attente">🟡 Preuve en attente</option>
          <option value="bloque">🔴 Bloqués (manuel + preuve)</option>
          <option value="preuve_bloque">🔴 Bloqués — preuve manquante</option>
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

      {/* Légende des statuts (aide) */}
      <details className="px-4 py-2.5 border-b border-gray-100 bg-white text-sm">
        <summary className="cursor-pointer font-semibold text-gray-600 select-none">
          Que veulent dire les statuts et les boutons&nbsp;?
        </summary>
        <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
          <p><span className="font-semibold">🟢 Actif</span> — compte normal, l'élève peut se connecter.</p>
          <p><span className="font-semibold">⚪ Non activé</span> — compte migré jamais connecté. Bouton <b>« Activer &amp; envoyer l'accès »</b>.</p>
          <p><span className="font-semibold">🟠 En veille</span> — suspendu temporairement par vous. Bouton <b>« Réactiver »</b> pour rouvrir.</p>
          <p><span className="font-semibold">🟡 Preuve en attente</span> — élève importé qui n'a pas encore envoyé sa preuve (délai de 7 j en cours, J-x affiché).</p>
          <p><span className="font-semibold text-red-600">🔴 Bloqué (manuel)</span> — bloqué par vous. Bouton <b>« Réactiver »</b> pour rouvrir.</p>
          <p><span className="font-semibold text-red-600">🔴 Bloqué — preuve manquante</span> — 7 j écoulés sans preuve. Bouton <b>« Prolonger la preuve »</b> (repart pour 7 j, débloque tout de suite).</p>
        </div>
      </details>

      {/* Barre d'actions groupées (apparaît dès qu'une sélection existe) */}
      {sel.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-violet-50 border-b border-violet-100">
          <span className="text-sm font-semibold text-violet-900 me-2">{sel.size} sélectionné(s)</span>
          <Button size="sm" disabled={pending} onClick={activateSelected}
            title="Active le compte migré et envoie l'email de création de mot de passe (pour les élèves « Non activé »)."
            className="gap-2 bg-violet-600 text-white hover:bg-violet-700">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} Activer &amp; envoyer l'accès
          </Button>
          <Button size="sm" disabled={pending} onClick={() => applyStatus("bloque")}
            title="Bloque le compte : l'élève ne peut plus se connecter (message « Compte bloqué »). Réversible avec « Réactiver »."
            className="gap-2 bg-red-600 text-white hover:bg-red-700">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />} Bloquer
          </Button>
          <Button size="sm" disabled={pending} onClick={() => applyStatus("veille")}
            title="Suspend temporairement le compte : l'élève voit « Compte en veille » et ne peut pas se connecter. Réversible avec « Réactiver »."
            className="gap-2 bg-amber-500 text-white hover:bg-amber-600">
            <PauseCircle className="size-4" /> Mettre en veille
          </Button>
          <Button size="sm" disabled={pending} onClick={() => applyStatus("actif")}
            title="Réactive un compte que VOUS avez bloqué ou mis en veille. (Ne débloque pas un compte bloqué faute de preuve → utilisez « Prolonger la preuve ».)"
            className="gap-2 bg-green-600 text-white hover:bg-green-700">
            <CheckCircle2 className="size-4" /> Réactiver
          </Button>
          <Button size="sm" disabled={pending} onClick={extendProofSelected}
            title="Repart pour 7 jours pleins : débloque un compte bloqué faute de preuve et prolonge le délai d'attente."
            className="gap-2 bg-sky-600 text-white hover:bg-sky-700">
            <CalendarClock className="size-4" /> Prolonger la preuve
          </Button>
          <Button size="sm" variant="destructive" disabled={pending} onClick={removeSelected}
            title="Supprime définitivement le(s) compte(s) et toutes leurs données. Irréversible."
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
              <TableHead className="px-5 py-3 font-medium">Paiement</TableHead>
              <TableHead className="px-5 py-3 font-medium">Accès envoyé</TableHead>
              <TableHead className="px-5 py-3 font-medium">Statut</TableHead>
              <TableHead className="px-5 py-3 font-medium text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            {view.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-10 text-gray-400">Aucun étudiant.</TableCell></TableRow>
            ) : view.map((r) => {
              const checked = sel.has(r.id);
              const acc = ACCESS_META[r.accessStatus];
              const stat = STATUS_META[r.statusKind];
              const isBlocked = r.statusKind === "bloque" || r.statusKind === "preuve_bloque";
              return (
                <TableRow key={r.id} className={`font-dm align-top ${
                  checked ? "bg-orange-50/50" : isBlocked ? "bg-red-50 hover:bg-red-100/70" : "hover:bg-gray-50"
                }`}>
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
                  <TableCell className="px-5 py-3 whitespace-nowrap">
                    {r.payType === "abonnement" ? (
                      <div>
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                          r.paidMonths >= r.totalMonths ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          Abonnement {r.isPack ? "(pack) " : ""}{r.paidMonths}/{r.totalMonths}
                        </span>
                        {r.paidMonths < r.totalMonths && (
                          <div className="text-[11px] text-amber-600 mt-0.5">reste {r.totalMonths - r.paidMonths} mois</div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700">Inscription totale</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${acc.cls}`}>
                      {acc.label}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${stat.cls}`}>
                      {stat.dot} {stat.label}
                    </span>
                    {r.statusKind === "preuve_attente" && r.proofDaysLeft !== null && (
                      <div className="text-[11px] text-yellow-700 mt-0.5">
                        {r.proofDaysLeft > 0 ? `blocage dans ${r.proofDaysLeft} j` : "dernier jour"}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      {r.canExtendProof && (
                        <button onClick={() => extendProof(r)} disabled={pending}
                          title="Repart pour 7 jours pleins : débloque le compte s'il est bloqué faute de preuve et prolonge le délai."
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-white hover:bg-sky-600 border border-sky-200 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50">
                          <CalendarClock size={14} /> Prolonger la preuve
                        </button>
                      )}
                      {r.payType === "abonnement" && r.paidMonths < r.totalMonths && (
                        <button onClick={() => remind(r)} disabled={pending}
                          title="Envoyer un rappel de paiement d'échéance à l'abonné"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-white hover:bg-amber-500 border border-amber-200 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50">
                          <BellRing size={14} /> Relancer
                        </button>
                      )}
                      <button onClick={() => cancelEnrollment(r)} disabled={pending}
                        title="Annuler l'inscription (retire l'accès aux cours, garde le compte)"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50">
                        <UserX size={14} /> Annuler
                      </button>
                    </div>
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
