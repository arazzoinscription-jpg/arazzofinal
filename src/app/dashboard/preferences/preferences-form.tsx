"use client";

import { useState, useTransition } from "react";
import { saveEmailPreferences, type PrefsInput } from "./actions";

const FIELDS: { key: keyof PrefsInput; label: string; desc: string; icon: string }[] = [
  { key: "welcome",       label: "Bienvenue & compte",      desc: "Confirmation de compte et informations essentielles", icon: "👋" },
  { key: "purchases",     label: "Achats & accès",          desc: "Confirmations de paiement et accès aux formations",   icon: "🛒" },
  { key: "new_content",   label: "Nouveau contenu",         desc: "Nouvelles leçons, modules ou vidéos dans vos cours",  icon: "✨" },
  { key: "teacher_reply", label: "Réponses du professeur",  desc: "Quand votre formatrice répond à vos questions",       icon: "💬" },
  { key: "private_msg",   label: "Messages privés",         desc: "Nouveaux messages reçus sur la plateforme",           icon: "✉️" },
  { key: "certificates",  label: "Certificats & réussite",  desc: "Certificats obtenus et félicitations de fin",         icon: "🎓" },
  { key: "reactivation",  label: "Rappels & motivation",    desc: "Petits rappels si vous restez inactive un moment",    icon: "🌸" },
  { key: "announcements", label: "Annonces",                desc: "Annonces importantes de vos formatrices",             icon: "📢" },
];

export function PreferencesForm({ initial }: { initial: PrefsInput }) {
  const [prefs, setPrefs] = useState<PrefsInput>(initial);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function toggle(key: keyof PrefsInput) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setMsg(null);
  }

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await saveEmailPreferences(prefs);
      setMsg(res.ok ? { ok: true, text: "Préférences enregistrées ✓" } : { ok: false, text: res.error ?? "Erreur" });
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-soft p-6">
      <div className="divide-y divide-cream-100">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{f.icon}</span>
              <div>
                <div className="font-semibold text-gray-900 font-dm">{f.label}</div>
                <div className="text-sm text-gray-500 font-dm">{f.desc}</div>
              </div>
            </div>
            {/* Interrupteur */}
            <button
              type="button"
              role="switch"
              aria-checked={prefs[f.key]}
              onClick={() => toggle(f.key)}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full transition-colors ${
                prefs[f.key] ? "bg-orange-DEFAULT" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                  prefs[f.key] ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {msg && (
        <p className={`text-sm mt-5 px-4 py-2.5 rounded-xl ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {msg.text}
        </p>
      )}

      <button
        onClick={save}
        disabled={isPending}
        className="mt-6 bg-orange-DEFAULT text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
      >
        {isPending ? "Enregistrement…" : "Enregistrer mes préférences"}
      </button>
    </div>
  );
}
