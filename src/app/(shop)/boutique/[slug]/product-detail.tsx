"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Check, Minus, Plus, Loader2, ShieldCheck, Zap, BadgeCheck, GraduationCap } from "lucide-react";
import { addToCart } from "@/app/actions/cart";
import { toast } from "@/components/ui/toast";
import { STORE, type Lang } from "@/lib/store-i18n";
import { reserveHref } from "../product-card";

export interface DetailProduct {
  id: string;
  title: string;
  description: string | null;
  type: string;
  price: number;
  compare_price: number | null;
  images: string[];
  stock: number | null;
  slug: string;
  course_id?: string | null;
  /** Pour les packs (bundle) : référence du pack encodée « pack:<id> ». */
  files?: string[] | null;
}

const FALLBACK_EMOJI: Record<string, string> = { course: "🎓", digital_file: "📁", patron_pdf: "✂️", bundle: "📦" };

export function ProductDetail({ product, lang = "fr" }: { product: DetailProduct; lang?: Lang }) {
  const t = STORE[lang].shop;
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const images = product.images?.length ? product.images : [];
  const outOfStock = product.stock != null && product.stock <= 0;
  const hasPromo = product.compare_price != null && product.compare_price > product.price;
  const promoPct = hasPromo ? Math.round((1 - product.price / (product.compare_price as number)) * 100) : 0;

  function add() {
    startTransition(async () => {
      const res = await addToCart(product.id, qty);
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
    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
      {/* Galerie */}
      <div>
        <div className="aspect-square rounded-3xl overflow-hidden border border-cream-200 dark:border-white/10 bg-gradient-to-br from-cream-100 to-blush-50 dark:from-white/5 dark:to-white/[0.02] shadow-soft flex items-center justify-center">
          {images[active] ? (
            <img src={images[active]} alt={product.title} className={`w-full h-full ${product.type === "patron_pdf" ? "object-contain p-2" : "object-cover"}`} />
          ) : (
            <span className="text-8xl opacity-70">{FALLBACK_EMOJI[product.type] ?? "🧵"}</span>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-3 mt-4">
            {images.map((img, i) => (
              <button key={i} onClick={() => setActive(i)}
                className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-colors ${
                  i === active ? "border-orange-DEFAULT" : "border-cream-200 dark:border-white/10 hover:border-orange-300"
                }`}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Infos */}
      <div>
        <span className="inline-block text-xs font-bold text-orange-600 dark:text-orange-300 bg-orange-50 dark:bg-orange-500/15 px-3 py-1 rounded-full">
          {(t.types as Record<string, string>)[product.type] ?? product.type}
        </span>
        <h1 className="font-playfair text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mt-3 leading-tight">
          {product.title}
        </h1>

        <div className="flex items-baseline gap-3 mt-4">
          <span className="font-playfair font-bold text-3xl text-orange-600 dark:text-orange-300">
            {Number(product.price).toLocaleString("fr-DZ")} DA
          </span>
          {hasPromo && (
            <>
              <span className="text-lg text-gray-400 dark:text-white/40 line-through">
                {Number(product.compare_price).toLocaleString("fr-DZ")} DA
              </span>
              <span className="text-xs font-extrabold px-2 py-1 rounded-full bg-orange-DEFAULT text-white">−{promoPct}%</span>
            </>
          )}
        </div>

        {product.description && (
          <p className="text-gray-600 dark:text-white/60 font-dm leading-relaxed mt-5 whitespace-pre-line">{product.description}</p>
        )}

        {/* Stock */}
        <p className="text-sm font-dm mt-4">
          {outOfStock ? (
            <span className="text-red-500 font-semibold">● {t.soldOut}</span>
          ) : product.stock != null ? (
            <span className="text-green-600 dark:text-green-400 font-semibold">● {t.inStock(product.stock)}</span>
          ) : (
            <span className="text-green-600 dark:text-green-400 font-semibold">● {t.available}</span>
          )}
        </p>

        {/* Formation ET pack de cours : réservation au lieu du panier */}
        {product.type === "course" || product.type === "bundle" ? (
          <div className="mt-6">
            <Link
              href={reserveHref(product)}
              className="w-full inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white py-3 rounded-xl font-bold hover:bg-orange-600 active:scale-[0.98] transition-all shadow-glow">
              <GraduationCap size={18} /> {t.reserve}
            </Link>
          </div>
        ) : (
        /* Quantité + ajout */
        <div className="flex items-center gap-3 mt-6">
          {product.stock !== null && !outOfStock && (
            <div className="inline-flex items-center border border-cream-200 dark:border-white/15 rounded-xl overflow-hidden">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2.5 text-gray-500 hover:bg-cream-50 dark:hover:bg-white/5"><Minus size={16} /></button>
              <span className="px-4 font-semibold text-gray-900 dark:text-white tabular-nums">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="px-3 py-2.5 text-gray-500 hover:bg-cream-50 dark:hover:bg-white/5"><Plus size={16} /></button>
            </div>
          )}

          {added ? (
            <Link href="/panier"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-violet-700 text-white py-3 rounded-xl font-semibold hover:bg-violet-800 transition-colors">
              <Check size={18} /> {t.viewCart}
            </Link>
          ) : (
            <button onClick={add} disabled={isPending || outOfStock}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white py-3 rounded-xl font-bold hover:bg-orange-600 active:scale-[0.98] transition-all shadow-glow disabled:opacity-50 disabled:active:scale-100">
              {outOfStock ? t.soldOut : isPending ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
              {!outOfStock && !isPending && t.addToCart}
            </button>
          )}
        </div>
        )}

        {/* Réassurance */}
        <div className="grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-cream-100 dark:border-white/10">
          {[
            { Icon: ShieldCheck, title: t.reassure.t1, sub: t.reassure.s1 },
            { Icon: Zap, title: t.reassure.t2, sub: t.reassure.s2 },
            { Icon: BadgeCheck, title: t.reassure.t3, sub: t.reassure.s3 },
          ].map(({ Icon, title, sub }) => (
            <div key={title} className="text-center">
              <Icon size={20} className="mx-auto text-orange-500 dark:text-orange-300 mb-1.5" />
              <p className="text-xs font-semibold text-gray-900 dark:text-white font-dm">{title}</p>
              <p className="text-[11px] text-gray-400 dark:text-white/40 font-dm">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
