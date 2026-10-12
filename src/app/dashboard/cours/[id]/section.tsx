import type { ReactNode } from "react";

/**
 * Une ligne de la LISTE sous la vidéo : un clic l'ouvre / la referme (élément natif <details>, sans JavaScript).
 * Le titre interne des blocs (h2) est masqué : la ligne le porte déjà.
 */
export function Section({
  icone, titre, compte = null, badge = null, ouvert = false, children,
}: {
  icone: string; titre: string; compte?: number | null; badge?: string | null; ouvert?: boolean; children: ReactNode;
}) {
  return (
    <details open={ouvert} className="group bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10 overflow-hidden">
      <summary className="list-none cursor-pointer select-none flex items-center gap-3 px-4 py-3.5 hover:bg-cream-50 dark:hover:bg-white/5">
        <span className="text-xl">{icone}</span>
        <span className="flex-1 font-semibold text-gray-900 dark:text-white">{titre}</span>
        {badge ? <span className="text-[11px] font-bold uppercase tracking-wide bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">{badge}</span> : null}
        {compte != null ? <span className="text-xs font-bold bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full">{compte}</span> : null}
        <span className="text-gray-400 text-sm transition-transform group-open:rotate-180">▼</span>
      </summary>
      <div className="px-4 pb-4 [&>div]:mt-0 [&>div]:border-0 [&>div]:p-0 [&>div>h2:first-child]:hidden">
        {children}
      </div>
    </details>
  );
}
