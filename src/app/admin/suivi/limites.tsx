import { LEGENDE, STYLE_ETAT, CONSERVATION_JOURS, type Etat } from "@/lib/student-care/display";

/** « Données et limites » : ce que le tableau sait, et ce qu'il ne sait pas. */
export function DonneesEtLimites() {
  const etats: Etat[] = ["valeur", "aucune", "indisponible", "non_enregistree", "non_applicable"];
  return (
    <details className="bg-white rounded-2xl border border-gray-100 p-5 mt-6 text-sm text-gray-700">
      <summary className="cursor-pointer font-semibold text-gray-900">ℹ️ Données et limites</summary>
      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {etats.map((e) => <span key={e} className={STYLE_ETAT[e]}>● {LEGENDE[e]}</span>)}
        </div>
        <ul className="list-disc ms-5 space-y-1 text-[13px]">
          <li><strong>Activité réelle</strong> = leçon terminée, quiz tenté ou travail pratique soumis. Les connexions, vidéos ouvertes, leçons consultées et questions sont des <em>signaux</em> affichés à part.</li>
          <li><strong>Connexion</strong> = dernière authentification. Les sessions durent 400 jours : une élève qui revient sans se reconnecter garde une date ancienne.</li>
          <li><strong>Leçon terminée</strong> = case « Terminée » cochée par l&apos;élève (possible dès 80 % de la vidéo atteints, en position). Décocher efface la leçon ; recocher change sa date.</li>
          <li><strong>Niveau</strong> = inscription à l&apos;un des trois cours de niveau. Les anciens cours-modules sont montrés dans l&apos;« historique » : leurs leçons ont été recopiées dans les cours de niveau, elles ne sont jamais additionnées.</li>
          <li><strong>Élève importée</strong> = inscription de l&apos;ancien système (avant le 2 juin 2026, sans commande) : son historique antérieur n&apos;a pas été repris.</li>
          <li><strong>Vidéo</strong> : seul le lecteur Bunny est suivi. <strong>Leçons consultées</strong> : journal conservé {CONSERVATION_JOURS.activity_log} jours. <strong>Notifications et e-mails</strong> : conservés {CONSERVATION_JOURS.notifications} jours.</li>
          <li><strong>Téléphone</strong> : le profil n&apos;en contient pas ; il vient d&apos;une commande, d&apos;un dossier de diplôme ou d&apos;une demande d&apos;inscription (source indiquée).</li>
          <li>Tous les jours se comptent à l&apos;heure d&apos;Alger. Aucune relance, aucun e-mail, aucune notification n&apos;est envoyé depuis ce tableau.</li>
        </ul>
      </div>
    </details>
  );
}
