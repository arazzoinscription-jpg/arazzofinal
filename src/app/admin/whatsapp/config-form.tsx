"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { saveWhatsAppConfig, type WhatsAppConfigInput } from "./actions";

export function WhatsAppConfigForm({ initial }: { initial: WhatsAppConfigInput }) {
  const [f, setF] = useState<WhatsAppConfigInput>(initial);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const res = await saveWhatsAppConfig(f);
      toast(res.ok ? "Configuration enregistrée ✅" : (res.error ?? "Erreur"), res.ok ? "success" : "error");
    });
  }

  const input = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 max-w-xl">
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={f.whatsapp_bubble_enabled}
          onChange={(e) => setF({ ...f, whatsapp_bubble_enabled: e.target.checked })} className="w-5 h-5 accent-orange-600" />
        <span className="font-semibold text-gray-900">Afficher la bulle WhatsApp</span>
      </label>
      <p className="text-xs text-gray-500 -mt-2 ms-8">Désactivée, la bulle n'apparaît dans aucun espace privé.</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Numéro WhatsApp principal (administrateur)</label>
        <input type="tel" value={f.whatsapp_admin_number ?? ""}
          onChange={(e) => setF({ ...f, whatsapp_admin_number: e.target.value })}
          placeholder="+213 6 12 34 56 78" className={input} />
        <p className="text-xs text-gray-400 mt-1">Avec l'indicatif pays. Utilisé par défaut (formateur sans numéro, espace formateur).</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Message par défaut</label>
        <textarea value={f.whatsapp_default_message ?? ""} rows={3}
          onChange={(e) => setF({ ...f, whatsapp_default_message: e.target.value })}
          placeholder="Bonjour, j'ai une question à propos d'Arazzo Formation." className={input} />
      </div>

      <button onClick={save} disabled={pending}
        className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50">
        {pending ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />} Enregistrer
      </button>
    </div>
  );
}
