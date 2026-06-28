import Link from "next/link";
import { BookOpen, Scissors } from "lucide-react";
import type { CreatorPortfolio } from "@/lib/community";

/**
 * Portfolio public d'un créateur sur son profil communauté :
 * ses formations (formateur) ou ses patrons (patronniste).
 */
export function CommunityPortfolio({ portfolio }: { portfolio: CreatorPortfolio }) {
  const isCourses = portfolio.kind === "courses";
  const Icon = isCourses ? BookOpen : Scissors;
  const title = isCourses ? "Ses formations" : "Ses patrons";
  const fmt = (n: number) => `${n.toLocaleString("fr-DZ")} DA`;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className="text-orange-300" />
        <h2 className="font-semibold text-white/90">{title}</h2>
        <span className="ms-auto text-sm text-white/50">{portfolio.items.length}</span>
      </div>

      {portfolio.items.length === 0 ? (
        <p className="text-white/50 font-dm text-center py-10 rounded-2xl border border-white/10 bg-white/[0.04]">
          {isCourses ? "Aucune formation publiée pour le moment." : "Aucun patron publié pour le moment."}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {portfolio.items.map((it) => (
            <Link key={it.id} href={it.href}
              className="group rounded-2xl overflow-hidden border border-white/10 bg-white/[0.05] hover:border-orange-300/50 transition-all">
              <div className="aspect-[4/3] bg-white/10 overflow-hidden">
                {it.image
                  ? <img src={it.image} alt={it.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  : <div className="w-full h-full grid place-items-center text-3xl">{isCourses ? "🎓" : "✂️"}</div>}
              </div>
              <div className="p-2.5">
                <p className="text-sm font-semibold text-white line-clamp-2 leading-snug">{it.title}</p>
                {it.priceDzd > 0 && <p className="text-xs text-orange-300 font-bold mt-1">{fmt(it.priceDzd)}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
