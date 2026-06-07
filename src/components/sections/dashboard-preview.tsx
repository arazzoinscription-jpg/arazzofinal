export function DashboardPreview() {
  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-playfair text-4xl font-bold text-gray-900 mb-6">
              Votre espace personnel
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              Un tableau de bord clair pour suivre votre progression, accéder
              à vos cours, télécharger vos patrons et récupérer vos certificats.
            </p>
            <ul className="space-y-4">
              {[
                { icon: "📊", text: "Barre de progression par cours" },
                { icon: "▶️", text: "Lecteur vidéo avec reprise automatique" },
                { icon: "📄", text: "Patrons PDF téléchargeables" },
                { icon: "🎓", text: "Certificats de réussite en PDF" },
              ].map((f) => (
                <li key={f.text} className="flex items-center gap-3">
                  <span className="text-2xl">{f.icon}</span>
                  <span className="text-gray-700 font-medium">{f.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Dashboard mockup */}
          <div className="relative">
            <div className="bg-cream-50 rounded-3xl border border-cream-200 overflow-hidden shadow-2xl">
              {/* Sidebar */}
              <div className="flex">
                <div className="w-48 bg-[#1a1a2e] p-4 min-h-80">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-orange-DEFAULT">✂️</span>
                    <span className="text-white font-bold text-sm">ARAZZO</span>
                  </div>
                  {["Mes cours", "Patrons", "Certificats", "Profil"].map(
                    (item, i) => (
                      <div
                        key={item}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 text-sm ${
                          i === 0
                            ? "bg-orange-DEFAULT text-white"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        <span>{["📚", "📄", "🎓", "👤"][i]}</span>
                        <span>{item}</span>
                      </div>
                    )
                  )}
                </div>

                {/* Main content */}
                <div className="flex-1 p-6">
                  <h3 className="font-playfair font-bold text-gray-900 mb-4">
                    Mes cours
                  </h3>

                  {/* Course progress cards */}
                  {[
                    {
                      title: "Caftan Brodé",
                      progress: 67,
                      color: "from-violet-500 to-violet-600",
                    },
                    {
                      title: "Djellaba Moderne",
                      progress: 32,
                      color: "from-orange-400 to-orange-500",
                    },
                  ].map((c) => (
                    <div
                      key={c.title}
                      className="bg-white rounded-xl p-4 mb-3 border border-cream-200"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-gray-700">
                          {c.title}
                        </span>
                        <span className="text-xs text-orange-600 font-bold">
                          {c.progress}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${c.color} rounded-full`}
                          style={{ width: `${c.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating cert badge */}
            <div className="absolute -bottom-4 -right-4 bg-white border border-cream-200 shadow-xl rounded-2xl p-4 flex items-center gap-3">
              <span className="text-3xl">🎓</span>
              <div>
                <div className="text-xs text-gray-400">Certificat disponible</div>
                <div className="text-sm font-bold text-gray-900">Caftan Brodé</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
