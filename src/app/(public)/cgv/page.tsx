import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

export const metadata = {
  title: "Conditions de vente & remboursement — Arazzo Formation",
  description:
    "Modalités de paiement, d'accès et de remboursement sur Arazzo Formation.",
};

export default function CgvPage() {
  return (
    <LegalShell
      title="Paiement & remboursement"
      subtitle="Conditions générales de vente"
      updated="11 juillet 2026"
    >
      <p className="mb-8 text-gray-700 leading-relaxed font-dm">
        Bienvenue sur la plateforme Arazzo. Nous nous efforçons d'offrir une
        expérience d'achat et d'apprentissage fluide et sûre à tous nos
        utilisateurs, dans le respect des droits de chacun (client et plateforme).
        Cette politique précise les conditions de paiement, d'accès et de
        remboursement sur notre site.
      </p>

      <LegalSection title="1. Formations en ligne">
        <p>
          Nous veillons à ce que l'expérience d'apprentissage soit efficace et
          flexible. Par conséquent&nbsp;:
        </p>
        <ul className="list-disc ps-5 space-y-1.5">
          <li>✅ Le client peut demander un remboursement dans un délai maximum de <strong>48&nbsp;heures</strong> après l'inscription, à condition de ne pas avoir commencé les cours ni téléchargé de contenu pédagogique.</li>
          <li>❌ Aucun remboursement ni échange n'est possible une fois le suivi commencé ou les fichiers pédagogiques téléchargés.</li>
          <li>🧾 En cas de problème technique empêchant l'accès à un cours, celui-ci sera vérifié, puis résolu ou remboursé partiellement ou totalement selon la situation.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Produits et offres promotionnelles">
        <p>
          Lorsqu'un produit ou un cours est obtenu dans le cadre d'une offre
          promotionnelle ou d'une remise spéciale, les conditions de remboursement
          sont soumises aux termes de l'offre annoncée au moment de l'achat.
        </p>
      </LegalSection>

      <LegalSection title="3. Patrons numériques et sur-mesure">
        <p>
          Les patrons numériques, étant des fichiers téléchargeables livrés
          immédiatement, ne sont pas remboursables une fois téléchargés. Les commandes
          de patrons personnalisés (sur-mesure) ne sont pas remboursables une fois la
          réalisation commencée.
        </p>
      </LegalSection>

      <LegalSection title="4. Comment demander un remboursement">
        <p>Pour un traitement rapide de votre demande, veuillez suivre ces étapes&nbsp;:</p>
        <ul className="list-disc ps-5 space-y-1.5">
          <li>Envoyer un e-mail à <a href="mailto:info@formation-arazzo.store" className="text-violet-700 underline">info@formation-arazzo.store</a>.</li>
          <li>Indiquer le numéro de commande ou l'adresse e-mail associée au compte.</li>
          <li>Préciser clairement le motif de la demande ou la nature du problème.</li>
        </ul>
        <p>
          Notre équipe examinera la demande et vous répondra dans un délai maximum de
          <strong> 3 jours ouvrables</strong>.
        </p>
      </LegalSection>

      <LegalSection title="5. Modification de la politique">
        <p>
          Arazzo se réserve le droit de modifier cette politique de temps à autre, en
          conformité avec les lois et les évolutions techniques. La poursuite de
          l'utilisation du site après publication d'une modification vaut acceptation
          de la nouvelle version.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
