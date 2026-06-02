import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import Link from "next/link";

export const metadata = {
  title: "À propos — Arazzo Formation",
  description: "L'académie en ligne du Maghreb pour la couture, le modélisme et le patronage.",
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
              Nous réunissons les meilleures formatrices d'Alger, Casablanca et
              Tunis pour transmettre un savoir-faire artisanal d'exception — du
              premier point de couture jusqu'à la création de pièces haute couture.
            </p>
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
