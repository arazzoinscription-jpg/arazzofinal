import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

export const metadata = {
  title: "Conditions générales d'utilisation — Arazzo Formation",
  description:
    "Les règles d'utilisation de la plateforme Arazzo Formation.",
};

export default function CguPage() {
  return (
    <LegalShell
      title="Conditions générales d'utilisation"
      subtitle="Les règles d'usage de la plateforme"
      updated="11 juillet 2026"
    >
      <p className="mb-8 text-gray-700 leading-relaxed font-dm">
        Bienvenue sur Arazzo, plateforme éducative numérique de formation et de
        design. En accédant au site ou en utilisant nos services (via le site web
        ou l'application), vous acceptez pleinement les présentes conditions ainsi
        que notre <a href="/confidentialite" className="text-violet-700 underline">politique de confidentialité</a>.
        Merci de les lire attentivement&nbsp;; si vous n'acceptez pas l'une de ces
        clauses, veuillez ne pas utiliser nos services.
      </p>

      <LegalSection title="1. Nos services">
        <p>Arazzo propose des services de formation et d'enseignement en ligne, notamment&nbsp;:</p>
        <ul className="list-disc ps-5 space-y-1.5">
          <li>Des cours numériques en design, couture et création de patrons.</li>
          <li>Le téléchargement et l'achat de patrons numériques prêts à l'emploi.</li>
          <li>La demande de patrons personnalisés (sur-mesure).</li>
          <li>Du contenu pédagogique (vidéos, articles, fichiers téléchargeables).</li>
          <li>La participation à la communauté et aux groupes de discussion des membres.</li>
        </ul>
        <p>
          Arazzo se réserve le droit de développer, modifier ou interrompre l'un de
          ces services à tout moment, sans préavis.
        </p>
      </LegalSection>

      <LegalSection title="2. Inscription et compte">
        <p>Pour accéder à certains services, la création d'un compte peut être requise. En vous inscrivant, vous acceptez de&nbsp;:</p>
        <ul className="list-disc ps-5 space-y-1.5">
          <li>Fournir des informations exactes, à jour et complètes.</li>
          <li>Préserver la confidentialité de vos identifiants (nom d'utilisateur et mot de passe).</li>
          <li>Ne pas partager votre compte avec un tiers.</li>
        </ul>
        <p>
          Arazzo peut suspendre ou supprimer tout compte qui enfreint ces conditions
          ou utilise la plateforme de manière illégale ou nuisible à autrui.
        </p>
      </LegalSection>

      <LegalSection title="3. Utilisation de la plateforme">
        <p>En utilisant la plateforme, vous vous engagez à&nbsp;:</p>
        <ul className="list-disc ps-5 space-y-1.5">
          <li>Ne pas copier, distribuer ou republier un contenu pédagogique sans autorisation écrite préalable d'Arazzo.</li>
          <li>Utiliser le site à des fins éducatives et personnelles uniquement.</li>
          <li>Vous abstenir de publier tout contenu inapproprié, illégal ou contraire aux bonnes mœurs.</li>
          <li>Ne pas tenter de pirater ou de perturber la plateforme.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Propriété intellectuelle">
        <p>
          L'ensemble des contenus (vidéos, patrons, textes, marques, logos) est la
          propriété exclusive d'Arazzo ou de ses formateurs partenaires, et est
          protégé par le droit d'auteur. Toute reproduction non autorisée est
          strictement interdite.
        </p>
      </LegalSection>

      <LegalSection title="5. Paiements">
        <p>
          Les modalités de paiement, d'accès aux cours et de remboursement sont
          détaillées dans nos&nbsp;
          <a href="/cgv" className="text-violet-700 underline">conditions générales de vente</a>.
        </p>
      </LegalSection>

      <LegalSection title="6. Responsabilité">
        <p>
          Arazzo met tout en œuvre pour assurer la disponibilité et la qualité de
          ses services, sans toutefois garantir un fonctionnement ininterrompu ou
          exempt d'erreurs. Arazzo ne saurait être tenue responsable d'un usage non
          conforme de la plateforme par l'utilisateur.
        </p>
      </LegalSection>

      <LegalSection title="7. Modification des conditions">
        <p>
          Arazzo peut modifier ces conditions à tout moment. La poursuite de
          l'utilisation du site après publication d'une modification vaut acceptation
          de la nouvelle version.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
