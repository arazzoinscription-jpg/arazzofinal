"use client";

import { useMemo, useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search, MoreVertical, Loader2, Mail, PauseCircle, PlayCircle, Ban, CheckCircle2,
  Trash2, X, Download, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { bulkSetUserStatus, bulkDeleteUsers } from "@/app/admin/actions";
import { sendProspectEmail, setProspectSequence } from "./actions";

export type ProspectStatus = "nouveau" | "attente" | "inactif" | "client" | "reactive";
export type AcctStatus = "actif" | "veille" | "bloque";

export interface ProspectRow {
  id: string;
  nom: string;
  email: string;
  phone: string | null;
  createdAt: string;
  emailVerified: boolean;
  lastLogin: string | null;
  ordersCount: number;
  enrollmentsCount: number;
  formationInteret: string | null;
  source: string;
  status: ProspectStatus;
  acctStatus: AcctStatus;
  sequenceStopped: boolean;
  markedForDeletion: boolean;
}

export type ProspectFilter =
  | "tous" | "sans_commande" | "avec_commande" | "abonnement"
  | "inactifs" | "email_non_verifie" | "login_30" | "login_90";

const STATUS_META: Record<ProspectStatus, { label: string; cls: string }> = {
  nouveau: { label: "Nouveau", cls: "bg-blue-100 text-blue-700" },
  attente: { label: "En attente", cls: "bg-amber-100 text-amber-700" },
  inactif: { label: "Inactif", cls: "bg-gray-200 text-gray-600" },
  client: { label: "Client", cls: "bg-green-100 text-green-700" },
  reactive: { label: "Réactivé", cls: "bg-violet-100 text-violet-700" },
};

const KIND_LABEL: Record<string, string> = {
  welcome: "Bienvenue", reminder_2: "Rappel J+2", reminder_7: "Rappel J+7", reminder_14: "Rappel J+14",
};

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");
const DAY = 1000 * 60 * 60 * 24;
const daysSince = (d: string | null) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / DAY) : Infinity);

const PER_PAGE = 25;

