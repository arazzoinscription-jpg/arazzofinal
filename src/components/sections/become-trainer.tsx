import Link from "next/link";

export function BecomeTrainerSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-violet-DEFAULT to-violet-700 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="p-12 lg:p-16">
              <span className="inline-block bg-white/20 text-white text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
                Pour les expertes
              </span>
              <h2 className="font-playfair text-4xl font-bold text-white mb-6">
                Partagez votre expertise, générez vos revenus
              </h2>
              <p className="text-violet-200 text-lg leading-relaxed mb-8">
                Rejoignez notre réseau de formateurs et monétisez votre
                savoir-faire. Créez vos cours, vendez vos patrons et percevez
                vos revenus directement en DZD ou en EUR.
              </p>
              <ul className="space-y-3 mb-10">
                {[
                  "Commissions attractives sur chaque vente",
                  "Dashboard formateur complet avec statistiques",
                  "Paiements DZD (Chargily) ou EUR (Stripe)",
                  "Hébergement vidéo sur Bunny.net inclus",
                  "Accompagnement à la création de contenu",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-white">
                    <span className="text-orange-DEFAULT font-bold">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/devenir-formateur"
                className="inline-block bg-orange-DEFAULT text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-all hover:shadow-xl"
              >
                Devenir formateur →
              </Link>
            </div>

            <div className="relative hidden lg:flex items-center justify-center p-12">
              {/* Stats cards */}
              <div className="absolute top-10 right-10 bg-white rounded-2xl p-5 shadow-xl">
                <div className="text-3xl font-bold font-playfair text-orange-600">
                  127
                </div>
                <div className="text-sm text-gray-500">Formations publiées</div>
              </div>
              <div className="absolute bottom-10 left-10 bg-white rounded-2xl p-5 shadow-xl">
                <div className="text-3xl font-bold font-playfair text-orange-DEFAULT">
                  +12K
                </div>
                <div className="text-sm text-gray-500">Élèves actifs</div>
              </div>
              <div className="text-center">
                <div className="text-9xl">🧵</div>
                <p className="text-violet-200 font-playfair text-xl mt-4 italic">
                  Votre talent mérite d&rsquo;être partagé
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
