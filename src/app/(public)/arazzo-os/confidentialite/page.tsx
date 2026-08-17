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
  title: "Politique de confidentialité — Arazzo OS",
  description: "Ce qu’Arazzo OS lit, conserve, et ne fait pas",
};

export default function ArazzoOsConfidentialitePage() {
  return (
    <LegalShell
      title={"Politique de confidentialité"}
      subtitle={"Ce qu’Arazzo OS lit, conserve, et ne fait pas"}
      updated={"2026-08-17"}
    >
      <div className="mb-8 border-s-4 border-amber-500 bg-amber-50 p-4 text-sm text-gray-700 font-dm">
        <span dangerouslySetInnerHTML={{ __html: "Ce texte décrit le fonctionnement réel du logiciel. Il n’est pas un avis juridique : faites-le relire avant de vous en prévaloir." }} />
      </div>

      <LegalSection title="Qui traite ces données">
        <p><span dangerouslySetInnerHTML={{ __html: "Arazzo OS est l’outil interne d’une école de couture. Il sert à publier, sur ses propres comptes de réseaux sociaux, des contenus tirés de son activité pédagogique. Il n’est ouvert à aucun tiers." }} /></p>
      </LegalSection>

      <LegalSection title="Ce que nous lisons dans le centre de formation">
        <p><span dangerouslySetInnerHTML={{ __html: "Le logiciel lit les travaux pratiques que les élèves ont déjà rendus <strong>publics</strong> dans leur espace, ainsi que les dates de leur parcours. Quatre refus sont inscrits dans le code lui-même :" }} /></p>
        <ul className="list-disc ps-5 space-y-1.5">
          <li key={0}><span dangerouslySetInnerHTML={{ __html: "Aucune <strong>identité réelle</strong> ne sort : ni adresse e-mail, ni nom, ni prénom, ni photo de profil. Ces informations ne sont pas même demandées à la base." }} /></li>
          <li key={1}><span dangerouslySetInnerHTML={{ __html: "Une élève est désignée par le <strong>pseudonyme</strong> qu’elle a choisi, et par ses travaux. En l’absence de pseudonyme, aucune publication la concernant n’est possible : il n’existe aucun repli sur le vrai nom." }} /></li>
          <li key={2}><span dangerouslySetInnerHTML={{ __html: "Un seul espace de stockage est lu, celui des travaux pratiques publics. Les documents d’identité, diplômes et pièces privées ne le sont jamais." }} /></li>
          <li key={3}><span dangerouslySetInnerHTML={{ __html: "Seules les élèves sont concernées : ni formatrices, ni personnel." }} /></li>
        </ul>
      </LegalSection>

      <LegalSection title="Ce que nous conservons">
        <ul className="list-disc ps-5 space-y-1.5">
          <li key={0}><span dangerouslySetInnerHTML={{ __html: "<strong>Les jetons d’accès</strong> de vos comptes sociaux, chiffrés (AES-256-GCM). Ils permettent de publier en votre nom ; ils ne sont jamais transmis à personne, et ne quittent pas le serveur." }} /></li>
          <li key={1}><span dangerouslySetInnerHTML={{ __html: "<strong>Ce qui a été publié</strong> : titres, légendes, dates, adresses des publications, et les mesures rendues par les plateformes (vues, mentions, clics)." }} /></li>
          <li key={2}><span dangerouslySetInnerHTML={{ __html: "<strong>Les accords de publication</strong> donnés ou retirés par les élèves, avec leur date." }} /></li>
        </ul>
        <p><span dangerouslySetInnerHTML={{ __html: "Ces informations sont conservées <strong>trois ans</strong>, puis effacées." }} /></p>
      </LegalSection>

      <LegalSection title="Ce que nous ne faisons pas">
        <ul className="list-disc ps-5 space-y-1.5">
          <li key={0}><span dangerouslySetInnerHTML={{ __html: "Aucune vente, aucune location, aucun partage de données à des fins publicitaires." }} /></li>
          <li key={1}><span dangerouslySetInnerHTML={{ __html: "Aucun profilage de personnes hors de l’école." }} /></li>
          <li key={2}><span dangerouslySetInnerHTML={{ __html: "Aucun accès de tiers : le logiciel n’a pas d’autres utilisateurs." }} /></li>
        </ul>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p><span dangerouslySetInnerHTML={{ __html: "Vous pouvez demander l’accès, la rectification ou l’effacement de vos données, et retirer à tout moment un accord de publication. Un retrait s’applique à ce qui n’est pas encore publié, et le contenu déjà en ligne est retiré sur demande." }} /></p>
        <p><span dangerouslySetInnerHTML={{ __html: "Écrivez à <strong>arazzoinscription@gmail.com</strong>." }} /></p>
      </LegalSection>

      <LegalSection title="Retrait d’un compte social">
        <p><span dangerouslySetInnerHTML={{ __html: "Retirer l’accès depuis Facebook, Instagram, TikTok ou Pinterest suffit : le jeton correspondant devient inutilisable, et le compte est déconnecté ici." }} /></p>
      </LegalSection>

      <p className="mt-10 text-sm text-gray-500 font-dm">
        <span dangerouslySetInnerHTML={{ __html: "Arazzo OS — arazzoinscription@gmail.com" }} />
      </p>
    </LegalShell>
  );
}
