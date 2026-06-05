"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/** Bascule clair / sombre — persiste le choix dans localStorage ('theme'). */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Passer en clair" : "Passer en sombre"}
      title={dark ? "Mode clair" : "Mode sombre"}
      className="w-10 h-10 rounded-xl border border-cream-200 dark:border-white/15 bg-white dark:bg-white/5 text-gray-600 dark:text-white/80 flex items-center justify-center hover:text-orange-600 dark:hover:text-orange-300 transition-colors"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
