"use client";

import { useState, useTransition } from "react";
import QRCode from "qrcode";
import { CheckCircle2, Loader2, RefreshCw, Download, QrCode, Copy } from "lucide-react";
import { confirmDeliveryAccess, regenerateAccessLink } from "./actions";
import { toast } from "@/components/ui/toast";

export interface DeliveryRow {
  id: string; orderNumber: string; fullName: string; phone: string; email: string;
  address: string; wilaya: string; status: string; total: number; createdAt: string; course: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente", payment_pending: "En attente", payment_review: "En revue",
  confirmed: "Payé ✓", shipped: "Expédié", delivered: "Livré", cancelled: "Annulé",
};

export function LivraisonTable({ rows }: { rows: DeliveryRow[] }) {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [, startTransition] = useTransition();

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleOne = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected((s) => (rows.every((r) => s.has(r.id)) ? new Set() : new Set(rows.map((r) => r.id))));

  /** Exporte les commandes SÉLECTIONNÉES : 2 fichiers (fiches PDF + feuille de livraison CSV). */
  async function exportSelection() {
    const ids = [...selected];
    if (!ids.length) { toast("Sélectionnez au moins une commande.", "error"); return; }
    setExporting(true);
    try {
      const targets: [string, string][] = [
        ["/api/livraison/export-fiches", "fiches-inscription.pdf"],
        ["/api/livraison/export-sheet", "livraison.csv"],
      ];
      for (const [url, filename] of targets) {
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
        if (!res.ok) { toast(`Export échoué (${filename})`, "error"); continue; }
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
        await new Promise((r) => setTimeout(r, 500)); // laisse le 1er téléchargement démarrer
      }
      toast(`Export généré pour ${ids.length} commande(s) : fiches PDF + feuille de livraison ✓`, "success");
    } catch {
      toast("Export impossible.", "error");
    } finally {
      setExporting(false);
    }
  }

  async function makeQr(id: string, link: string) {
    try {
      const url = await QRCode.toDataURL(link, { width: 220, margin: 1 });
      setQrs((q) => ({ ...q, [id]: url }));
    } catch { /* ignore */ }
  }

  function confirm(id: string) {
    setBusyId(id);
    startTransition(async () => {
      const res = await confirmDeliveryAccess(id);
      setBusyId(null);
      if (res.ok) {
        toast("Paiement confirmé · accès envoyé par email ✓", "success");
        if (res.link) { setLinks((l) => ({ ...l, [id]: res.link! })); makeQr(id, res.link); }
      } else toast(res.error ?? "Erreur", "error");
    });
  }

  function regen(id: string) {
    setBusyId(id);
    startTransition(async () => {
      const res = await regenerateAccessLink(id);
      setBusyId(null);
      if (res.ok && res.link) { setLinks((l) => ({ ...l, [id]: res.link! })); makeQr(id, res.link); toast("Lien régénéré ✓", "success"); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  function copyLink(id: string) {
    const l = links[id];
    if (l) { navigator.clipboard?.writeText(l); toast("Lien copié", "info"); }
  }

  function exportCsv() {
    const headers = ["N° commande", "Nom complet", "Téléphone", "Email", "Adresse", "Wilaya", "Formation", "Montant (DA)", "Statut", "Date", "Lien d'accès"];
    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = rows.map((r) => [
      r.orderNumber, r.fullName, r.phone, r.email, r.address, r.wilaya, r.course,
      String(r.total), STATUS_LABEL[r.status] ?? r.status,
      new Date(r.createdAt).toLocaleDateString("fr-FR"), links[r.id] ?? "",
    ].map(esc).join(";"));
    const csv = "﻿" + [headers.map(esc).join(";"), ...lines].join("\r\n"); // BOM = Excel UTF-8 (arabe OK)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `inscriptions-livraison-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (rows.length === 0) {
    return (
      <div className="mt-8 text-center py-16 bg-white rounded-2xl border border-gray-100">
        <div className="text-5xl mb-3">🚚</div>
        <p className="text-gray-400 font-dm">Aucune inscription « paiement à la livraison » pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="text-sm text-gray-500">{rows.length} inscription(s){selected.size > 0 ? ` · ${selected.size} sélectionnée(s)` : ""}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportSelection} disabled={exporting || selected.size === 0}
            className="inline-flex items-center gap-2 bg-orange-DEFAULT text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <QrCode size={15} />} Exporter la sélection ({selected.size})
          </button>
          <button onClick={exportCsv}
            className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700">
            <Download size={15} /> Tout (CSV)
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-3">Sélectionnez des commandes, puis « Exporter la sélection » → 2 fichiers : les <strong>fiches d'inscription (PDF, avec QR de reconnexion)</strong> et la <strong>feuille de livraison (CSV)</strong> à importer chez le transporteur.</p>

      <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 accent-orange-600" aria-label="Tout sélectionner" /></th>
              <th className="px-4 py-3 font-semibold">Élève</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 font-semibold">Adresse</th>
              <th className="px-4 py-3 font-semibold">Formation</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold">Accès / QR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const confirmed = ["confirmed", "shipped", "delivered"].includes(r.status);
              const link = links[r.id];
              const qr = qrs[r.id];
              return (
                <tr key={r.id} className={`border-b border-gray-50 align-top ${selected.has(r.id) ? "bg-orange-50/40" : ""}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} className="w-4 h-4 accent-orange-600" aria-label="Sélectionner" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{r.fullName || "—"}</div>
                    <div className="text-xs text-gray-400">{r.orderNumber} · {new Date(r.createdAt).toLocaleDateString("fr-FR")}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{r.phone || "—"}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[180px]">{r.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px]">
                    <div className="truncate">{r.address || "—"}</div>
                    <div className="text-xs text-gray-400">{r.wilaya}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.course || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${confirmed ? "bg-green-100 text-green-700" : "bg-orange-50 text-orange-700"}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!confirmed ? (
                      <button onClick={() => confirm(r.id)} disabled={busyId === r.id}
                        className="inline-flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-60">
                        {busyId === r.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Confirmer le paiement & envoyer l'accès
                      </button>
                    ) : (
                      <div className="flex items-start gap-3">
                        {qr
                          ? <img src={qr} alt="QR accès" className="w-24 h-24 rounded-lg border border-gray-200 bg-white" />
                          : <div className="w-24 h-24 rounded-lg border border-dashed border-gray-300 grid place-items-center text-gray-300"><QrCode size={26} /></div>}
                        <div className="space-y-1.5">
                          <button onClick={() => regen(r.id)} disabled={busyId === r.id}
                            className="inline-flex items-center gap-1.5 border border-violet-300 text-violet-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-violet-50 disabled:opacity-60">
                            {busyId === r.id ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} {qr ? "Régénérer" : "Générer le lien & QR"}
                          </button>
                          {link && (
                            <button onClick={() => copyLink(r.id)} className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800">
                              <Copy size={12} /> Copier le lien
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-3">
        💡 Le lien d'accès magique expire après un délai (sécurité Supabase). Générez le QR / l'email au moment de finaliser la fiche, ou « Régénérer » avant l'impression.
      </p>
    </div>
  );
}
