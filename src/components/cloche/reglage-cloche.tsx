"use client";

import { useEffect, useState } from "react";
import { BellRing, Check, ChevronDown, Loader2, Smartphone } from "lucide-react";
import { abonnerAuxNotifications, etatNotifications, type EtatNotifications } from "@/components/pwa/abonnement-push";
import { testerMaCloche } from "@/app/actions/cloche-eleve";
import { jouerCloche } from "./son-cloche";

/**
 * « Sonnerie de la cloche » (Ma classe, côté élève) : activer les notifications de CE téléphone,
 * tester la sonnerie (tout de suite, ou écran verrouillé), et l'aide si le téléphone reste muet.
 * Application fermée, c'est le son de notification du téléphone qui retentit ; en touchant la notification,
 * la vraie cloche sonne dans l'application.
 */
export function ReglageCloche() {
  const [etat, setEtat] = useState<EtatNotifications | null>(null);
  const [occupe, setOccupe] = useState<null | "activer" | "maintenant" | "verrou">(null);
  const [message, setMessage] = useState<string | null>(null);
  const [aide, setAide] = useState(false);
  const iphone = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => { void etatNotifications().then(setEtat); }, []);

  async function activer() {
    setOccupe("activer"); setMessage(null);
    const r = await abonnerAuxNotifications();
    setOccupe(null);
    setEtat(await etatNotifications());
    setMessage(r.ok ? "Sonnerie activée sur ce téléphone ✓ Faites un essai !" : r.erreur);
  }

  async function tester(delai: 0 | 8) {
    setOccupe(delai ? "verrou" : "maintenant"); setMessage(null);
    if (!delai) void jouerCloche(3);
    else setMessage("Verrouillez votre téléphone maintenant : la cloche arrive dans 8 secondes…");
    const r = await testerMaCloche({ delai });
    setOccupe(null);
    setMessage(r.ok
      ? (delai ? "Envoyée ! Votre téléphone a-t-il sonné ? Sinon, ouvrez « Je n'entends rien ? »." : "Vous avez entendu la cloche ici ; la notification arrive aussi sur ce téléphone.")
      : r.erreur);
  }

  if (etat === null) return null;
  const bouton = "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-50";

  return (
    <section aria-labelledby="reglage-cloche" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 dark:bg-amber-400/10 dark:border-amber-300/20 p-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center shrink-0"><BellRing size={20} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h2 id="reglage-cloche" className="font-semibold text-gray-900 dark:text-white">Sonnerie de la cloche</h2>
          <p className="text-xs text-gray-600 dark:text-white/70">
            {etat === "actif" ? "✓ Activée sur ce téléphone : quand votre enseignante fait sonner la cloche, votre téléphone sonne, même application fermée."
              : etat === "bloque" ? "Les notifications d'Arazzo sont bloquées sur ce téléphone : autorisez-les dans les réglages (voir l'aide ci-dessous)."
              : etat === "non-supporte" ? (iphone ? "Sur iPhone, installez d'abord l'application : bouton Partager ⬆️ puis « Sur l'écran d'accueil », et ouvrez Arazzo depuis son icône." : "Ce navigateur ne reçoit pas les notifications : ouvrez le site avec Chrome, ou installez l'application.")
              : "Activez-la pour que votre téléphone sonne quand votre enseignante fait sonner la cloche, même application fermée."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {etat === "a-activer" ? (
              <button type="button" onClick={activer} disabled={occupe !== null} className={`${bouton} bg-orange-500 hover:bg-orange-600 text-white`}>
                {occupe === "activer" ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />} Activer la sonnerie
              </button>
            ) : null}
            {etat === "actif" ? (
              <>
                <button type="button" onClick={() => tester(0)} disabled={occupe !== null} className={`${bouton} bg-orange-500 hover:bg-orange-600 text-white`}>
                  {occupe === "maintenant" ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />} Tester maintenant
                </button>
                <button type="button" onClick={() => tester(8)} disabled={occupe !== null} className={`${bouton} border border-amber-300 bg-white dark:bg-white/10 text-gray-800 dark:text-white`}>
                  {occupe === "verrou" ? <Loader2 size={14} className="animate-spin" /> : <Smartphone size={14} />} Tester écran verrouillé (8 s)
                </button>
              </>
            ) : null}
          </div>
          {message ? <p role="status" className="mt-2 text-xs font-semibold text-gray-800 dark:text-white">{etat === "actif" && message.includes("✓") ? <Check size={12} className="inline me-1" /> : null}{message}</p> : null}

          <button type="button" onClick={() => setAide((a) => !a)} aria-expanded={aide} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 dark:text-amber-200">
            Je n&apos;entends rien ? <ChevronDown size={14} className={aide ? "rotate-180 transition" : "transition"} aria-hidden />
          </button>
          {aide ? (
            <ul className="mt-2 space-y-1.5 text-xs text-gray-700 dark:text-white/80 list-disc ps-4">
              <li>Le téléphone ne doit pas être en mode <b>silencieux</b>, <b>vibreur</b> ou <b>Ne pas déranger</b>.</li>
              <li><b>Android</b> : Paramètres › Applications › Chrome (ou Arazzo) › Notifications › autorisez-les et laissez le <b>son</b> activé (pas « silencieux »).</li>
              <li><b>iPhone</b> : Réglages › Notifications › Arazzo › autorisez les notifications et activez <b>Sons</b>.</li>
              <li>Application fermée, c&apos;est la <b>sonnerie de notification</b> de votre téléphone qui retentit ; touchez la notification : la cloche sonne dans l&apos;application.</li>
              <li>Application ouverte, touchez l&apos;écran une fois après l&apos;ouverture : le téléphone autorise alors le son de la cloche.</li>
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
