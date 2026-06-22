import Link from "next/link";
import { cookies } from "next/headers";
import { LayoutGrid, GraduationCap, FileDown, Scissors, Package, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductCard, type ShopProduct } from "./product-card";
import { HeroCta } from "./hero-cta";
import { STORE, normLang } from "@/lib/store-i18n";
import type { LucideIcon } from "lucide-react";

export const metadata = { title: "Boutique — Arazzo Formation" };
export const dynamic = "force-dynamic";

const FILTERS: { value: keyof StoreShopFilters; Icon: LucideIcon }[] = [
  { value: "all", Icon: LayoutGrid },
  { value: "course", Icon: GraduationCap },
  { value: "digital_file", Icon: FileDown },
  { value: "patron_pdf", Icon: Scissors },
  { value: "bundle", Icon: Package },
];
type StoreShopFilters = (typeof STORE)["fr"]["shop"]["filters"];
const FILTER_QUERY: Record<string, string> = { all: "", course: "course", digital_file: "digital_file", patron_pdf: "patron_pdf", bundle: "bundle" };

export default async function BoutiquePage({ searchParams }: { searchParams: { type?: string } }) {
  const supabase = await createClient();
  const lang = normLang((await cookies()).get("lang")?.value);
  const t = STORE[lang].shop;
  const type = searchParams.type ?? "";

  let query = supabase
    .from("products")
    .select("id, title, description, type, price, compare_price, images, stock, slug, is_active, course:courses(formateur:users(nom)), patron:patrons(formateur:users(nom))")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (type) query = query.eq("type", type);

  const { data: productsRaw } = await query;
  // Nom du créateur (formateur du cours OU patronniste du patron)
  const products = (productsRaw ?? []).map((p: any) => ({
    ...p,
    creatorName: p.course?.formateur?.nom ?? p.patron?.formateur?.nom ?? null,
  }));
  const count = products.length;

  return (
    <div>
      {/* Héro éditorial « Le Comptoir » (papier crème, repères de cadrage, étiquette de couture) */}
      <div className="relative overflow-hidden rounded-3xl bg-cream-100 dark:bg-white/[0.03] ring-1 ring-violet-950/10 dark:ring-white/10 px-6 sm:px-10 py-12 sm:py-14 mb-9 shadow-[0_24px_60px_-32px_rgba(43,18,69,0.45)]">
        {/* Texture papier à patron */}
        <div aria-hidden className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(91,22,249,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(91,22,249,0.04) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }} />
        {/* Grain */}
        <div aria-hidden className="absolute inset-0 opacity-[0.05] dark:opacity-[0.07] mix-blend-multiply dark:mix-blend-screen pointer-events-none"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
        {/* Halos */}
        <div aria-hidden className="absolute -top-24 -end-16 w-72 h-72 rounded-full bg-orange-400/20 blur-3xl pointer-events-none" />
        <div aria-hidden className="absolute -bottom-28 -start-16 w-80 h-80 rounded-full bg-blush-300/25 dark:bg-violet-700/20 blur-3xl pointer-events-none" />
        {/* Repères de cadrage */}
        <span aria-hidden className="absolute top-4 start-4 w-4 h-4 border-t-2 border-s-2 border-violet-950/25 dark:border-white/20" />
        <span aria-hidden className="absolute top-4 end-4 w-4 h-4 border-t-2 border-e-2 border-violet-950/25 dark:border-white/20" />
        <span aria-hidden className="absolute bottom-4 start-4 w-4 h-4 border-b-2 border-s-2 border-violet-950/25 dark:border-white/20" />
        <span aria-hidden className="absolute bottom-4 end-4 w-4 h-4 border-b-2 border-e-2 border-violet-950/25 dark:border-white/20" />

        <div className="relative grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <div className="flex items-center gap-3 mb-5">
              <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-orange-600 dark:text-orange-400">N° 02</span>
              <span className="h-px w-9 bg-violet-950/25 dark:bg-white/25" />
              <span className="text-[11px] sm:text-xs font-dm font-semibold uppercase tracking-[0.2em] text-violet-950/60 dark:text-white/55">{t.heroEyebrow}</span>
            </div>
            <h1 className="font-playfair text-4xl sm:text-[3.4rem] font-bold text-violet-950 dark:text-white leading-[1.05] tracking-tight max-w-2xl">
              {t.heroTitle1}&nbsp;{t.heroTitle2} <span className="italic text-orange-600 dark:text-orange-400">{t.heroTitleHi}</span>
            </h1>
            <p className="text-violet-950/65 dark:text-white/60 font-dm mt-4 max-w-lg text-lg">{t.heroSub}</p>
            <HeroCta label={t.heroCta} />
          </div>

          {/* Étiquette de couture suspendue */}
          <div aria-hidden className="hidden lg:flex lg:col-span-4 justify-end pe-4">
            <div className="relative rotate-[5deg]">
              <span className="absolute -top-7 start-1/2 h-7 w-px bg-violet-950/30 dark:bg-white/30 -rotate-12 origin-bottom" />
              <div className="relative w-36 h-48 rounded-2xl bg-white dark:bg-[#15102b] ring-1 ring-violet-950/12 dark:ring-white/12 shadow-[0_22px_45px_-22px_rgba(43,18,69,0.5)] flex flex-col items-center justify-center gap-2.5 px-4">
                <span className="absolute top-3.5 start-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border border-violet-950/30 dark:border-white/30 bg-cream-100 dark:bg-[#0d0a1c]" />
                <Scissors size={26} className="text-orange-600 dark:text-orange-400 -rotate-12 mt-3" strokeWidth={1.75} />
                <span className="font-mono text-[11px] tracking-[0.28em] uppercase text-violet-950/70 dark:text-white/70">N° 01</span>
                <span className="h-px w-12 bg-violet-950/15 dark:bg-white/15" />
                <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-violet-950/45 dark:text-white/45">Atelier</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres (onglets éditoriaux) + compteur */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f, i) => {
            const q = FILTER_QUERY[f.value];
            const isActive = type === q;
            return (
              <Link key={f.value} href={q ? `/boutique?type=${q}` : "/boutique"}
                aria-current={isActive ? "page" : undefined}
                className={`group inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold font-dm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  isActive
                    ? "bg-violet-950 dark:bg-orange-DEFAULT text-white shadow-md"
                    : "bg-white dark:bg-white/[0.05] text-violet-950/70 dark:text-white/70 ring-1 ring-violet-950/12 dark:ring-white/10 hover:ring-orange-400 hover:text-orange-600 dark:hover:text-orange-300"
                }`}>
                <span className={`font-mono text-[10px] tracking-widest ${isActive ? "text-orange-300 dark:text-white/80" : "text-violet-950/35 dark:text-white/35 group-hover:text-orange-500"}`}>
                  {String(i).padStart(2, "0")}
                </span>
                <f.Icon size={15} /> {t.filters[f.value]}
              </Link>
            );
          })}
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-violet-950/45 dark:text-white/40">{t.nbProducts(count)}</span>
      </div>

      {/* Grille */}
      {!count ? (
        <div className="flex flex-col items-center text-center py-24 bg-white dark:bg-white/[0.04] rounded-3xl ring-1 ring-violet-950/10 dark:ring-white/10">
          <ShoppingBag size={48} strokeWidth={1.5} className="mb-4 text-cream-300 dark:text-white/20" />
          <p className="text-xl text-violet-950/55 dark:text-white/45 font-dm">{t.empty}</p>
          <Link href="/boutique" className="inline-flex items-center gap-1.5 mt-5 text-orange-600 dark:text-orange-300 font-semibold hover:underline">
            {t.seeAll}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {products!.map((p, i) => <ProductCard key={p.id} product={p as ShopProduct} index={i} lang={lang} />)}
        </div>
      )}
    </div>
  );
}
