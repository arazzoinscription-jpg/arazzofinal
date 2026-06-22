import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SearchBar } from "@/components/search/search-bar";

export const metadata = { title: "Recherche — Arazzo Formation" };
export const dynamic = "force-dynamic";

const KIND_META: Record<string, { icon: string; label: string }> = {
  "cours": { icon: "📚", label: "Formation" },
  "leçon": { icon: "▶️", label: "Leçon" },
  "ressource": { icon: "📂", label: "Ressource" },
  "question": { icon: "❓", label: "Question" },
};

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const q = (searchParams.q ?? "").trim();
  let results: { kind: string; id: string; label: string; link: string }[] = [];
  if (q.length >= 2) {
    const { data } = await supabase.rpc("global_search", { q });
    results = (data ?? []) as typeof results;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-2.5">
          <span className="font-mono text-[11px] tracking-[0.28em] uppercase text-orange-600 dark:text-orange-400">N° 04</span>
          <span className="h-px w-8 bg-violet-950/20 dark:bg-white/20" />
          <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-violet-950/45 dark:text-white/45">Recherche</span>
        </div>
        <h1 className="font-playfair text-3xl sm:text-4xl font-bold tracking-tight text-violet-950 dark:text-white leading-[1.05]">Recherche</h1>
      </div>
      <SearchBar initial={q} autoFocus />

      <div className="mt-8">
        {q.length < 2 ? (
          <p className="text-gray-400 font-dm">Tapez au moins 2 caractères pour rechercher.</p>
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">🔍</div>
            Aucun résultat pour « <strong>{q}</strong> ».
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 font-dm mb-4">{results.length} résultat(s) pour « {q} »</p>
            <div className="space-y-2">
              {results.map((r) => {
                const m = KIND_META[r.kind] ?? { icon: "•", label: r.kind };
                const clickable = r.link && r.link !== "#";
                const inner = (
                  <div className="bg-white rounded-2xl p-4 border border-cream-200 flex items-center gap-3 hover:shadow-lg hover:border-orange-200 transition-all">
                    <span className="text-xl flex-shrink-0">{m.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 font-dm truncate">{r.label}</div>
                      <div className="text-xs text-gray-400 font-dm">{m.label}</div>
                    </div>
                    {clickable && <span className="text-orange-600 flex-shrink-0">→</span>}
                  </div>
                );
                return clickable ? <Link key={r.kind + r.id} href={r.link}>{inner}</Link> : <div key={r.kind + r.id}>{inner}</div>;
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
