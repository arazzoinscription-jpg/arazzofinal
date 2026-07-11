import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "À propos — Arazzo Formation",
  description:
    "Arazzo Formation, fondée par Noudjoud Mezaghcha : l'académie en ligne du Maghreb pour la couture, le modélisme et le patronage.",
};

export default function AProposPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream-DEFAULT">
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-DEFAULT to-violet-700 pt-28 pb-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="text-5xl mb-5">✂️</div>
            <h1 className="font-playfair text-4xl lg:text-5xl font-bold text-white mb-4">
              Notre histoire
            </h1>
            <p className="text-violet-200 text-xl font-dm">
              L'académie en ligne du Maghreb — du modèle au métier
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Mission */}
          <div className="bg-white rounded-3xl p-8 lg:p-10 border border-cream-200 mb-8">
            <h2 className="font-playfair text-2xl font-bold text-gray-900 mb-4">
              Notre mission
            </h2>
            <p className="text-gray-700 leading-relaxed font-dm mb-4">
              Arazzo Formation est née d'une conviction simple : chaque femme du
              Maghreb mérite d'accéder à une formation professionnelle de qualité
              en couture et modélisme, depuis chez elle, à son rythme.
            </p>
            <p className="text-gray-700 leading-relaxed font-dm">
              Nous réunissons les meilleures formatrices de toute l'Algérie
              pour transmettre un savoir-faire artisanal d'exception — du
              premier point de couture jusqu'à la création de pièces haute couture.
            </p>
          </div>

          {/* Fondatrice */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-cream-200 mb-8">
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start">
              <div className="shrink-0">
                <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-3xl overflow-hidden ring-4 ring-violet-100 shadow-lg">
                  <Image
                    src="/images/fondatrice.png"
                    alt="Noudjoud Mezaghcha, fondatrice d'Arazzo Formation"
                    fill
                    sizes="192px"
                    className="object-cover"
                  />
                </div>
                <div className="text-center mt-3">
                  <p className="font-playfair font-bold text-gray-900">Noudjoud Mezaghcha</p>
                  <p className="text-sm text-violet-700 font-dm">Fondatrice &amp; formatrice</p>
                </div>
              </div>
              <div className="flex-1">
                <span className="inline-block text-xs font-bold uppercase tracking-wider text-orange-DEFAULT bg-orange-50 px-3 py-1 rounded-full mb-3">
                  Le mot de la fondatrice
                </span>
                <h2 className="font-playfair text-2xl font-bold text-gray-900 mb-4">
                  Entre le fil et le code
                </h2>
                <div className="space-y-4 text-gray-700 leading-relaxed font-dm">
                  <p>
                    Mon chemin m'a menée, à pas feutrés, vers ma place entre deux
                    mondes : celui de la technologie, aux lignes précises, et celui
                    de la couture, aux fils délicats. Avec le temps, j'ai compris que
                    je n'avais pas à choisir — je pouvais appartenir aux deux à la fois.
                  </p>
                  <p>
                    J'ai étudié l'ingénierie en informatique, et j'y ai découvert, en
                    parallèle, ma véritable passion : le stylisme, là où la logique
                    rencontre la créativité. De ce mélange est née ma marque,{" "}
                    <strong>Arazzo</strong>, inspirée de mon prénom : « Noudjoud »
                    signifie à l'origine <em>l'étoffe</em>, comme si le destin avait
                    tissé mon chemin pour me révéler que le fil faisait partie de mon
                    identité depuis le tout début.
                  </p>
                  <p>
                    Convaincue que la créativité s'épanouit lorsqu'elle se partage,
                    j'ai d'abord ouvert un centre de formation en présentiel, puis
                    élargi ma vision à une plateforme numérique de formation à
                    distance — pour que l'opportunité soit accessible à toutes,
                    où qu'elles soient.
                  </p>
                  <p>
                    Avec Arazzo, j'aspire à offrir une expérience unique qui mêle la
                    technique et l'art, la modernité et l'authenticité, pour offrir aux
                    passionnées de couture et de design un voyage différent, plein de
                    passion et d'inspiration.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Valeurs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            {[
              { icon: "🎬", title: "Pédagogie", text: "Vidéos pas-à-pas filmées en atelier" },
              { icon: "📐", title: "Précision", text: "Patrons numériques aux mesures FR/EU/DZ" },
              { icon: "🤝", title: "Communauté", text: "+12 000 étudiantes actives au Maghreb" },
            ].map((v) => (
              <div key={v.title} className="bg-white rounded-2xl p-6 border border-cream-200 text-center">
                <div className="text-4xl mb-3">{v.icon}</div>
                <h3 className="font-playfair font-bold text-gray-900 mb-1">{v.title}</h3>
                <p className="text-sm text-gray-500 font-dm">{v.text}</p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="bg-gradient-to-br from-violet-DEFAULT to-violet-700 rounded-3xl p-8 text-center">
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: "+12 000", label: "Étudiantes" },
                { value: "127",     label: "Cours" },
                { value: "4,8/5",   label: "Note moyenne" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="font-playfair text-3xl font-bold text-white">{s.value}</div>
                  <div className="text-violet-200 text-sm font-dm mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-10">
            <Link href="/register"
              className="inline-block bg-orange-DEFAULT text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-colors font-dm"
            >
              Rejoindre Arazzo Formation
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