export function ProspectsClient({
  rows,
  subscriberIds,
}: {
  rows: ProspectRow[];
  subscriberIds: string[];
}) {
  const router = useRouter();
  const subs = useMemo(() => new Set(subscriberIds), [subscriberIds]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<ProspectFilter>("tous");
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  // ── Recherche instantanée + filtres (client-side, sans rechargement) ──
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (needle) {
        const hay = `${r.nom} ${r.email} ${r.phone ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      const hasCommande = r.ordersCount > 0 || r.enrollmentsCount > 0;
      switch (filter) {
        case "sans_commande": return !hasCommande;
        case "avec_commande": return hasCommande;
        case "abonnement": return subs.has(r.id);
        case "inactifs": return r.status === "inactif";
        case "email_non_verifie": return !r.emailVerified;
        case "login_30": return daysSince(r.lastLogin) > 30;
        case "login_90": return daysSince(r.lastLogin) > 90;
        default: return true;
      }
    });
  }, [rows, q, filter, subs]);

  useEffect(() => { setPage(0); setSel(new Set()); }, [q, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows = filtered.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const allChecked = pageRows.length > 0 && pageRows.every((r) => sel.has(r.id));

  function toggle(id: string) {
    setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSel((p) => {
      const n = new Set(p);
      if (allChecked) pageRows.forEach((r) => n.delete(r.id));
      else pageRows.forEach((r) => n.add(r.id));
      return n;
    });
  }

  function afterAction(msg: string, refresh = true) {
    toast(msg, "success");
    setSel(new Set());
    if (refresh) router.refresh();
  }

  function bulkSend(kind: string) {
    const list = [...sel]; if (!list.length) return;
    start(async () => {
      let sent = 0;
      for (const id of list) {
        const res = await sendProspectEmail({ userId: id, kind: kind as never });
        if (res.ok) sent++;
      }
      afterAction(`${sent}/${list.length} email(s) « ${KIND_LABEL[kind]} » envoyé(s) ✅`);
    });
  }
  function bulkSequence(suspend: boolean) {
    const list = [...sel]; if (!list.length) return;
    start(async () => {
      const res = await setProspectSequence({ userIds: list, suspend });
      res.ok ? afterAction(`Séquence ${suspend ? "suspendue" : "reprise"} pour ${res.count} prospect(s) ✅`)
             : toast(res.error ?? "Erreur", "error");
    });
  }
  function bulkStatus(status: AcctStatus) {
    const list = [...sel]; if (!list.length) return;
    start(async () => {
      const res = await bulkSetUserStatus({ userIds: list, status });
      res.ok ? afterAction(`${res.count} compte(s) ${status === "bloque" ? "désactivé(s)" : "réactivé(s)"} ✅`)
             : toast(res.error ?? "Erreur", "error");
    });
  }
  function bulkDelete() {
    const list = [...sel]; if (!list.length) return;
    if (!confirm(`Supprimer définitivement ${list.length} compte(s) ?\nAction irréversible (compte + données associées).`)) return;
    start(async () => {
      const res = await bulkDeleteUsers(list);
      res.ok ? afterAction(`${res.count} compte(s) supprimé(s) ✅`) : toast(res.error ?? "Erreur", "error");
    });
  }

  // ── Export CSV / Excel (sur la sélection filtrée) ──
  const HEADERS = ["Nom", "Email", "Téléphone", "Inscription", "Email vérifié", "Dernière connexion", "Commandes", "Inscriptions", "Formation visée", "Source", "Statut"];
  function rowValues(r: ProspectRow) {
    return [
      r.nom, r.email, r.phone ?? "", fmtDate(r.createdAt), r.emailVerified ? "Oui" : "Non",
      fmtDate(r.lastLogin), String(r.ordersCount), String(r.enrollmentsCount),
      r.formationInteret ?? "", r.source, STATUS_META[r.status].label,
    ];
  }
  function download(name: string, content: string, mime: string) {
    const blob = new Blob(["﻿" + content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }
  function exportCSV() {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [HEADERS.map(esc).join(","), ...filtered.map((r) => rowValues(r).map(esc).join(","))];
    download(`prospects-${new Date().toISOString().slice(0, 10)}.csv`, lines.join("\r\n"), "text/csv;charset=utf-8");
  }
  function exportExcel() {
    const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const th = HEADERS.map((h) => `<th>${esc(h)}</th>`).join("");
    const trs = filtered.map((r) => `<tr>${rowValues(r).map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`).join("");
    const html = `<table border="1"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
    download(`prospects-${new Date().toISOString().slice(0, 10)}.xls`, html, "application/vnd.ms-excel");
  }

  return (
    <div>
      {/* Barre recherche + filtre + export */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-56 relative">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher nom, email ou téléphone…"
            className="w-full border border-gray-100 rounded-xl ps-9 pe-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as ProspectFilter)}
          className="border border-gray-100 rounded-xl px-4 py-2.5 bg-white text-sm">
          <option value="tous">Tous</option>
          <option value="sans_commande">Sans commande</option>
          <option value="avec_commande">Avec commande</option>
          <option value="abonnement">Clients abonnement</option>
          <option value="inactifs">Inactifs</option>
          <option value="email_non_verifie">Email non vérifié</option>
          <option value="login_30">Dernière connexion &gt; 30 j</option>
          <option value="login_90">Dernière connexion &gt; 90 j</option>
        </select>
        <button onClick={exportCSV} className="inline-flex items-center gap-2 border border-gray-100 rounded-xl px-4 py-2.5 bg-white text-sm hover:bg-gray-50">
          <Download size={15} /> CSV
        </button>
        <button onClick={exportExcel} className="inline-flex items-center gap-2 border border-gray-100 rounded-xl px-4 py-2.5 bg-white text-sm hover:bg-gray-50">
          <Download size={15} /> Excel
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Barre d'actions groupées */}
        {sel.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-violet-50 border-b border-violet-100">
            <span className="text-sm font-semibold text-violet-900 me-1">{sel.size} sélectionné(s)</span>
            <SendMenu disabled={pending} onPick={bulkSend} />
            <ActBtn disabled={pending} onClick={() => bulkSequence(true)} cls="bg-amber-500 hover:bg-amber-600"><PauseCircle className="size-4" /> Suspendre</ActBtn>
            <ActBtn disabled={pending} onClick={() => bulkSequence(false)} cls="bg-sky-600 hover:bg-sky-700"><PlayCircle className="size-4" /> Reprendre</ActBtn>
            <ActBtn disabled={pending} onClick={() => bulkStatus("bloque")} cls="bg-red-600 hover:bg-red-700"><Ban className="size-4" /> Désactiver</ActBtn>
            <ActBtn disabled={pending} onClick={() => bulkStatus("actif")} cls="bg-green-600 hover:bg-green-700"><CheckCircle2 className="size-4" /> Réactiver</ActBtn>
            <ActBtn disabled={pending} onClick={bulkDelete} cls="bg-gray-900 hover:bg-black"><Trash2 className="size-4" /> Supprimer</ActBtn>
            <button onClick={() => setSel(new Set())} className="ms-auto inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
              <X size={15} /> Désélectionner
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader className="bg-gray-50">
              <TableRow className="text-left text-gray-500 font-dm">
                <TableHead className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Tout sélectionner (page)" className="w-4 h-4 accent-orange-600" />
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">Prospect</TableHead>
                <TableHead className="px-4 py-3 font-medium">Inscription</TableHead>
                <TableHead className="px-4 py-3 font-medium">Vérifié</TableHead>
                <TableHead className="px-4 py-3 font-medium">Dernière connexion</TableHead>
                <TableHead className="px-4 py-3 font-medium">Commandes</TableHead>
                <TableHead className="px-4 py-3 font-medium">Formation visée</TableHead>
                <TableHead className="px-4 py-3 font-medium">Source</TableHead>
                <TableHead className="px-4 py-3 font-medium">Statut</TableHead>
                <TableHead className="px-4 py-3 font-medium text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {pageRows.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-10 text-gray-400">Aucun prospect.</TableCell></TableRow>
              ) : pageRows.map((r) => {
                const checked = sel.has(r.id);
                return (
                  <TableRow key={r.id} className={`font-dm align-top ${checked ? "bg-orange-50/50" : "hover:bg-gray-50"}`}>
                    <TableCell className="px-4 py-3">
                      <input type="checkbox" checked={checked} onChange={() => toggle(r.id)} aria-label={`Sélectionner ${r.nom}`} className="w-4 h-4 accent-orange-600" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.nom}</div>
                      <div className="text-xs text-gray-400">{r.email}</div>
                      {r.phone && <div className="text-xs text-gray-400">{r.phone}</div>}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(r.createdAt)}</TableCell>
                    <TableCell className="px-4 py-3">
                      {r.emailVerified
                        ? <span className="text-green-600 text-xs font-semibold">✓ Oui</span>
                        : <span className="text-red-500 text-xs font-semibold">✗ Non</span>}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(r.lastLogin)}</TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {r.ordersCount} cmd · {r.enrollmentsCount} insc.
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 max-w-[12rem] truncate">{r.formationInteret ?? "—"}</TableCell>
                    <TableCell className="px-4 py-3 text-gray-400 text-xs">{r.source}</TableCell>
                    <TableCell className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_META[r.status].cls}`}>{STATUS_META[r.status].label}</span>
                      {r.sequenceStopped && r.status !== "client" && r.status !== "reactive" && (
                        <div className="text-[10px] text-amber-600 mt-1">séquence suspendue</div>
                      )}
                      {r.markedForDeletion && <div className="text-[10px] text-red-500 mt-1">à supprimer</div>}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-end">
                      <RowMenu row={r} onDone={() => router.refresh()} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50 text-sm text-gray-500">
          <span>{filtered.length} prospect(s)</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="p-1.5 rounded-lg border border-gray-100 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft size={16} /></button>
            <span>Page {page + 1} / {pageCount}</span>
            <button disabled={page >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="p-1.5 rounded-lg border border-gray-100 disabled:opacity-40 hover:bg-gray-50"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActBtn({ children, onClick, disabled, cls }: { children: React.ReactNode; onClick: () => void; disabled: boolean; cls: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 ${cls}`}>
      {children}
    </button>
  );
}

function SendMenu({ onPick, disabled }: { onPick: (kind: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} disabled={disabled}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium disabled:opacity-50">
        <Mail className="size-4" /> Envoyer un email
      </button>
      {open && (
        <div className="absolute start-0 mt-1 w-48 rounded-xl border border-gray-100 bg-white shadow-lg z-30 py-1.5 text-sm">
          {Object.entries(KIND_LABEL).map(([k, label]) => (
            <button key={k} onClick={() => { setOpen(false); onPick(k); }}
              className="w-full text-start px-3.5 py-2 hover:bg-violet-50 text-gray-700">{label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function RowMenu({ row, onDone }: { row: ProspectRow; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setOpen(false);
    start(async () => {
      const res = await fn();
      res.ok ? (toast(okMsg, "success"), onDone()) : toast(res.error ?? "Erreur", "error");
    });
  }

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} disabled={pending}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-100 text-gray-500 hover:bg-gray-50 disabled:opacity-50" aria-label="Actions">
        {pending ? <Loader2 size={15} className="animate-spin" /> : <MoreVertical size={16} />}
      </button>
      {open && (
        <div className="absolute end-0 mt-1 w-56 rounded-xl border border-gray-100 bg-white shadow-lg z-30 py-1.5 text-sm">
          <div className="px-3.5 py-1 text-[11px] uppercase tracking-wide text-gray-400">Renvoyer un email</div>
          {(["welcome", "reminder_2", "reminder_7", "reminder_14"] as const).map((k) => (
            <button key={k} onClick={() => run(() => sendProspectEmail({ userId: row.id, kind: k }), `Email « ${KIND_LABEL[k]} » envoyé ✅`)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-gray-700 hover:bg-violet-50">
              <Mail size={15} /> {KIND_LABEL[k]}
            </button>
          ))}
          <div className="my-1 border-t border-gray-100" />
          {row.sequenceStopped ? (
            <button onClick={() => run(() => setProspectSequence({ userIds: [row.id], suspend: false }), "Séquence reprise ✅")}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sky-700 hover:bg-sky-50"><PlayCircle size={15} /> Reprendre la séquence</button>
          ) : (
            <button onClick={() => run(() => setProspectSequence({ userIds: [row.id], suspend: true }), "Séquence suspendue ✅")}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-amber-700 hover:bg-amber-50"><PauseCircle size={15} /> Suspendre la séquence</button>
          )}
          {row.acctStatus === "bloque" ? (
            <button onClick={() => run(() => bulkSetUserStatus({ userIds: [row.id], status: "actif" }), "Compte réactivé ✅")}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-green-700 hover:bg-green-50"><CheckCircle2 size={15} /> Réactiver le compte</button>
          ) : (
            <button onClick={() => run(() => bulkSetUserStatus({ userIds: [row.id], status: "bloque" }), "Compte désactivé ✅")}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-red-700 hover:bg-red-50"><Ban size={15} /> Désactiver le compte</button>
          )}
          <button
            onClick={() => {
              if (!confirm(`Supprimer définitivement le compte de ${row.nom} ?\nAction irréversible.`)) return;
              run(() => bulkDeleteUsers([row.id]), "Compte supprimé ✅");
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-gray-900 hover:bg-gray-100"><Trash2 size={15} /> Supprimer définitivement</button>
        </div>
      )}
    </div>
  );
}
