import Link from "next/link";
import { cookies } from "next/headers";
import { Scissors, LayoutGrid, ArrowUpRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { FlickeringBackground } from "@/components/ui/flickering-bg";
import { createClient } from "@/lib/supabase/server";
import { normLang, isRtl } from "@/lib/store-i18n";
import { resolveGenre, resolveType } from "@/lib/patron-categories";
import { PatronsShop, type PatronItem } from "./patrons-shop";

export const metadata = {
  title: "Patrons numériques — Arazzo Formation",
  description: "Boutique de patrons PDF prêts à imprimer : robes, jupes, pantalons, tenues traditionnelles — femme, homme, enfant.",
};

const T = {
  fr: { eyebrow: "Patrons numériques", title: "La boutique de patrons", count: (n: number) => `${n} patrons PDF prêts à imprimer`, tag: "Patrons",
    sm: { eyebrow: "Le sur-mesure", title: "Votre modèle n'existe pas encore ?", titleHi: "On le crée pour vous", desc: "Nos patronnistes tracent votre patron et calculent votre placement d'après vos propres mesures — du croquis au PDF prêt à couper.", ctaPatron: "Commander un patron sur mesure", subPatron: "Un patron tracé à vos mesures", ctaPlacement: "Demander un placement sur mesure", subPlacement: "Le calage optimal des pièces sur votre tissu", start: "Commencer" } },
  ar: { eyebrow: "باترونات رقمية", title: "متجر الباترونات", count: (n: number) => `${n} باترون PDF جاهز للطباعة`, tag: "باترونات",
    sm: { eyebrow: "حسب الطلب", title: "موديلك غير موجود بعد؟", titleHi: "نصنعه لك", desc: "تقوم باترونيستاتنا برسم باترونك وحساب توزيع القطع حسب مقاساتك الخاصة — من الرسم إلى ملف PDF جاهز للقص.", ctaPatron: "اطلبي باترون حسب الطلب", subPatron: "باترون مرسوم على مقاساتك", ctaPlacement: "اطلبي توزيع القطع حسب الطلب", subPlacement: "التوزيع الأمثل للقطع على قماشك", start: "ابدئي" } },
  en: { eyebrow: "Digital patterns", title: "The pattern shop", count: (n: number) => `${n} print-ready PDF patterns`, tag: "Patterns",
    sm: { eyebrow: "Made to measure", title: "Your model doesn't exist yet?", titleHi: "We'll make it for you", desc: "Our patternmakers draft your pattern and compute your cutting layout from your own measurements — from sketch to print-ready PDF.", ctaPatron: "Order a custom pattern", subPatron: "A pattern drafted to your measurements", ctaPlacement: "Request a custom cutting layout", subPlacement: "Optimal placement of pieces on your fabric", start: "Start" } },
} as const;

export default async function PatronsPage() {
  const lang = normLang((await cookies()).get("lang")?.value);
  const t = T[lang];
  const rtl = isRtl(lang);

  const supabase = await createClient();
  const { data: allPatrons } = await supabase
    .from("patrons")
    .select("*, formateur:users(nom)")
    .order("created_at", { ascending: false });

  const items: PatronItem[] = (allPatrons ?? []).map((p: any) => ({
    id: p.id,
    titre: p.titre,
    prixDzd: p.prix_dzd ?? 0,
    prixEur: p.prix_eur ?? 0,
    preview: p.preview_url ?? null,
    formateur: (p.formateur as any)?.nom ?? null,
    tailles: p.tailles ?? null,
    tissu: p.tissu ?? null,
    nbPages: p.nb_pages ?? null,
    genre: resolveGenre(p),
    type: resolveType(p),
  }));

  return (
    <div dir={rtl ? "rtl" : "ltr"}>
      <Navbar lang={lang} solid />
      <main className="relative min-h-screen bg-cream-DEFAULT dark:bg-[#0d0a1c]">
        <FlickeringBackground />

        {/* ── Héro éditorial « Le Cahier de Patrons » ── */}
        <div className="relative overflow-hidden bg-cream-DEFAULT dark:bg-[#0b0818] pt-32 pb-12 border-b border-violet-950/10 dark:border-white/10">
          <div aria-hidden className="absolute inset-0"
            style={{ backgroundImage: "linear-gradient(to right, rgba(91,22,249,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(91,22,249,0.04) 1px, transparent 1px)", backgroundSize: "27px 27px" }} />
          <div aria-hidden className="absolute -top-24 end-[8%] w-[30rem] h-[30rem] rounded-full bg-orange-400/15 dark:bg-orange-500/15 blur-3xl pointer-events-none" />
          <div aria-hidden className="absolute -bottom-32 start-[-6rem] w-[26rem] h-[26rem] rounded-full bg-blush-300/25 dark:bg-violet-700/20 blur-3xl pointer-events-none" />
          <span aria-hidden className="absolute top-24 start-4 sm:start-8 w-4 h-4 border-t-2 border-s-2 border-violet-950/25 dark:border-white/20" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-5">
              <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-orange-600 dark:text-orange-400">N° 03</span>
              <span className="h-px w-10 bg-violet-950/25 dark:bg-white/25" />
              <span className="text-[11px] sm:text-xs font-dm font-semibold uppercase tracking-[0.2em] text-violet-950/60 dark:text-white/55">{t.eyebrow}</span>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="min-w-0">
                <h1 className="font-playfair text-4xl lg:text-[3.6rem] font-bold text-violet-950 dark:text-white leading-[1.05] tracking-tight max-w-3xl">{t.title}</h1>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.18em] text-violet-950/50 dark:text-white/45">{t.count(items.length)}</p>
              </div>
              <div aria-hidden className="hidden sm:flex relative rotate-[5deg] me-2">
                <span className="absolute -top-7 start-1/2 h-7 w-px bg-violet-950/30 dark:bg-white/30 -rotate-12 origin-bottom" />
                <div className="relative w-32 h-44 rounded-2xl bg-white dark:bg-[#15102b] ring-1 ring-violet-950/12 dark:ring-white/12 shadow-[0_22px_45px_-22px_rgba(43,18,69,0.5)] flex flex-col items-center justify-center gap-2 px-4">
                  <span className="absolute top-3.5 start-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border border-violet-950/30 dark:border-white/30 bg-cream-100 dark:bg-[#0d0a1c]" />
                  <Scissors size={24} className="text-orange-600 dark:text-orange-400 -rotate-12 mt-3" strokeWidth={1.75} />
                  <span className="font-mono text-[11px] tracking-[0.26em] uppercase text-violet-950/70 dark:text-white/70">N° 03</span>
                  <span className="h-px w-10 bg-violet-950/15 dark:bg-white/15" />
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-violet-950/45 dark:text-white/45">{t.tag}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Boutique : filtres genre × type + grille animée ── */}
        <PatronsShop items={items} lang={lang} />

        {/* ── Bloc sur-mesure ── */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20">
          <div className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-violet-900 via-violet-800 to-[#2a1245] px-6 sm:px-10 lg:px-14 py-12 sm:py-14 shadow-2xl">
            <div aria-hidden className="absolute inset-3 rounded-[1.7rem] border border-dashed border-white/15 pointer-events-none" />
            <div aria-hidden className="absolute -top-16 end-8 w-56 h-56 rounded-full bg-orange-500/30 blur-3xl pointer-events-none" />
            <div className="relative grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-orange-300">N° 03·C</span>
                  <span className="h-px w-10 bg-white/30" />
                  <span className="text-[11px] sm:text-xs font-dm font-semibold uppercase tracking-[0.2em] text-white/70">{t.sm.eyebrow}</span>
                </div>
                <h2 className="font-playfair text-3xl sm:text-4xl font-bold text-white leading-tight">
                  {t.sm.title}{" "}<span className="italic text-orange-300">{t.sm.titleHi}</span>
                </h2>
                <p className="mt-4 text-violet-200 font-dm leading-relaxed max-w-md">{t.sm.desc}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Link href="/dashboard/sur-mesure?type=patron"
                  className="group relative flex flex-col rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] ring-1 ring-white/15 hover:ring-orange-300/60 p-5 transition-all duration-300 hover:-translate-y-1">
                  <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-orange-DEFAULT text-white shadow-md mb-4"><Scissors size={20} /></span>
                  <span className="font-playfair text-lg font-bold text-white leading-snug">{t.sm.ctaPatron}</span>
                  <span className="mt-1.5 text-sm text-violet-200/80 font-dm leading-relaxed">{t.sm.subPatron}</span>
                  <span className="mt-4 inline-flex items-center gap-1.5 font-dm text-sm font-bold text-orange-300">{t.sm.start}<ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform rtl:-scale-x-100" /></span>
                </Link>
                <Link href="/dashboard/sur-mesure?type=placement"
                  className="group relative flex flex-col rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] ring-1 ring-white/15 hover:ring-orange-300/60 p-5 transition-all duration-300 hover:-translate-y-1">
                  <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 ring-1 ring-white/20 text-orange-300 shadow-md mb-4"><LayoutGrid size={20} /></span>
                  <span className="font-playfair text-lg font-bold text-white leading-snug">{t.sm.ctaPlacement}</span>
                  <span className="mt-1.5 text-sm text-violet-200/80 font-dm leading-relaxed">{t.sm.subPlacement}</span>
                  <span className="mt-4 inline-flex items-center gap-1.5 font-dm text-sm font-bold text-orange-300">{t.sm.start}<ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform rtl:-scale-x-100" /></span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer lang={lang} />
    </div>
  );
}
