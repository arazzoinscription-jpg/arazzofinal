"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Save, Trash2, Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { isValidWhatsAppGroupLink } from "@/lib/whatsapp";
import { setGroupWhatsAppLink } from "../actions";

/** Gestion du lien du groupe WhatsApp (formateur propriétaire) : ajout / modif / suppr / vérif. */
export function GroupWhatsAppManager({ groupId, initialLink, disabled }: { groupId: string; initialLink: string | null; disabled: boolean }) {
  const router = useRouter();
  const [link, setLink] = useState(initialLink ?? "");
  const [checked, setChecked] = useState<null | boolean>(null);
  const [pending, start] = useTransition();

  const trimmed = link.trim();
  const valid = isValidWhatsAppGroupLink(trimmed);
  const dirty = (trimmed || null) !== (initialLink ?? null);

  function verify() {
    setChecked(valid);
    toast(valid ? "Lien valide ✓" : "Lien invalide — format attendu : https://chat.whatsapp.com/…", valid ? "success" : "error");
  }
  function save() {
    if (trimmed && !valid) { toast("Lien invalide.", "error"); return; }
    start(async () => {
      const res = await setGroupWhatsAppLink({ groupId, link: trimmed || null });
      res.ok ? (toast("Lien enregistré ✅", "success"), router.refresh()) : toast(res.error ?? "Erreur", "error");
    });
  }
  function remove() {
    if (!confirm("Supprimer le lien du groupe WhatsApp ?")) return;
    start(async () => {
      const res = await setGroupWhatsAppLink({ groupId, link: null });
      res.ok ? (setLink(""), setChecked(null), toast("Lien supprimé ✅", "success"), router.refresh()) : toast(res.error ?? "Erreur", "error");
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-cream-200 p-4">
      <h3 className="font-semibold text-gray-900 inline-flex items-center gap-2 mb-1">
        <MessageCircle size={17} className="text-[#25D366]" /> Groupe WhatsApp
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        Créez le groupe dans WhatsApp, copiez le lien d'invitation, puis collez-le ici. Les élèves du groupe pourront le rejoindre.
      </p>
      {disabled && (
        <p className="text-xs text-red-600 mb-2">Ce groupe WhatsApp a été désactivé par l'administrateur.</p>
      )}
      <input
        value={link}
        onChange={(e) => { setLink(e.target.value); setChecked(null); }}
        placeholder="https://chat.whatsapp.com/…"
        className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${trimmed && !valid ? "border-red-300 focus:ring-red-400" : "border-gray-200 focus:ring-orange-500"}`}
      />
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <button onClick={save} disabled={pending || !dirty || (!!trimmed && !valid)}
          className="inline-flex items-center gap-1.5 bg-orange-DEFAULT bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-40">
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer
        </button>
        <button onClick={verify} disabled={!trimmed}
          className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40">
          {checked === null ? null : checked ? <CheckCircle2 size={14} className="text-green-600" /> : <XCircle size={14} className="text-red-500" />} Vérifier
        </button>
        {initialLink && (
          <>
            <a href={initialLink} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
              <ExternalLink size={14} /> Ouvrir
            </a>
            <button onClick={remove} disabled={pending}
              className="inline-flex items-center gap-1.5 text-red-600 border border-red-100 px-3 py-2 rounded-lg text-sm hover:bg-red-50 disabled:opacity-40">
              <Trash2 size={14} /> Supprimer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
