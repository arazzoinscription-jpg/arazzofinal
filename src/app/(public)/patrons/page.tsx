import Link from "next/link";
import { cookies } from "next/headers";
import { Scissors, Ruler, FileText, ArrowUpRight, PackageOpen } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { FlickeringBackground } from "@/components/ui/flickering-bg";
import { createClient } from "@/lib/supabase/server";
import { patronImage } from "@/lib/patron-images";
import DisplayCards from "@/components/ui/display-cards";
import { normLang, isRtl, type Lang } from "@/lib/store-i18n";

/** Traductions de la page Patrons (FR / AR / EN). */
const T = {
  fr: { eyebrow: "Patrons numériques", title: "Bibliothèque de patrons", count: (n: number) => `${n} patrons PDF prêts à imprimer`, tag: "Patrons", latest: "Dernières pièces ajoutées", cardTitle: (i: string) => `Patron N° ${i}`, added: (d: string) => `Ajouté le ${d}`, emptyCat: (l: string) => `Aucun patron dans « ${l} » pour l'instant.`, emptySoon: "Les premiers patrons arrivent bientôt…", seeAll: "Voir tous les patrons", by: "par", buy: "Acheter ce patron", pages: "p." },
  ar: { eyebrow: "باترونات رقمية", title: "مكتبة الباترونات", count: (n: number) => `${n} باترون PDF جاهز للطباعة`, tag: "باترونات", latest: "أحدث القطع المضافة", cardTitle: (i: string) => `باترون رقم ${i}`, added: (d: string) => `أُضيف في ${d}`, emptyCat: (l: string) => `لا يوجد باترون في «${l}» حاليًا.`, emptySoon: "أول الباترونات قادمة قريبًا…", seeAll: "عرض كل الباترونات", by: "بواسطة", buy: "شراء هذا الباترون", pages: "ص" },
  en: { eyebrow: "Digital patterns", title: "Pattern library", count: (n: number) => `${n} print-ready PDF patterns`, tag: "Patterns", latest: "Latest additions", cardTitle: (i: string) => `Pattern N° ${i}`, added: (d: string) => `Added ${d}`, emptyCat: (l: string) => `No patterns in "${l}" yet.`, emptySoon: "The first patterns are coming soon…", seeAll: "See all patterns", by: "by", buy: "Buy this pattern", pages: "p." },
} as const;

