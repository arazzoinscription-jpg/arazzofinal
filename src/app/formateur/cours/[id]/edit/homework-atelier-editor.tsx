"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2, Save, Sparkles } from "lucide-react";
import { setCourseHomework, setCourseAtelierRequired } from "@/app/formateur/cours/actions";
import { toast } from "@/components/ui/toast";
import { DEVOIRS_LIBRARY } from "@/lib/devoirs-library";

export function HomeworkAtelierEditor({
  courseId, initialHomework, initialAtelierRequired,
}: {
  courseId: string;
  initialHomework: string;
  initialAtelierRequired: boolean;
}) {
  const router = useRouter();
  const [homework, setHomework] = useState(initialHomework);
  const [required, setRequired] = useState(initialAtelierRequired);
  const [savingHw, startHw] = useTransition();
  const [savingReq, startReq] = useTransition();

  function saveHomework() {
    startHw(async () => {
      const res = await setCourseHomework(courseId, homework);
      if (res.ok) { toast("Devoir enregistré ✅", "success"); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  function toggleRequired() {
    const next = !required;
    setRequired(next);
    startReq(async () => {
      const res = await setCourseAtelierRequired(courseId, next);
      if (res.ok) { toast(next ? "Cours requis pour l'Atelier ✅" : "Retiré des cours requis", "success"); router.refresh(); }
      else { setRequired(!next); toast(res.error ?? "Erreur", "error"); }
    });
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Devoir à faire */}
      <div className="bg-white rounded-2xl border border-cream-200 p-6">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="w-9 h-9 rounded-xl bg-orange-DEFAULT/10 text-orange-600 flex items-center justify-center"><ClipboardList size={18} /></span>
          <h2 className="font-playfair text-xl font-bold text-gray-900">Devoir à faire</h2>
        </div>
        <p className="text-sm text-gray-500 font-dm mb-4">
          Décrivez ce que l'élève doit réaliser. Elle importera son travail dans la zone <strong>Travaux pratiques</strong> du cours.
        </p>
        {/* Liste déroulante de devoirs prêts à l'emploi : choisir → remplit le champ (modifiable ensuite). */}
        <select
          value=""
          onChange={(e) => { const t = e.target.value; if (t) setHomework(t); e.target.value = ""; }}
          className="w-full border border-violet-200 bg-violet-50/60 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="">➕ Choisir un devoir prêt à l'emploi…</option>
          {DEVOIRS_LIBRARY.map((d) => (
            <option key={d.label} value={d.text}>{d.label}</option>
          ))}
        </select>
        <textarea
          value={homework}
          onChange={(e) => setHomework(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="Ex : Réalisez un patron de base taille 38, photographiez le placement sur tissu et envoyez vos coutures d'essai… ou choisissez un devoir prêt à l'emploi ci-dessus."
          className="w-full border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-y"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-400 font-dm">{homework.length}/4000</span>
          <button onClick={saveHomework} disabled={savingHw}
            className="inline-flex items-center gap-2 bg-orange-DEFAULT hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors">
            {savingHw ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Enregistrer le devoir
          </button>
        </div>
      </div>

      {/* Récompense Atelier */}
      <div className="bg-gradient-to-br from-violet-50 to-orange-50 dark:from-violet-900/20 dark:to-orange-900/10 rounded-2xl border border-violet-100 dark:border-white/10 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="w-9 h-9 rounded-xl bg-violet-DEFAULT/10 text-violet-700 flex items-center justify-center"><Sparkles size={18} /></span>
              <h2 className="font-playfair text-xl font-bold text-gray-900 dark:text-white">Récompense Atelier 🎁</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-white/60 font-dm">
              Cochez si ce cours fait partie des cours à terminer pour <strong>débloquer le tableau de bord Atelier</strong>.
            </p>
          </div>
          <button
            onClick={toggleRequired}
            disabled={savingReq}
            role="switch"
            aria-checked={required}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${required ? "bg-violet-DEFAULT" : "bg-gray-300"}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${required ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
