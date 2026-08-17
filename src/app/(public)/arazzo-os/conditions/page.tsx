// ⚠️ FICHIER GÉNÉRÉ — ne pas modifier à la main.
//
// Source : arazzo-os/apps/gateway/src/legal.js
// Régénérer : node infra/publier-pages-legales.mjs
//
// Ce texte affirme des choses vérifiables dans le code d'Arazzo OS (« ni
// e-mail, ni nom », « trois ans », « jetons chiffrés »). Le corriger ici le
// ferait diverger de ce que le logiciel fait vraiment — et c'est cette page-ci
// que les plateformes lisent.
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

export const metadata = {
  title: "Conditions d’utilisation — Arazzo OS",
  description: "L’outil interne de publication de l’école",
};

export default function ArazzoOsConditionsPage() {
  return (
    <LegalShell
      title={"Conditions d’utilisation"}
      subtitle={"L’outil interne de publication de l’école"}
      updated={"2026-08-17"}
    >
      <div className="mb-8 border-s-4 border-amber-500 bg-amber-50 p-4 text-sm text-gray-700 font-dm">
        <span dangerouslySetInnerHTML={{ __html: "Ce texte décrit le fonctionnement réel du logiciel. Il n’est pas un avis juridique : faites-le relire avant de vous en prévaloir." }} />
      </div>

      <LegalSection title="Objet">
        <p><span dangerouslySetInnerHTML={{ __html: "Arazzo OS est un outil interne d’une école de couture. Il compose des contenus à partir de l’activité pédagogique de l’école et les publie sur ses propres comptes de réseaux sociaux. Il n’est proposé à aucun public." }} /></p>
      </LegalSection>

      <LegalSection title="Qui peut l’utiliser">
        <p><span dangerouslySetInnerHTML={{ __html: "L’administration de l’école, seule. Aucune inscription n’est ouverte, aucun compte n’est créé pour des tiers." }} /></p>
      </LegalSection>

      <LegalSection title="Ce que l’outil publie">
        <ul className="list-disc ps-5 space-y-1.5">
          <li key={0}><span dangerouslySetInnerHTML={{ __html: "Des travaux d’élèves déjà rendus publics par elles, désignés par leur pseudonyme." }} /></li>
          <li key={1}><span dangerouslySetInnerHTML={{ __html: "Des textes écrits par l’école." }} /></li>
          <li key={2}><span dangerouslySetInnerHTML={{ __html: "Rien n’est publié automatiquement sans qu’une personne l’ait validé." }} /></li>
        </ul>
      </LegalSection>

      <LegalSection title="Comptes de réseaux sociaux">
        <p><span dangerouslySetInnerHTML={{ __html: "L’outil publie au moyen des interfaces officielles des plateformes, en respectant leurs limites et leurs conditions. Vous restez responsable des contenus publiés sur vos comptes, et pouvez retirer l’accès à tout moment depuis la plateforme concernée." }} /></p>
      </LegalSection>

      <LegalSection title="Ce que nous ne garantissons pas">
        <p><span dangerouslySetInnerHTML={{ __html: "La disponibilité des plateformes ne dépend pas de nous. Une publication peut être refusée, retardée ou retirée par elles. L’outil rapporte alors leur motif, sans le reformuler." }} /></p>
      </LegalSection>

      <LegalSection title="Vie privée">
        <p><span dangerouslySetInnerHTML={{ __html: "Le traitement des données est décrit dans la <a href=\"/arazzo-os/confidentialite\">politique de confidentialité</a>." }} /></p>
      </LegalSection>

      <p className="mt-10 text-sm text-gray-500 font-dm">
        <span dangerouslySetInnerHTML={{ __html: "Arazzo OS — arazzoinscription@gmail.com" }} />
      </p>
    </LegalShell>
  );
}
