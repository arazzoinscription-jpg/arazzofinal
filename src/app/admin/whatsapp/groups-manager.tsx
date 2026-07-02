"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2, ExternalLink, Ban, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { isValidWhatsAppGroupLink } from "@/lib/whatsapp";
import { adminSetGroupWhatsApp, adminToggleGroupWhatsApp } from "./actions";

export interface AdminGroupRow {
  id: string;
  name: string;
  creatorName: string;
  whatsapp_link: string | null;
  whatsapp_disabled: boolean;
}

export function WhatsAppGroupsManager({ rows }: { rows: AdminGroupRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 font-dm">Aucun groupe pour le moment.</p>;
  }
  return (
    <div className="space-y-3">
      {rows.map((g) => <GroupItem key={g.id} row={g} />)}
    </div>
  );
}

function GroupItem({ row }: { row: AdminGroupRow }) {
  const router = useRouter();
  const [link, setLink] = useState(row.whatsapp_link ?? "");
  const [pending, start] = useTransition();
  const dirty = (link.trim() || null) !== (row.whatsapp_link ?? null);
  const invalid = link.trim().length > 0 && !isValidWhatsAppGroupLink(link.trim());

  function save() {
    start(async () => {
      const res = await adminSetGroupWhatsApp({ groupId: row.id, link: link.trim() || null });
      res.ok ? (toast("Lien mis à jour ✅", "success"), router.refresh()) : toast(res.error ?? "Erreur", "error");
    });
  }
  function remove() {
    if (!confirm("Supprimer le lien WhatsApp de ce groupe ?")) return;
    start(async () => {
      const res = await adminSetGroupWhatsApp({ groupId: row.id, link: null });
      res.ok ? (setLink(""), toast("Lien supprimé ✅", "success"), router.refresh()) : toast(res.error ?? "Erreur", "error");
    });
  }
  function toggle() {
    start(async () => {
      const res = await adminToggleGroupWhatsApp({ groupId: row.id, disabled: !row.whatsapp_disabled });
      res.ok ? (toast(row.whatsapp_disabled ? "Groupe réactivé ✅" : "Groupe désactivé ✅", "success"), router.refresh()) : toast(res.error ?? "Erreur", "error");
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate">{row.name}</div>
          <div className="text-xs text-gray-400">par {row.creatorName}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {row.whatsapp_disabled && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Désactivé</span>}
          {row.whatsapp_link && (
            <a href={row.whatsapp_link} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-700" title="Ouvrir">
              <ExternalLink size={16} />
            </a>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://chat.whatsapp.com/…"
          className={`flex-1 min-w-56 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${invalid ? "border-red-300 focus:ring-red-400" : "border-gray-200 focus:ring-orange-500"}`} />
        <button onClick={save} disabled={pending || !dirty || invalid}
          className="inline-flex items-center gap-1.5 bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-40">
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer
        </button>
        {row.whatsapp_link && (
          <button onClick={remove} disabled={pending} className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40">
            <Trash2 size={14} /> Supprimer
          </button>
        )}
        <button onClick={toggle} disabled={pending}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-40 ${row.whatsapp_disabled ? "bg-green-600 text-white hover:bg-green-700" : "border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
          {row.whatsapp_disabled ? <><CheckCircle2 size={14} /> Réactiver</> : <><Ban size={14} /> Désactiver</>}
        </button>
      </div>
      {invalid && <p className="text-xs text-red-500 mt-1">Lien invalide (attendu : https://chat.whatsapp.com/…).</p>}
    </div>
  );
}
