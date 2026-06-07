"use client";

import { useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import {
  Check, Star, Scissors, Ruler, Award, Users, PlayCircle, ShieldCheck,
  Sparkles, ArrowRight, Quote, ChevronDown, Globe,
} from "lucide-react";

type Lang = "fr" | "ar";

// ────────────────────────────────────────────────────────────────────────
// Contenu bilingue
// ────────────────────────────────────────────────────────────────────────
const C = {
  fr: {
    dir: "ltr" as const,
    nav: { offer: "Offre de lancement", cta: "Je m'inscris", login: "Connexion" },
    hero: {
      badge: "Offre de lancement — places limitées",
      title: "Devenez la couturière que vous rêvez d'être",
      highlight: "en 8 semaines",
      sub: "La formation couture & modélisme la plus complète du Maghreb : cours filmés en atelier, patrons numériques inclus et certificat reconnu.",
      cta: "Commencer ma formation",
      note: "Paiement en DA · Accès à vie · Satisfaite ou remboursée 30 jours",
      stat1: "+12 000 élèves", stat2: "127 cours", stat3: "4,8/5",
    },
    problem: {
      title: "Vous reconnaissez-vous ?",
      items: [
        "Vous achetez du tissu… qui finit oublié dans un placard.",
        "Les tutos gratuits vous laissent avec plus de questions que de réponses.",
        "Vous rêvez de coudre vos propres modèles, mais vous ne savez pas par où commencer.",
      ],
      bridge: "Imaginez maîtriser chaque étape, du patron à la pièce finie — avec un accompagnement clair, en français et en arabe.",
    },
    learn: {
      eyebrow: "Le programme",
      title: "Ce que vous allez maîtriser",
      modules: [
        { Icon: Scissors, t: "Les bases de la couture", d: "Machine, points, finitions propres et professionnelles." },
        { Icon: Ruler, t: "Le patronage", d: "Prendre les mesures, tracer et adapter vos patrons (FR · EU · DZ)." },
        { Icon: PlayCircle, t: "Modélisme pas à pas", d: "Robes, caftans, vestes — filmés geste par geste en atelier." },
        { Icon: Award, t: "Lancer votre activité", d: "Tarifer, vendre et bâtir votre marque de couture." },
      ],
    },
    success: {
      eyebrow: "Réussites",
      title: "Elles l'ont fait — vous aussi",
      stories: [
        { name: "Amira, Alger", text: "En 2 mois j'ai cousu ma première robe de A à Z. Aujourd'hui je vends mes créations !", result: "1ʳᵉ vente en 60 jours" },
        { name: "Souhila, Oran", text: "Les patrons inclus et les explications en arabe ont tout changé pour moi.", result: "Atelier lancé chez elle" },
        { name: "Leila, Annaba", text: "Je débutais de zéro. Le certificat m'a donné la confiance pour me lancer.", result: "Certifiée & installée" },
      ],
    },
    included: {
      title: "Tout est inclus",
      items: [
        "127 cours vidéo filmés en atelier",
        "Patrons numériques téléchargeables (PDF · A0 · projecteur)",
        "Certificat reconnu à la fin",
        "Communauté privée + groupes d'entraide",
        "Accès à vie + mises à jour gratuites",
        "Suivi des formatrices (FR / AR)",
      ],
    },
    offer: {
      eyebrow: "L'offre",
      title: "Votre accès complet",
      old: "16 000 DA", price: "8 000 DA", per: "paiement unique · accès à vie",
      cta: "Je rejoins la formation",
      guarantee: "Satisfaite ou remboursée pendant 30 jours — sans question.",
      bullets: ["Toutes les formations couture & modélisme", "Tous les patrons numériques", "Certificat + communauté"],
    },
    faq: {
      title: "Questions fréquentes",
      items: [
        { q: "Je suis débutante totale, c'est pour moi ?", a: "Oui ! La formation part de zéro : machine, points, premières pièces, puis modélisme avancé." },
        { q: "Les cours sont-ils en arabe ?", a: "Oui, contenu et accompagnement en français et en arabe (FR/AR)." },
        { q: "Comment je paie depuis l'Algérie ?", a: "Paiement en DA (CCP / BaridiMob), PayPal ou à la livraison selon votre choix." },
        { q: "Pendant combien de temps ai-je accès ?", a: "À vie. Vous gardez l'accès et recevez les mises à jour gratuitement." },
      ],
    },
    finalCta: { title: "Prête à passer du fil au modèle ?", cta: "Je commence maintenant" },
    footer: "Arazzo Formation — Couture & Modélisme",
  },
  ar: {
    dir: "rtl" as const,
    nav: { offer: "عرض الإطلاق", cta: "أسجّل الآن", login: "تسجيل الدخول" },
    hero: {
      badge: "عرض الإطلاق — أماكن محدودة",
      title: "كوني الخيّاطة التي تحلمين بها",
      highlight: "في 8 أسابيع",
      sub: "أكمل تكوين في الخياطة والموديلزم في الجزائر: دروس مصوّرة في الورشة، باترونات رقمية، وشهادة معترف بها.",
      cta: "أبدأ تكويني",
      note: "الدفع بالدينار · وصول مدى الحياة · استرجاع خلال 30 يومًا",
      stat1: "+12 000 طالبة", stat2: "127 دورة", stat3: "4.8/5",
    },
    problem: {
      title: "هل تجدين نفسك هنا؟",
      items: [
        "تشترين القماش… ثم ينتهي منسيًّا في الخزانة.",
        "الدروس المجانية تتركك بأسئلة أكثر من الأجوبة.",
        "تحلمين بخياطة موديلاتك الخاصة لكنك لا تعرفين من أين تبدئين.",
      ],
      bridge: "تخيّلي أنك تتقنين كل خطوة، من الباترون إلى القطعة النهائية — بمرافقة واضحة، بالعربية والفرنسية.",
    },
    learn: {
      eyebrow: "البرنامج",
      title: "ما الذي ستتقنينه",
      modules: [
        { Icon: Scissors, t: "أساسيات الخياطة", d: "الآلة، الغرز، واللمسات النهائية الاحترافية." },
        { Icon: Ruler, t: "الباترون", d: "أخذ المقاسات، الرسم وتعديل الباترونات (FR · EU · DZ)." },
        { Icon: PlayCircle, t: "موديلزم خطوة بخطوة", d: "فساتين، قفاطين، سترات — مصوّرة حركة بحركة." },
        { Icon: Award, t: "إطلاق مشروعك", d: "التسعير، البيع، وبناء علامتك في الخياطة." },
      ],
    },
    success: {
      eyebrow: "قصص نجاح",
      title: "نجحنَ — وأنتِ كذلك",
      stories: [
        { name: "أميرة، الجزائر", text: "في شهرين خِطتُ أول فستان من الألف إلى الياء. اليوم أبيع إبداعاتي!", result: "أول بيع خلال 60 يومًا" },
        { name: "سهيلة، وهران", text: "الباترونات والشرح بالعربية غيّرا كل شيء بالنسبة لي.", result: "أطلقت ورشتها في البيت" },
        { name: "ليلى، عنابة", text: "بدأت من الصفر. الشهادة منحتني الثقة للانطلاق.", result: "متحصّلة على شهادة" },
      ],
    },
    included: {
      title: "كل شيء مُضمّن",
      items: [
        "127 درسًا مصوّرًا في الورشة",
        "باترونات رقمية للتحميل (PDF · A0 · بروجكتور)",
        "شهادة معترف بها في النهاية",
        "مجتمع خاص + مجموعات للتعاون",
        "وصول مدى الحياة + تحديثات مجانية",
        "متابعة من المدرّبات (FR / AR)",
      ],
    },
    offer: {
      eyebrow: "العرض",
      title: "وصولك الكامل",
      old: "16 000 دج", price: "8 000 دج", per: "دفعة واحدة · وصول مدى الحياة",
      cta: "أنضمّ إلى التكوين",
      guarantee: "استرجاع خلال 30 يومًا — دون أي سؤال.",
      bullets: ["كل دورات الخياطة والموديلزم", "كل الباترونات الرقمية", "شهادة + مجتمع"],
    },
    faq: {
      title: "أسئلة شائعة",
      items: [
        { q: "أنا مبتدئة تمامًا، هل هذا مناسب لي؟", a: "نعم! التكوين يبدأ من الصفر: الآلة، الغرز، أول قطعة، ثم الموديلزم المتقدّم." },
        { q: "هل الدروس بالعربية؟", a: "نعم، المحتوى والمرافقة بالفرنسية والعربية (FR/AR)." },
        { q: "كيف أدفع من الجزائر؟", a: "الدفع بالدينار (CCP / بريدي موب)، أو PayPal، أو عند التسليم حسب اختيارك." },
        { q: "كم مدة الوصول؟", a: "مدى الحياة. تحتفظين بالوصول وتتلقّين التحديثات مجانًا." },
      ],
    },
    finalCta: { title: "هل أنتِ مستعدّة للانتقال من الخيط إلى الموديل؟", cta: "أبدأ الآن" },
    footer: "أرازو للتكوين — الخياطة والموديلزم",
  },
};

export function SalesPage() {
  const [lang, setLang] = useState<Lang>("fr");
  const t = C[lang];
  const dir = t.dir;

  return (
    <div dir={dir} className="min-h-screen bg-cream-DEFAULT text-gray-900">
      {/* ── Barre supérieure ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-cream-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/images/arazzo-icon.png" alt="Arazzo" className="h-10 w-10 rounded-xl" />
            <span className="font-playfair font-bold text-lg">
              <span className="text-orange-500">Arazzo</span> <span className="text-violet-700">Formation</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 border border-cream-200 rounded-lg px-3 py-1.5 hover:bg-cream-50">
              <Globe size={15} /> {lang === "fr" ? "عربي" : "FR"}
            </button>
            <a href="#offre" className="bg-orange-DEFAULT text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-orange-600 transition-colors">
              {t.nav.cta}
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-cream-DEFAULT to-orange-50" />
        <div className="absolute -top-24 -right-20 w-[34rem] h-[34rem] rounded-full bg-orange-200/40 blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 bg-orange-DEFAULT/10 text-orange-600 font-semibold text-sm rounded-full px-4 py-1.5 mb-5">
              <Sparkles size={15} /> {t.hero.badge}
            </span>
            <h1 className="font-playfair text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] mb-5">
              {t.hero.title}{" "}
              <span className="text-orange-600 italic">{t.hero.highlight}</span>
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed mb-7 font-dm">{t.hero.sub}</p>
            <a href="#offre" className="group inline-flex items-center gap-2 bg-gradient-to-r from-orange-DEFAULT to-orange-500 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:-translate-y-0.5 transition-all">
              {t.hero.cta}
              <ArrowRight size={20} className={`transition-transform ${dir === "rtl" ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
            </a>
            <p className="text-sm text-gray-500 mt-4 font-dm">{t.hero.note}</p>
            <div className="flex flex-wrap gap-6 mt-7">
              {[t.hero.stat1, t.hero.stat2, t.hero.stat3].map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  {i === 2 ? <Star size={18} className="text-orange-DEFAULT fill-orange-DEFAULT" /> : i === 0 ? <Users size={18} className="text-violet-600" /> : <PlayCircle size={18} className="text-violet-600" />}
                  <span className="font-bold font-playfair text-gray-900">{s}</span>
                </div>
              ))}
            </div>
          </div>
          <Reveal animation={dir === "rtl" ? "left" : "right"} className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-orange-DEFAULT/30 to-violet-DEFAULT/30 rounded-[2.5rem] blur-2xl" />
            <img src="/images/mannequin-couture.jpg" alt="Atelier couture"
              className="relative rounded-[2rem] border-[6px] border-white shadow-2xl w-full h-[24rem] object-cover" />
          </Reveal>
        </div>
      </section>

      {/* ── Problème ── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <Reveal animation="up">
            <h2 className="font-playfair text-3xl sm:text-4xl font-bold mb-8">{t.problem.title}</h2>
          </Reveal>
          <div className="space-y-3 text-start">
            {t.problem.items.map((it, i) => (
              <Reveal key={i} animation="up" delay={i * 80}>
                <div className="flex items-start gap-3 bg-cream-50 rounded-2xl px-5 py-4">
                  <span className="text-orange-DEFAULT font-bold text-xl leading-none">✗</span>
                  <p className="text-gray-700 font-dm">{it}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal animation="up" delay={120}>
            <p className="mt-8 text-xl font-playfair italic text-violet-700">{t.problem.bridge}</p>
          </Reveal>
        </div>
      </section>

      {/* ── Programme ── */}
      <section className="py-20 bg-gradient-to-b from-cream-DEFAULT to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal animation="up" className="text-center mb-12">
            <span className="text-orange-600 font-semibold text-sm tracking-wide">{t.learn.eyebrow}</span>
            <h2 className="font-playfair text-3xl sm:text-4xl font-bold mt-2">{t.learn.title}</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-5">
            {t.learn.modules.map((m, i) => (
              <Reveal key={i} animation="up" delay={(i % 2) * 90}>
                <div className="flex items-start gap-4 bg-white rounded-3xl p-6 border border-cream-200 shadow-soft h-full">
                  <span className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                    <m.Icon size={26} strokeWidth={1.75} />
                  </span>
                  <div>
                    <h3 className="font-playfair text-xl font-bold mb-1">{m.t}</h3>
                    <p className="text-gray-500 font-dm text-sm">{m.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Réussites / Succès ── */}
      <section className="py-20 bg-violet-950 text-white relative overflow-hidden">
        <div className="absolute -top-20 right-0 w-[30rem] h-[30rem] rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal animation="up" className="text-center mb-12">
            <span className="text-orange-300 font-semibold text-sm tracking-wide">{t.success.eyebrow}</span>
            <h2 className="font-playfair text-3xl sm:text-4xl font-bold mt-2">{t.success.title}</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-5">
            {t.success.stories.map((s, i) => (
              <Reveal key={i} animation="up" delay={i * 100}>
                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-6 h-full flex flex-col">
                  <Quote size={26} className="text-orange-300 mb-3" />
                  <p className="text-white/90 font-dm leading-relaxed flex-1">{s.text}</p>
                  <div className="flex items-center gap-1 mt-4 text-orange-300">
                    {Array.from({ length: 5 }).map((_, k) => <Star key={k} size={14} className="fill-orange-300" />)}
                  </div>
                  <p className="font-semibold mt-3">{s.name}</p>
                  <span className="inline-block mt-2 text-xs font-bold text-orange-200 bg-orange-500/20 px-3 py-1 rounded-full w-fit">★ {s.result}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Inclus ── */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Reveal animation="up" className="text-center mb-10">
            <h2 className="font-playfair text-3xl sm:text-4xl font-bold">{t.included.title}</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-3">
            {t.included.items.map((it, i) => (
              <Reveal key={i} animation="up" delay={(i % 2) * 70}>
                <div className="flex items-center gap-3 bg-cream-50 rounded-2xl px-5 py-4">
                  <span className="w-7 h-7 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                    <Check size={15} strokeWidth={3} />
                  </span>
                  <span className="font-dm text-gray-800">{it}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Offre / Tarif ── */}
      <section id="offre" className="py-20 bg-gradient-to-b from-cream-DEFAULT to-orange-50">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <Reveal animation="zoom">
            <div className="bg-white rounded-3xl shadow-2xl border border-orange-100 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-DEFAULT to-orange-500 text-white text-center py-4 font-bold">
                {t.offer.eyebrow}
              </div>
              <div className="p-8 text-center">
                <h2 className="font-playfair text-2xl font-bold mb-4">{t.offer.title}</h2>
                <div className="flex items-end justify-center gap-3 mb-1">
                  <span className="text-gray-400 line-through text-xl">{t.offer.old}</span>
                  <span className="font-playfair text-5xl font-bold text-orange-600">{t.offer.price}</span>
                </div>
                <p className="text-gray-500 text-sm mb-6 font-dm">{t.offer.per}</p>
                <div className="space-y-2 text-start mb-7">
                  {t.offer.bullets.map((b, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0"><Check size={13} strokeWidth={3} /></span>
                      <span className="font-dm text-gray-700">{b}</span>
                    </div>
                  ))}
                </div>
                <Link href="/register" className="block bg-gradient-to-r from-orange-DEFAULT to-orange-500 text-white py-4 rounded-2xl font-bold text-lg hover:-translate-y-0.5 transition-all shadow-lg">
                  {t.offer.cta}
                </Link>
                <p className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-4 font-dm">
                  <ShieldCheck size={16} className="text-green-600" /> {t.offer.guarantee}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Reveal animation="up" className="text-center mb-10">
            <h2 className="font-playfair text-3xl sm:text-4xl font-bold">{t.faq.title}</h2>
          </Reveal>
          <div className="space-y-3">
            {t.faq.items.map((f, i) => (
              <Reveal key={i} animation="up" delay={i * 60}>
                <details className="group bg-cream-50 rounded-2xl px-5 py-4">
                  <summary className="flex items-center justify-between cursor-pointer font-semibold font-dm list-none">
                    {f.q}
                    <ChevronDown size={18} className="text-gray-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <p className="text-gray-600 font-dm mt-3">{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="py-20 bg-gradient-to-br from-violet-700 to-violet-900 text-white text-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <Reveal animation="zoom">
            <Scissors size={36} className="mx-auto mb-4 text-orange-300" />
            <h2 className="font-playfair text-3xl sm:text-4xl font-bold mb-6">{t.finalCta.title}</h2>
            <a href="#offre" className="inline-flex items-center gap-2 bg-orange-DEFAULT text-white px-9 py-4 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all hover:-translate-y-0.5">
              {t.finalCta.cta} <ArrowRight size={20} className={dir === "rtl" ? "rotate-180" : ""} />
            </a>
          </Reveal>
        </div>
      </section>

      <footer className="py-8 bg-violet-950 text-white/60 text-center text-sm font-dm">
        {t.footer} · © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
