"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SearchBar({ initial = "", autoFocus = false, compact = false }: { initial?: string; autoFocus?: boolean; compact?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (v.length >= 2) router.push(`/dashboard/recherche?q=${encodeURIComponent(v)}`);
  }

  return (
    <form onSubmit={submit} className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
      <input
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher une formation, leçon, ressource…"
        className={`w-full bg-white border border-cream-200 rounded-xl pl-10 pr-4 ${compact ? "py-2 text-sm" : "py-3"} focus:outline-none focus:ring-2 focus:ring-orange-500 font-dm`}
      />
    </form>
  );
}
