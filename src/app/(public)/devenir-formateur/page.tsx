import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "Devenir formateur — Arazzo Formation",
};

export default function DevenirFormateurPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream-DEFAULT">
        <div className="bg-gradient-to-br from-violet-DEFAULT to-violet-700 pt-24 pb-20">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="text-6xl mb-6">🎓</div>
            <h1 className="font-playfair text-4xl lg:text-5xl font-bold text-white mb-6">
              Devenez formateur sur Arazzo
            </h1>
            <p className="text-violet-200 text-xl leading-relaxed">
              Partagez votre expertise en couture et broderie avec des milliers
              d'apprenantes du Maghreb et de sa diaspora.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {[
              {
                icon: "💰",
                title: "Revenus récurrents",
                text: "Percevez des commissions sur chaque vente de vos cours et patrons, en DZD ou en EUR selon vos élèves.",
              },
              {
                icon: "📊",
                title: "Dashboard complet",
                text: "Suivez vos ventes, vos élèves et vos revenus en temps réel avec des statistiques détaillées.",
              },
              {
                icon: "🎬",
                title: "Hébergement vidéo inclus",
                text: "Vos vidéos sont hébergées sur Bunny.net, optimisées pour le Maghreb. Pas de frais supplémentaires.",
              },
              {
                icon: "🌍",
                title: "Audience internationale",
                text: "Touchez toute l'Algérie et la diaspora en France, Belgique, Canada et ailleurs.",
              },
            ].map((b) => (
              <div
                key={b.title}
                className="bg-white rounded-2xl p-6 border border-cream-200 hover:shadow-lg transition-all"
              >
                <div className="text-4xl mb-4">{b.icon}</div>
                <h3 className="font-playfair text-xl font-bold text-gray-900 mb-2">
                  {b.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">{b.text}</p>
              </div>
            ))}
          </div>

          {/* Application form */}
          <div className="bg-white rounded-3xl p-8 lg:p-12 border border-cream-200 shadow-xl">
            <h2 className="font-playfair text-3xl font-bold text-gray-900 mb-2">
              Candidater
            </h2>
            <p className="text-gray-500 mb-8">
              Remplissez ce formulaire et notre équipe vous contactera dans les 48h.
            </p>

            <form className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet *</label>
                  <input
                    type="text"
                    required
                    placeholder="Amina Benali"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="amina@exemple.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Pays *</label>
                  <select className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                    {["🇩🇿 Algérie", "🇲🇦 Maroc", "🇹🇳 Tunisie", "🇫🇷 France", "🇧🇪 Belgique", "🌍 Autre"].map(p => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Spécialité *</label>
                  <select className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                    {["Couture traditionnelle", "Caftan", "Modélisme", "Broderie", "Djellaba", "Patronage", "Autre"].map(s => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Décrivez votre expérience *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Parlez-nous de votre parcours, votre expérience en couture et pourquoi vous souhaitez enseigner…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Vos réseaux sociaux ou portfolio (optionnel)
                </label>
                <input
                  type="url"
                  placeholder="Instagram, YouTube, TikTok…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-orange-DEFAULT text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-colors"
              >
                Envoyer ma candidature
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
