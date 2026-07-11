import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

export const metadata = {
  title: "Politique de confidentialité — Arazzo Formation",
  description:
    "Comment Arazzo Formation collecte, utilise et protège vos données personnelles.",
};

export default function ConfidentialitePage() {
  return (
    <LegalShell
      title="Politique de confidentialité"
      subtitle="Vos données, notre responsabilité"
      updated="11 juillet 2026"
    >
      <p className="mb-8 text-gray-700 leading-relaxed font-dm">
        Chez Arazzo Formation (« Arazzo », « nous »), la protection de votre vie
        privée est une priorité. Cette politique explique quelles données nous
        collectons, pourquoi, comment nous les utilisons et quels sont vos droits.
      </p>

      <LegalSection title="1. Responsable du traitement">
        <p>
          Le responsable du traitement des données est <strong>Arazzo Formation</strong>,
          plateforme éditée par Noudjoud Mezaghcha. Pour toute question relative à vos
          données, contactez-nous à&nbsp;
          <a href="mailto:info@formation-arazzo.store" className="text-violet-700 underline">
            info@formation-arazzo.store
          </a>.
        </p>
      </LegalSection>

      <LegalSection title="2. Données que nous collectons">
        <ul className="list-disc ps-5 space-y-1.5">
          <li><strong>Compte&nbsp;:</strong> nom, adresse e-mail, mot de passe (chiffré), numéro de téléphone, ville/wilaya.</li>
          <li><strong>Formation&nbsp;:</strong> cours suivis, progression, travaux pratiques envoyés, quiz, certificats et diplômes.</li>
          <li><strong>Paiements&nbsp;:</strong> historique de commandes et de factures. Les données bancaires sont traitées directement par nos prestataires de paiement — nous ne stockons jamais votre numéro de carte.</li>
          <li><strong>Communauté&nbsp;:</strong> publications, commentaires, mentions « j'aime », photos et vidéos que vous choisissez de partager.</li>
          <li><strong>Techniques&nbsp;:</strong> adresse IP, type de navigateur, pages consultées (statistiques de fréquentation), cookies de session.</li>
          <li><strong>Diplôme&nbsp;:</strong> pièce d'identité (CNI) et adresse de livraison, uniquement lorsque vous demandez un diplôme physique.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Comment nous utilisons vos données">
        <ul className="list-disc ps-5 space-y-1.5">
          <li>Créer et gérer votre compte et votre accès aux formations.</li>
          <li>Suivre votre progression, corriger vos travaux et délivrer vos certificats.</li>
          <li>Traiter vos paiements, commandes et livraisons.</li>
          <li>Vous envoyer des notifications et e-mails liés à votre apprentissage (selon vos préférences).</li>
          <li>Assurer la sécurité, prévenir la fraude et le partage de compte.</li>
          <li>Améliorer nos services grâce à des statistiques anonymisées.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Prestataires et hébergement">
        <p>
          Pour fonctionner, la plateforme s'appuie sur des prestataires techniques
          de confiance, qui traitent certaines données pour notre compte&nbsp;:
        </p>
        <ul className="list-disc ps-5 space-y-1.5">
          <li><strong>Supabase</strong> — base de données et authentification.</li>
          <li><strong>Bunny.net</strong> — hébergement et diffusion des vidéos de cours.</li>
          <li><strong>Resend</strong> — envoi des e-mails transactionnels.</li>
          <li><strong>Prestataires de paiement</strong> (Chargily, PayPal) — traitement sécurisé des paiements.</li>
          <li><strong>Vercel</strong> — hébergement de l'application.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Partage des données">
        <p>
          Nous ne vendons ni ne louons jamais vos données personnelles. Elles ne
          sont partagées qu'avec les prestataires ci-dessus, ou lorsque la loi
          l'exige. Les informations que vous publiez volontairement dans la
          communauté sont visibles publiquement.
        </p>
      </LegalSection>

      <LegalSection title="6. Durée de conservation">
        <p>
          Vos données sont conservées tant que votre compte est actif. Vous pouvez
          demander la suppression de votre compte à tout moment&nbsp;; certaines
          données (factures) peuvent être conservées pour répondre à nos
          obligations légales.
        </p>
      </LegalSection>

      <LegalSection title="7. Vos droits">
        <p>
          Vous disposez d'un droit d'accès, de rectification, de suppression et
          d'opposition sur vos données. Vous pouvez aussi gérer vos préférences
          d'e-mails depuis votre espace. Pour exercer ces droits, écrivez à&nbsp;
          <a href="mailto:info@formation-arazzo.store" className="text-violet-700 underline">
            info@formation-arazzo.store
          </a>.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies">
        <p>
          Nous utilisons des cookies strictement nécessaires (session, sécurité) et
          des cookies de mesure d'audience anonymisée. Vous pouvez les gérer depuis
          les réglages de votre navigateur.
        </p>
      </LegalSection>

      <LegalSection title="9. Modifications">
        <p>
          Cette politique peut être mise à jour pour refléter des évolutions légales
          ou techniques. La date de dernière mise à jour figure en haut de page.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
