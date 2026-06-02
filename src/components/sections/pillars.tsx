export function PillarsSection() {
  const pillars = [
    {
      icon: "🎬",
      title: "Vidéos HD",
      titleAr: "فيديوهات عالية الجودة",
      description:
        "Des cours vidéo professionnels, regardez à votre rythme, depuis n'importe quel appareil. Hébergés sur Bunny.net pour une lecture fluide partout au Maghreb.",
    },
    {
      icon: "📄",
      title: "Patrons Numériques",
      titleAr: "البترونات الرقمية",
      description:
        "Téléchargez des patrons PDF prêts à imprimer, créés par nos formateurs experts. Tailles ajustées pour les morphologies maghrébines.",
    },
    {
      icon: "🎓",
      title: "Espace Formateur",
      titleAr: "منصة المكونين",
      description:
        "Monétisez votre expertise. Créez vos cours, gérez vos élèves et recevez vos revenus en DZD ou en EUR directement sur votre compte.",
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="font-playfair text-4xl font-bold text-gray-900 mb-4">
            Tout ce qu'il vous faut pour apprendre
          </h2>
          <p className="text-gray-500 text-lg">
            Trois piliers pour une formation complète
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="group relative bg-cream-50 rounded-3xl p-8 border border-cream-200 hover:border-violet-300 hover:shadow-xl transition-all duration-300"
            >
              <div className="text-5xl mb-5">{p.icon}</div>
              <h3 className="font-playfair text-2xl font-bold text-gray-900 mb-1">
                {p.title}
              </h3>
              <p className="text-sm text-orange-DEFAULT font-arabic text-right mb-4" dir="rtl">
                {p.titleAr}
              </p>
              <p className="text-gray-600 leading-relaxed">{p.description}</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-orange-400 rounded-b-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