/** Classes d'empilement des 3 cartes « Dernières pièces » (effet stack incliné). */
const STACK_CLS = [
  "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-cream-DEFAULT/50 dark:before:bg-[#0d0a1c]/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-cream-DEFAULT/50 dark:before:bg-[#0d0a1c]/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  "[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10",
];

export const metadata = {
  title: "Patrons numériques — Arazzo Formation",
  description: "Bibliothèque de patrons PDF pour couture, caftan, djellaba et broderie.",
};

// Les mots-clés (kw) restent en français : ils filtrent le contenu FR de la base.
const CATS: { slug: string; label: Record<Lang, string>; kw: string[] }[] = [
  { slug: "", label: { fr: "Tous", ar: "الكل", en: "All" }, kw: [] },
  { slug: "femme", label: { fr: "Femme", ar: "نساء", en: "Women" }, kw: ["femme", "robe", "jupe", "blouse", "chemisier", "dame", "tailleur", "combinaison"] },
  { slug: "homme", label: { fr: "Homme", ar: "رجال", en: "Men" }, kw: ["homme", "chemise homme", "veste homme", "pantalon homme", "costume", "gandoura homme"] },
  { slug: "enfant", label: { fr: "Enfants", ar: "أطفال", en: "Kids" }, kw: ["enfant", "enfants", "bébé", "bebe", "fille", "garçon", "garcon", "kids", "junior"] },
  { slug: "travail", label: { fr: "Tenue de travail", ar: "ملابس العمل", en: "Workwear" }, kw: ["travail", "blouse", "tablier", "uniforme", "médical", "medical", "cuisine", "scrub"] },
  { slug: "traditionnel", label: { fr: "Tenue traditionnelle", ar: "اللباس التقليدي", en: "Traditional wear" }, kw: ["traditionnel", "caftan", "karakou", "djellaba", "gandoura", "haik", "takchita", "burnous", "robe kabyle"] },
];

export default async function PatronsPage({ searchParams }: { searchParams: { cat?: string } }) {
  const lang = normLang((await cookies()).get("lang")?.value);
  const t = T[lang];
  const rtl = isRtl(lang);
  const locale = lang === "ar" ? "ar" : lang === "en" ? "en-US" : "fr-FR";

  const supabase = await createClient();
  const { data: allPatrons } = await supabase
    .from("patrons")
    .select("*, formateur:users(nom)")
    .order("created_at", { ascending: false });

  const cur = CATS.find((c) => c.slug === (searchParams.cat ?? "")) ?? CATS[0];
  const matches = (p: any) => {
    if (cur.kw.length === 0) return true;
    const hay = [p.titre, p.description, p.tissu, p.tailles].filter(Boolean).join(" ").toLowerCase();
    return cur.kw.some((k) => hay.includes(k));
  };
  const patrons = (allPatrons ?? []).filter(matches);

  // Pile « Dernières pièces » : les 3 patrons les plus récents (effet cartes empilées)
  const latestCards = (allPatrons ?? []).slice(0, 3).map((p, i) => ({
    title: t.cardTitle(String(i + 1).padStart(2, "0")),
    description: p.titre as string,
    date: t.added(new Date(p.created_at).toLocaleDateString(locale, { day: "numeric", month: "long" })),
    className: STACK_CLS[i],
  }));

  return (
    <div dir={rtl ? "rtl" : "ltr"}>
      <Navbar lang={lang} solid />
      <main className="relative min-h-screen bg-cream-DEFAULT dark:bg-[#0d0a1c]">
        <FlickeringBackground />
        {/* Héro éditorial « Le Cahier de Patrons » */}
        <div className="relative overflow-hidden bg-cream-DEFAULT dark:bg-[#0b0818] pt-32 pb-12 border-b border-violet-950/10 dark:border-white/10">
          {/* Texture papier à patron */}
          <div aria-hidden className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(91,22,249,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(91,22,249,0.04) 1px, transparent 1px)",
              backgroundSize: "27px 27px",
            }} />
          <div aria-hidden className="absolute inset-0 opacity-[0.05] dark:opacity-[0.07] mix-blend-multiply dark:mix-blend-screen pointer-events-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
          <div aria-hidden className="absolute -top-24 end-[8%] w-[30rem] h-[30rem] rounded-full bg-orange-400/15 dark:bg-orange-500/15 blur-3xl pointer-events-none" />
          <div aria-hidden className="absolute -bottom-32 start-[-6rem] w-[26rem] h-[26rem] rounded-full bg-blush-300/25 dark:bg-violet-700/20 blur-3xl pointer-events-none" />
          {/* Repères de cadrage */}
          <span aria-hidden className="absolute top-24 start-4 sm:start-8 w-4 h-4 border-t-2 border-s-2 border-violet-950/25 dark:border-white/20" />
          <span aria-hidden className="absolute bottom-4 end-4 sm:end-8 w-4 h-4 border-b-2 border-e-2 border-violet-950/25 dark:border-white/20" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-5">
              <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-orange-600 dark:text-orange-400">N° 03</span>
              <span className="h-px w-10 bg-violet-950/25 dark:bg-white/25" />
              <span className="text-[11px] sm:text-xs font-dm font-semibold uppercase tracking-[0.2em] text-violet-950/60 dark:text-white/55">{t.eyebrow}</span>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="min-w-0">
                <h1 className="font-playfair text-4xl lg:text-[3.6rem] font-bold text-violet-950 dark:text-white leading-[1.05] tracking-tight max-w-3xl">
                  {t.title}
                </h1>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.18em] text-violet-950/50 dark:text-white/45">
                  {t.count(allPatrons?.length ?? 0)}
                </p>
              </div>

              {/* Étiquette de couture suspendue */}
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

        {/* Dernières pièces (cartes empilées) — desktop uniquement */}
        {latestCards.length === 3 && (
          <section className="hidden md:block relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
            <div className="flex items-center justify-center gap-3 mb-10">
              <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-orange-600 dark:text-orange-400">N° 03·B</span>
              <span className="h-px w-10 bg-violet-950/25 dark:bg-white/25" />
              <span className="text-[11px] sm:text-xs font-dm font-semibold uppercase tracking-[0.2em] text-violet-950/60 dark:text-white/55">{t.latest}</span>
            </div>
            <div className="flex justify-center pe-32 pb-16">
              <DisplayCards cards={latestCards} />
            </div>
          </section>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Catégories (onglets éditoriaux) */}
          <div className="flex flex-wrap gap-2 mb-9">
            {CATS.map((c, i) => {
              const on = cur.slug === c.slug;
              return (
                <Link key={c.slug} href={c.slug ? `/patrons?cat=${c.slug}` : "/patrons"}
                  aria-current={on ? "page" : undefined}
                  className={`group inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold font-dm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                    on
                      ? "bg-violet-950 dark:bg-orange-DEFAULT text-white shadow-md"
                      : "bg-white dark:bg-white/[0.05] text-violet-950/70 dark:text-white/70 ring-1 ring-violet-950/12 dark:ring-white/10 hover:ring-orange-400 hover:text-orange-600 dark:hover:text-orange-300"
                  }`}>
                  <span className={`font-mono text-[10px] tracking-widest ${on ? "text-orange-300 dark:text-white/80" : "text-violet-950/35 dark:text-white/35 group-hover:text-orange-500"}`}>
                    {String(i).padStart(2, "0")}
                  </span>
                  {c.label[lang]}
                </Link>
              );
            })}
          </div>

          {!patrons.length ? (
            <div className="flex flex-col items-center text-center py-24 text-violet-950/55 dark:text-white/45">
              <PackageOpen size={48} strokeWidth={1.5} className="mb-4 text-cream-300 dark:text-white/20" />
              <p className="text-xl font-dm">{cur.slug ? t.emptyCat(cur.label[lang]) : t.emptySoon}</p>
              {cur.slug && <Link href="/patrons" className="inline-block mt-4 text-orange-600 dark:text-orange-300 font-semibold hover:underline">{t.seeAll}</Link>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
              {patrons.map((patron, i) => {
                const tailles = (patron as any).tailles;
                const tissu = (patron as any).tissu;
                const nbPages = (patron as any).nb_pages;
                const chip = "inline-flex items-center gap-1 text-[11px] font-dm font-medium bg-cream-100 dark:bg-white/5 text-violet-950/70 dark:text-white/60 px-2 py-1 rounded-lg";
                return (
                  <div
                    key={patron.id}
                    className="group relative bg-white dark:bg-white/[0.04] rounded-2xl ring-1 ring-violet-950/[0.08] dark:ring-white/10 overflow-hidden shadow-[0_14px_34px_-22px_rgba(43,18,69,0.3)] hover:shadow-[0_26px_52px_-24px_rgba(43,18,69,0.45)] hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="relative aspect-[4/3] bg-cream-50 dark:bg-white/5 overflow-hidden flex items-center justify-center">
                      <img
                        src={patron.preview_url || patronImage(patron.id)}
                        alt={patron.titre}
                        loading="lazy"
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                      />
                      {/* Plaque N° */}
                      <span className="absolute top-3 start-3 font-mono text-[10px] tracking-[0.2em] uppercase bg-cream-DEFAULT/90 dark:bg-[#0d0a1c]/80 text-violet-950 dark:text-white px-2 py-1 rounded-md ring-1 ring-violet-950/10 dark:ring-white/15 backdrop-blur-sm">
                        N° {String(i + 1).padStart(2, "0")}
                      </span>
                      {nbPages != null && (
                        <span className="absolute top-3 end-3 font-mono text-[10px] tracking-[0.2em] uppercase bg-orange-DEFAULT text-white px-2 py-1 rounded-md shadow-sm">PDF</span>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-playfair text-lg font-bold text-violet-950 dark:text-white leading-snug line-clamp-2">
                        {patron.titre}
                      </h3>
                      {(patron.formateur as any)?.nom && (
                        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-violet-950/45 dark:text-white/40 mt-1.5">
                          {t.by} {(patron.formateur as any).nom}
                        </p>
                      )}

                      {(tailles || tissu || nbPages != null) && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {tailles && <span className={chip}><Ruler size={12} className="text-orange-500" /> {tailles}</span>}
                          {tissu && <span className={`${chip} line-clamp-1 max-w-full`}><Scissors size={12} className="text-orange-500" /> {tissu}</span>}
                          {nbPages != null && <span className={chip}><FileText size={12} className="text-orange-500" /> {nbPages} {t.pages}</span>}
                        </div>
                      )}

                      <div className="flex items-end justify-between mt-4 pt-4 border-t border-violet-950/[0.08] dark:border-white/10">
                        <span className="font-playfair text-xl font-bold text-violet-950 dark:text-white tabular-nums">
                          {patron.prix_dzd.toLocaleString("fr-DZ")} DA
                        </span>
                        <span className="font-mono text-xs text-violet-950/40 dark:text-white/40">{patron.prix_eur}€</span>
                      </div>
                      <a
                        href={`/patrons/${patron.id}`}
                        className="group/cta flex items-center justify-center gap-2 w-full mt-4 bg-violet-950 dark:bg-orange-DEFAULT text-white py-2.5 rounded-xl font-semibold hover:bg-orange-DEFAULT dark:hover:bg-orange-600 transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                      >
                        {t.buy}
                        <ArrowUpRight size={15} className="group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5 transition-transform rtl:-scale-x-100" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer lang={lang} />
    </div>
  );
}
