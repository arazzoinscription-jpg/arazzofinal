import Link from "next/link";
import { Users, Heart, Play, ArrowRight, Sparkles } from "lucide-react";

const T = {
  fr: {
    eyebrow: "La communauté Arazzo",
    title: "Rejoignez une communauté de créatrices",
    desc: "Partagez vos réalisations, suivez l'aventure des autres élèves, échangez dans les groupes et restez inspirée au quotidien.",
    cta: "Découvrir la communauté",
    chips: ["Feed vidéo", "Actualités", "Groupes", "Travaux d'élèves"],
  },
  ar: {
    eyebrow: "مجتمع أرازو",
    title: "انضمّي إلى مجتمع من المبدعات",
    desc: "شاركي أعمالك، تابعي رحلة بقية الطالبات، تبادلي في المجموعات، وابقي مُلهَمة كل يوم.",
    cta: "اكتشفي المجتمع",
    chips: ["فيديو", "الأخبار", "المجموعات", "أعمال الطالبات"],
  },
  en: {
    eyebrow: "The Arazzo community",
    title: "Join a community of makers",
    desc: "Share your work, follow other students' journeys, chat in groups and stay inspired every day.",
    cta: "Explore the community",
    chips: ["Video feed", "News", "Groups", "Student work"],
  },
} as const;

export function CommunityCtaSection({ lang = "fr" }: { lang?: "fr" | "ar" | "en" }) {
  const t = T[lang];
  const rtl = lang === "ar";
  return (
    <section className="py-20 px-4" dir={rtl ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-violet-DEFAULT via-violet-700 to-orange-500 px-6 py-14 sm:px-14 shadow-2xl">
          {/* Trame patron */}
          <div aria-hidden className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)",
              backgroundSize: "26px 26px",
            }} />
          <div aria-hidden className="absolute -top-20 end-[6%] w-72 h-72 rounded-full bg-orange-300/30 blur-3xl" />

          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.2em] text-white/80 bg-white/10 border border-white/20 rounded-full px-3 py-1">
                <Sparkles size={13} /> {t.eyebrow}
              </span>
              <h2 className="mt-4 font-playfair text-3xl sm:text-4xl font-bold text-white leading-tight">{t.title}</h2>
              <p className="mt-4 text-white/85 font-dm leading-relaxed max-w-lg">{t.desc}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {t.chips.map((c) => (
                  <span key={c} className="text-xs font-semibold text-white/90 bg-white/10 border border-white/20 rounded-full px-3 py-1">{c}</span>
                ))}
              </div>
              <Link href="/communaute"
                className="mt-7 inline-flex items-center gap-2 bg-white text-violet-800 font-semibold px-6 py-3 rounded-2xl hover:bg-white/90 transition-colors shadow-lg">
                {t.cta} {rtl ? <ArrowRight size={18} className="rotate-180" /> : <ArrowRight size={18} />}
              </Link>
            </div>

            {/* Mockup feed */}
            <div className="relative hidden lg:block">
              <div className="mx-auto w-56 h-[22rem] rounded-[2rem] bg-black/30 border border-white/20 backdrop-blur-md shadow-2xl overflow-hidden rotate-3">
                <div className="h-full flex flex-col items-center justify-center gap-4 text-white/90">
                  <Play size={40} className="opacity-80" />
                  <div className="flex gap-5">
                    <span className="inline-flex flex-col items-center gap-1 text-xs"><Heart size={20} /> 1.2K</span>
                    <span className="inline-flex flex-col items-center gap-1 text-xs"><Users size={20} /> 162</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
