/**
 * Couleurs des teintes de « Ma classe ». Ce fichier vit dans src/app (et non src/lib)
 * parce que Tailwind ne génère que les classes trouvées dans src/app, src/components, src/pages.
 */
import type { Teinte } from "@/lib/classe/vue";

/** Classes Tailwind par teinte : bordure de carte, anneau d'avatar, pastille, puce de filtre. */
export const STYLE_TEINTE: Record<Teinte, { carte: string; anneau: string; pastille: string; puce: string; point: string }> = {
  vert: { carte: "border-t-emerald-500", anneau: "ring-emerald-500", pastille: "bg-emerald-50 text-emerald-700", puce: "border-emerald-300 text-emerald-800", point: "bg-emerald-500" },
  jaune: { carte: "border-t-amber-400", anneau: "ring-amber-400", pastille: "bg-amber-50 text-amber-800", puce: "border-amber-300 text-amber-800", point: "bg-amber-400" },
  rouge: { carte: "border-t-red-500", anneau: "ring-red-500", pastille: "bg-red-50 text-red-700", puce: "border-red-300 text-red-700", point: "bg-red-500" },
  jamais: { carte: "border-t-slate-400", anneau: "ring-slate-300", pastille: "bg-slate-100 text-slate-600", puce: "border-slate-300 text-slate-700", point: "bg-slate-400" },
  sans_progression: { carte: "border-t-violet-500", anneau: "ring-violet-400", pastille: "bg-violet-50 text-violet-700", puce: "border-violet-300 text-violet-700", point: "bg-violet-500" },
  indisponible: { carte: "border-t-gray-300 border-dashed", anneau: "ring-gray-200", pastille: "bg-gray-100 text-gray-500 italic", puce: "border-dashed border-gray-300 text-gray-500", point: "bg-gray-300" },
};

