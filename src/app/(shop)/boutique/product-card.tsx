"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useInView } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion-safe";
import { ShoppingCart, Check, Eye, GraduationCap, FileDown, Scissors, Package, Loader2 } from "lucide-react";
import { addToCart } from "@/app/actions/cart";
import { toast } from "@/components/ui/toast";
import { STORE, type Lang } from "@/lib/store-i18n";
import type { LucideIcon } from "lucide-react";

export interface ShopProduct {
  id: string;
  title: string;
  description: string | null;
  type: string;
  price: number;
  compare_price: number | null;
  images: string[];
  stock: number | null;
  slug: string;
  creatorName?: string | null;
  course_id?: string | null;
  /** Pour les packs (bundle) : référence du pack encodée « pack:<id> ». */
  files?: string[] | null;
}

/** Id du pack de cours d'un produit « bundle » (encodé dans files). */
export function packIdFromFiles(files?: string[] | null): string | null {
  const ref = (files ?? []).find((f) => typeof f === "string" && f.startsWith("pack:"));
  return ref ? ref.slice(5) : null;
}

/** Lien de réservation /offre pour un cours ou un pack de cours. */
export function reserveHref(product: { type: string; course_id?: string | null; files?: string[] | null }): string {
  const id = product.type === "bundle" ? packIdFromFiles(product.files) : product.course_id;
  return id ? `/offre?c=${id}#inscription` : "/offre#inscription";
}

const TYPE_META: Record<string, { Icon: LucideIcon; chip: string }> = {
  course: { Icon: GraduationCap, chip: "text-violet-700 bg-violet-50 dark:text-violet-200 dark:bg-violet-500/15" },
  digital_file: { Icon: FileDown, chip: "text-blue-700 bg-blue-50 dark:text-blue-200 dark:bg-blue-500/15" },
  patron_pdf: { Icon: Scissors, chip: "text-orange-700 bg-orange-50 dark:text-orange-200 dark:bg-orange-500/15" },
  bundle: { Icon: Package, chip: "text-blush-600 bg-blush-50 dark:text-blush-200 dark:bg-blush-500/15" },
};

const FALLBACK_EMOJI: Record<string, string> = { course: "🎓", digital_file: "📁", patron_pdf: "✂️", bundle: "📦" };

export function ProductCard({ product, index = 0, lang = "fr" }: { product: ShopProduct; index?: number; lang?: Lang }) {
  const t = STORE[lang].shop;
  const router = useRouter();
  const ref = useRef(null);
  const reduce = useReducedMotionSafe();
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  const image = product.images?.[0] ?? null;
  const outOfStock = product.stock != null && product.stock <= 0;
  const meta = TYPE_META[product.type] ?? { Icon: Package, chip: "text-gray-600 bg-gray-100" };
  const typeLabel = (t.types as Record<string, string>)[product.type] ?? product.type;
  const hasPromo = product.compare_price != null && product.compare_price > product.price;
  const promoPct = hasPromo ? Math.round((1 - product.price / (product.compare_price as number)) * 100) : 0;

  function add() {
    startTransition(async () => {
      const res = await addToCart(product.id, 1);
      if (res.ok) {
        setAdded(true);
        toast("Ajouté au panier 🛒", "success");
        if (typeof window !== "undefined") window.dispatchEvent(new Event("cart:changed"));
        router.refresh();
      } else {
        toast(res.error ?? "Erreur", "error");
      }
    });
  }

  return (
    <motion.div
      ref={ref}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay: reduce ? 0 : (index % 4) * 0.06 }}
      className="group bg-white dark:bg-white/[0.04] rounded-3xl border border-cream-200 dark:border-white/10 overflow-hidden flex flex-col shadow-soft hover:shadow-glow hover:-translate-y-1 transition-all duration-300"
    >
      {/* Visuel */}
      <Link href={`/boutique/${product.slug}`} className="relative block aspect-square overflow-hidden bg-gradient-to-br from-cream-100 to-blush-50 dark:from-white/5 dark:to-white/[0.02]">
        {image ? (
          <img src={image} alt={product.title}
            className={`w-full h-full transition-transform duration-500 ${
              product.type === "patron_pdf" ? "object-contain p-1.5 group-hover:scale-[1.03]" : "object-cover group-hover:scale-110"
            }`} />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-6xl opacity-70">{FALLBACK_EMOJI[product.type] ?? "🧵"}</span>
        )}

        {/* Badges */}
        <span className={`absolute top-3 start-3 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur ${meta.chip}`}>
          <meta.Icon size={12} /> {typeLabel}
        </span>
        {hasPromo && (
          <span className="absolute top-3 end-3 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-orange-DEFAULT text-white shadow">
            −{promoPct}%
          </span>
        )}
        {outOfStock && (
          <span className="absolute inset-0 bg-black/45 flex items-center justify-center">
            <span className="text-white font-bold text-sm bg-red-500/90 px-3 py-1 rounded-full">{t.soldOut}</span>
          </span>
        )}

        {/* Voir le détail (hover) */}
        <span className="absolute bottom-3 end-3 w-9 h-9 rounded-full bg-white/90 dark:bg-black/50 text-gray-700 dark:text-white flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
          <Eye size={16} />
        </span>
      </Link>

      {/* Contenu */}
      <div className="p-4 flex flex-col flex-1">
        <Link href={`/boutique/${product.slug}`}>
          <h3 className="font-semibold text-gray-900 dark:text-white font-dm leading-snug line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-300 transition-colors">
            {product.title}
          </h3>
        </Link>
        {product.creatorName && (
          <p className="text-xs text-gray-400 dark:text-white/40 font-dm mt-0.5">par {product.creatorName}</p>
        )}
        {product.description && (
          <p className="text-sm text-gray-500 dark:text-white/50 font-dm line-clamp-2 mt-1">{product.description}</p>
        )}

        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-bold text-orange-600 dark:text-orange-300 font-playfair text-xl">
            {Number(product.price).toLocaleString("fr-DZ")} DA
          </span>
          {hasPromo && (
            <span className="text-sm text-gray-400 dark:text-white/40 line-through">
              {Number(product.compare_price).toLocaleString("fr-DZ")} DA
            </span>
          )}
        </div>

        <div className="mt-auto pt-4">
          {product.type === "course" || product.type === "bundle" ? (
            // Formations ET packs de cours : pas de panier → réservation via /offre.
            <Link
              href={reserveHref(product)}
              className="w-full inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white py-2.5 rounded-xl font-semibold hover:bg-orange-600 active:scale-[0.98] transition-all">
              <GraduationCap size={17} /> {t.reserve}
            </Link>
          ) : added ? (
            <Link href="/panier"
              className="shiny-cta w-full inline-flex items-center justify-center gap-2 bg-violet-700 text-white py-2.5 rounded-xl font-semibold hover:bg-violet-800 transition-colors">
              <Check size={17} /> {t.inCart}
            </Link>
          ) : (
            <button onClick={add} disabled={isPending || outOfStock}
              className="w-full inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white py-2.5 rounded-xl font-semibold hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100">
              {outOfStock ? t.soldOut : isPending ? <Loader2 size={17} className="animate-spin" /> : <ShoppingCart size={17} />}
              {!outOfStock && !isPending && t.add}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
