"use client";

import Link from "next/link";
import Image from "next/image";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-blush-mesh">

      {/* ── Décor de fond ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* halos doux */}
        <div className="absolute -top-40 -right-32 w-[640px] h-[640px] rounded-full bg-blush-300/30 blur-3xl animate-float-slow" style={{ ["--r" as any]: "0deg" }} />
        <div className="absolute top-1/4 -left-24 w-96 h-96 rounded-full bg-violet-DEFAULT/10 blur-3xl animate-float" />
        <div className="absolute -bottom-24 right-1/4 w-80 h-80 rounded-full bg-orange-DEFAULT/10 blur-3xl animate-float-slow" />

        {/* arcs de couture pointillés */}
        <svg className="absolute top-20 right-10 w-72 h-72 opacity-30" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="90" stroke="#C96FA0" strokeWidth="1.5" strokeDasharray="6 8" />
          <circle cx="100" cy="100" r="64" stroke="#4B3BC7" strokeWidth="1" strokeDasharray="4 7" />
        </svg>
        <svg className="absolute bottom-16 left-8 w-40 h-40 opacity-25 animate-spin-slow" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="46" stroke="#E07840" strokeWidth="1.5" strokeDasharray="5 6" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* ── GAUCHE : texte ── */}
          <div>
            {/* Badge */}
            <div className="fade-up inline-flex items-center gap-2 glass border border-white/60 rounded-full px-4 py-2 mb-7 shadow-soft">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-orange-DEFAULT opacity-60 animate-ping" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-DEFAULT" />
              </span>
              <span className="text-violet-700 text-sm font-semibold font-dm tracking-wide">
                ✦ L'académie en ligne du Maghreb
              </span>
            </div>

            {/* Titre */}
            <h1 className="fade-up-1 font-playfair text-[2.9rem] sm:text-6xl font-bold text-gray-900 leading-[1.05] mb-5">
              Le fil de{" "}
              <span className="relative inline-block">
                <span className="text-gradient-rose italic">votre talent</span>
                <svg className="absolute -bottom-3 left-0 w-full" height="12" viewBox="0 0 300 12" fill="none">
                  <path d="M3 8 Q75 2 150 7 Q225 12 297 4" stroke="#E07840" strokeWidth="3.5" strokeLinecap="round" fill="none" strokeDasharray="2 6"/>
                </svg>
              </span>
              <br/>
              <span className="text-gray-900">du modèle au métier.</span>
            </h1>

            {/* Sous-titre arabe */}
            <p className="fade-up-1 text-right text-xl text-blush-500 font-playfair italic mb-6" dir="rtl">
              خيط موهبتك — من الباترون إلى الحرفة
            </p>

            <p className="fade-up-2 text-gray-600 text-lg leading-relaxed mb-9 max-w-xl font-dm">
              Apprenez la <strong className="text-violet-DEFAULT font-semibold">couture</strong>, le{" "}
              <strong className="text-violet-DEFAULT font-semibold">modélisme</strong> et le{" "}
              <strong className="text-violet-DEFAULT font-semibold">patronage</strong> avec des
              formatrices d'Alger, Casablanca et Tunis. Patrons numériques inclus,
              certifié par Arazzo.
            </p>

            {/* Stats */}
            <div className="fade-up-2 flex flex-wrap gap-7 mb-10">
              {[
                { value: "+12 000", label: "Étudiantes actives", icon: "👩‍🎓" },
                { value: "127",     label: "Cours publiés",       icon: "🎬" },
                { value: "4,8/5",   label: "Note moyenne",        icon: "⭐" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2.5">
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <div className="text-2xl font-bold font-playfair text-gradient leading-none">{s.value}</div>
                    <div className="text-xs text-gray-500 font-dm mt-1">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="fade-up-3 flex flex-wrap gap-4 mb-7">
              <Link href="/formations"
                className="group relative bg-gradient-to-r from-orange-DEFAULT to-orange-500 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-glow hover:shadow-2xl hover:-translate-y-0.5 transition-all font-dm overflow-hidden"
              >
                <span className="relative z-10">Découvrir les formations</span>
                <span className="relative z-10 ml-2 inline-block group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <Link href="/devenir-formateur"
                className="glass border-2 border-violet-DEFAULT/30 text-violet-DEFAULT px-8 py-4 rounded-2xl font-bold text-lg hover:bg-violet-DEFAULT hover:text-white hover:border-violet-DEFAULT transition-all font-dm"
              >
                Devenir formateur
              </Link>
            </div>

            {/* Trust */}
            <div className="fade-up-4 flex flex-wrap items-center gap-5 text-sm text-gray-500 font-dm">
              {["Paiement en DA", "Accès à vie", "Certificat PDF"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 text-xs flex items-center justify-center font-bold">✓</span>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* ── DROITE : image brandée ── */}
          <div className="relative flex justify-center lg:justify-end fade-up-2">

            {/* Cadre décoratif pointillé */}
            <div className="absolute inset-0 -m-3 rounded-[2rem] stitch-border rotate-2 hidden lg:block" />

            {/* Image principale */}
            <div className="relative w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl border-[6px] border-white animate-float-slow">
              <Image
                src="/images/hero-modelisme-1.jpg"
                alt="Modélisme Arazzo Formation"
                width={600}
                height={400}
                className="w-full h-auto object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-violet-900/20 to-transparent" />
            </div>

            {/* Badge paiement DA */}
            <div className="absolute -top-4 -left-4 bg-gradient-to-r from-orange-DEFAULT to-orange-500 text-white px-4 py-2.5 rounded-2xl font-bold text-sm shadow-glow rotate-[-4deg] font-dm animate-float">
              🇩🇿 Paiement en DA
            </div>

            {/* Card cours miniature */}
            <div className="absolute -bottom-6 -left-6 glass rounded-2xl shadow-soft border border-white/70 p-3.5 w-56 hidden lg:block animate-float-slow">
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-blush-200">
                  <Image src="/images/hero-modelisme-2.jpg" alt="cours niv2" width={48} height={48} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-dm">Niveau 1</p>
                  <p className="text-xs font-bold text-gray-900 font-dm leading-tight">Bases & Quotidien</p>
                  <p className="text-xs text-orange-DEFAULT font-bold font-dm">8 000 DA</p>
                </div>
              </div>
              <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-gradient-to-r from-violet-500 via-blush-400 to-orange-DEFAULT rounded-full" />
              </div>
              <p className="text-[10px] text-right text-violet-DEFAULT font-bold mt-1 font-dm">67% terminé</p>
            </div>

            {/* Card certif */}
            <div className="absolute top-1/4 -right-5 glass rounded-2xl shadow-soft border border-white/70 p-3 hidden lg:flex items-center gap-2 animate-float">
              <span className="text-2xl">🎓</span>
              <div>
                <p className="text-[10px] text-gray-400 font-dm">Obtenu !</p>
                <p className="text-xs font-bold text-violet-DEFAULT font-dm">Certificat PDF</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vague décorative bas */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 80" fill="none" className="w-full h-12">
          <path d="M0 40 Q360 0 720 40 T1440 40 V80 H0 Z" fill="white" fillOpacity="0.5"/>
        </svg>
      </div>
    </section>
  );
}
