import { ArrowUpRight } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: string | number;
  trend: string;
  highlighted?: boolean;
}

/** Carte KPI — la première est surlignée (fond violet du logo, texte blanc). */
export function StatCard({ title, value, trend, highlighted = false }: StatCardProps) {
  return (
    <div
      className={`relative rounded-2xl p-6 shadow-sm transition-shadow hover:shadow-md ${
        highlighted
          ? "bg-[#6B21C8] text-white"
          : "bg-white text-[#1a1a1a] border border-gray-100"
      }`}
    >
      {/* Bouton flèche en coin */}
      <button
        type="button"
        aria-label="Voir le détail"
        className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          highlighted ? "bg-white/15 hover:bg-white/25 text-white" : "bg-gray-50 hover:bg-gray-100 text-gray-500"
        }`}
      >
        <ArrowUpRight size={16} />
      </button>

      <p className={`text-sm font-medium ${highlighted ? "text-white/80" : "text-gray-500"}`}>{title}</p>
      <p className="mt-3 text-4xl font-bold tracking-tight">{value}</p>
      <p className={`mt-2 text-xs ${highlighted ? "text-white/70" : "text-[#E8650A]"}`}>↗ {trend}</p>
    </div>
  );
}
