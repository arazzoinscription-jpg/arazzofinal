"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { getCartCount } from "@/app/actions/cart";

/** Icône panier + badge du nombre d'articles, mise à jour en direct. */
export function CartIcon({ scrolled = true }: { scrolled?: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    const refresh = () => { getCartCount().then((c) => { if (alive) setCount(c); }).catch(() => {}); };
    refresh();
    window.addEventListener("cart:changed", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      alive = false;
      window.removeEventListener("cart:changed", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return (
    <Link href="/panier" aria-label="Panier" className="relative inline-flex items-center">
      <ShoppingCart size={22} className={scrolled ? "text-gray-700" : "text-white drop-shadow"} />
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-orange-DEFAULT text-white text-[10px] font-bold min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  );
}
