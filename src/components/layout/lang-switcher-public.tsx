"use client";

import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { LANGS, isRtl, type Lang } from "@/lib/home-i18n";

/** Sélecteur FR / ع / EN pour le site public — cookie + recharge. */
export function LangSwitcherPublic({ current, scrolled = true }: { current: Lang; scrolled?: boolean }) {
  const router = useRouter();

  function set(l: Lang) {
    if (l === current) return;
    document.cookie = `lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}`;
    document.documentElement.lang = l;
    document.documentElement.dir = isRtl(l) ? "rtl" : "ltr";
    router.refresh();
  }

  return (
    <div className={`flex items-center gap-0.5 rounded-xl border p-0.5 ${scrolled ? "border-cream-200 bg-white" : "border-white/30 bg-white/10 backdrop-blur"}`}>
      <Globe size={14} className={scrolled ? "text-gray-400 mx-1" : "text-white/70 mx-1"} />
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => set(l.code)}
          className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-colors ${
            current === l.code
              ? "bg-orange-DEFAULT text-white"
              : scrolled ? "text-gray-500 hover:text-gray-900" : "text-white/80 hover:text-white"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
