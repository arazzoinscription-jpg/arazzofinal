import type { ReactNode } from "react";
import Link from "next/link";
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

export const metadata = {
  title: "Centre d'aide (FAQ) — Arazzo Formation",
  description: "Réponses aux questions les plus fréquentes sur Arazzo Formation.",
};

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "Qui peut s'inscrire aux formations Arazzo ?",
    a: "Toute personne passionnée par la couture ou le stylisme peut s'inscrire, débutante ou expérimentée. Nos formations conviennent à tous les niveaux.",
  },
  {
    q: "Faut-il une expérience préalable en couture pour commencer ?",
    a: "Non. Vous pouvez partir de zéro. Nous proposons des cours d'initiation qui expliquent les bases pas à pas, pour passer ensuite en confiance aux niveaux avancés.",
  },
  {
    q: "De quels outils et matériaux ai-je besoin ?",
    a: "Chaque formation contient une liste détaillée du matériel requis (ciseaux, mètre ruban, tissu, machine à coudre…). Nous privilégions des outils faciles à trouver sur le marché local.",
  },
  {
    q: "Les cours sont-ils enregistrés ou en direct ?",
    a: "Les deux : des cours enregistrés que vous regardez à tout moment, et des sessions en direct (Live) qui vous permettent d'interagir avec la formatrice et de poser vos questions.",
  },
  {
    q: "Ai-je un certificat à la fin de la formation ?",
    a: "Oui. À la réussite de la formation, vous recevez un certificat numérique délivré par Arazzo attestant de votre compétence. Un diplôme physique peut aussi être demandé.",
  },
  {
    q: "Comment accéder aux cours après l'inscription ?",
    a: "Après le paiement, connectez-vous à votre compte à tout moment et suivez les cours depuis votre téléphone, ordinateur ou tablette, sans limite de temps.",
  },
  {
    q: "Puis-je télécharger les vidéos sur mon appareil ?",
    a: "Afin de protéger les droits de propriété intellectuelle des formatrices, les vidéos ne sont pas téléchargeables, mais vous pouvez les regarder de façon illimitée depuis la plateforme.",
  },
  {
    q: "Puis-je échanger avec la formatrice pendant l'apprentissage ?",
    a: "Oui, vous pouvez envoyer vos questions via la section commentaires ou lors des sessions en direct lorsqu'elles sont disponibles.",
  },
  {
    q: "Puis-je demander une formation ou un programme sur-mesure ?",
    a: (
      <>
        Bien sûr ! Contactez-nous via la page{" "}
        <Link href="/contact" className="text-violet-700 underline">Contact</Link> pour
        concevoir une formation adaptée à vos besoins ou objectifs professionnels.
      </>
    ),
  },
  {
    q: "Comment payer les formations ?",
    a: "En Algérie, nous proposons plusieurs moyens de paiement sûrs et pratiques : CCP (compte courant postal), BaridiMob (transfert depuis l'application de la Poste), paiement par carte, ou virement. Après paiement, une confirmation active votre inscription.",
  },
];

export default function AidePage() {
  return (
    <LegalShell title="Centre d'aide" subtitle="Les questions fréquentes">
      {FAQ.map((f, i) => (
        <LegalSection key={i} title={`${i + 1}. ${f.q}`}>
          <p>{f.a}</p>
        </LegalSection>
      ))}

      <div className="mt-10 rounded-2xl bg-violet-50 border border-violet-100 p-6 text-center">
        <p className="font-dm text-gray-700 mb-3">Vous ne trouvez pas votre réponse&nbsp;?</p>
        <Link
          href="/contact"
          className="inline-block bg-orange-DEFAULT text-white px-6 py-3 rounded-2xl font-bold hover:bg-orange-600 transition-colors font-dm"
        >
          📩 Écrivez-nous
        </Link>
      </div>
    </LegalShell>
  );
}
