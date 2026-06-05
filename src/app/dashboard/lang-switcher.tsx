"use client";

import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { LANGS, isRtl, type Lang } from "./dash-i18n";

/** Sélecteur de langue FR / ع / EN — persiste via cookie + recharge (serveur + client). */
export function LangSwitcher({ current }: { current: Lang }) {
  const router = useRouter();

  function set(l: Lang) {
    if (l === current) return;
    document.cookie = `lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}`;
    document.documentElement.lang = l;
    document.documentElement.dir = isRtl(l) ? "rtl" : "ltr";
    router.refresh();
  }

  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-cream-200 dark:border-white/15 bg-white dark:bg-white/5 p-0.5">
      <Globe size={15} className="text-gray-400 dark:text-white/40 mx-1.5" />
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => set(l.code)}
          className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
            current === l.code
              ? "bg-orange-DEFAULT text-white"
              : "text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
