"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { saveProspectSettings, type ProspectSettingsInput } from "../actions";

const EMAILS: { key: "welcome" | "reminder_2" | "reminder_7" | "reminder_14"; title: string; hint: string }[] = [
  { key: "welcome", title: "Email 1 — Bienvenue", hint: "Envoyé immédiatement après l'inscription." },
  { key: "reminder_2", title: "Email 2 — Rappel", hint: "Formations populaires + lien vers les offres." },
  { key: "reminder_7", title: "Email 3 — Témoignages & FAQ", hint: "Conseils pour bien débuter." },
  { key: "reminder_14", title: "Email 4 — Dernier rappel", hint: "Peut inclure une promotion / bonus." },
];

export function ProspectSettingsForm({ initial }: { initial: ProspectSettingsInput }) {
  const [f, setF] = useState<ProspectSettingsInput>(initial);
  const [pending, start] = useTransition();

  function set<K extends keyof ProspectSettingsInput>(k: K, v: ProspectSettingsInput[K]) {
    setF((p) => ({ ...p, [k]: v }));
  }
  const subjKey = (k: string) => `subject_${k}` as keyof ProspectSettingsInput;
  const htmlKey = (k: string) => `html_${k}` as keyof ProspectSettingsInput;
  const delayKey = (k: string) => `delay_${k}_days` as keyof ProspectSettingsInput;

  function save() {
    start(async () => {
      const res = await saveProspectSettings(f);
      toast(res.ok ? "Paramètres enregistrés ✅" : (res.error ?? "Erreur"), res.ok ? "success" : "error");
    });
  }

  const input = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";
  const numInput = "w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

  return (
    <div className="space-y-6">
      {/* Activation + délai suppression */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={f.enabled} onChange={(e) => set("enabled", e.target.checked)} className="w-5 h-5 accent-orange-600" />
          <span className="font-semibold text-gray-900">Séquence automatique activée</span>
        </label>
        <p className="text-xs text-gray-500 mt-1 ms-8">Décochez pour suspendre tous les envois automatiques (les envois manuels restent possibles).</p>
        <div className="mt-4 flex items-center gap-3">
          <label className="text-sm text-gray-700">Délai avant l'email d'inactivité / « à supprimer » :</label>
          <input type="number" min={1} max={60} value={f.delay_deletion_months}
            onChange={(e) => set("delay_deletion_months", Number(e.target.value))} className={numInput} />
          <span className="text-sm text-gray-500">mois</span>
        </div>
      </div>

      {/* Habillage */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <h3 className="font-semibold text-gray-900">Habillage des emails</h3>
        <div>
          <label className="text-sm text-gray-700 block mb-1">URL du logo (optionnel)</label>
          <input value={f.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://…/logo.png" className={input} />
        </div>
        <div>
          <label className="text-sm text-gray-700 block mb-1">Signature (HTML simple, optionnel)</label>
          <textarea value={f.signature ?? ""} onChange={(e) => set("signature", e.target.value)} rows={2} placeholder="L'équipe Arazzo Formation" className={input} />
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={f.promo_enabled} onChange={(e) => set("promo_enabled", e.target.checked)} className="w-5 h-5 accent-orange-600" />
          <span className="text-sm font-medium text-gray-900">Afficher une promotion dans le dernier rappel (Email 4)</span>
        </label>
        {f.promo_enabled && (
          <input value={f.promo_text ?? ""} onChange={(e) => set("promo_text", e.target.value)} placeholder="-20% avec le code BIENVENUE" className={input} />
        )}
      </div>

      {/* Les 4 emails */}
      {EMAILS.map((em) => (
        <div key={em.key} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{em.title}</h3>
            {em.key !== "welcome" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Délai</span>
                <input type="number" min={0} max={365} value={f[delayKey(em.key)] as number}
                  onChange={(e) => set(delayKey(em.key), Number(e.target.value) as never)} className={numInput} />
                <span className="text-xs text-gray-500">jours après inscription</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">{em.hint}</p>
          <div>
            <label className="text-sm text-gray-700 block mb-1">Sujet</label>
            <input value={(f[subjKey(em.key)] as string) ?? ""} onChange={(e) => set(subjKey(em.key), e.target.value as never)}
              placeholder="(modèle par défaut)" className={input} />
          </div>
          <div>
            <label className="text-sm text-gray-700 block mb-1">Contenu HTML</label>
            <textarea value={(f[htmlKey(em.key)] as string) ?? ""} onChange={(e) => set(htmlKey(em.key), e.target.value as never)}
              rows={4} placeholder="(modèle par défaut — laisser vide pour l'utiliser)" className={`${input} font-mono`} />
          </div>
        </div>
      ))}

      <div className="sticky bottom-4">
        <button onClick={save} disabled={pending}
          className="inline-flex items-center gap-2 bg-orange-DEFAULT bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50 shadow-lg">
          {pending ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />} Enregistrer les paramètres
        </button>
      </div>
    </div>
  );
}
