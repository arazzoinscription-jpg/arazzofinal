export interface BadgeItem {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string | null;
  xp_reward: number;
  earnedAt: string | null;
}

const CAT_LABEL: Record<string, string> = {
  couture: "Couture", quiz: "Quiz", streak: "Régularité", special: "Spécial",
};

/** Grille de tous les badges : obtenus = colorés (+ date), verrouillés = grisés (+ condition). */
export function BadgesGrid({ badges }: { badges: BadgeItem[] }) {
  const earnedCount = badges.filter((b) => b.earnedAt).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-playfair text-xl font-bold text-gray-900">Badges</h2>
        <span className="text-sm text-gray-400 font-dm">{earnedCount}/{badges.length} obtenus</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {badges.map((b, i) => {
          const got = !!b.earnedAt;
          return (
            <div
              key={b.slug}
              style={got ? { animationDelay: `${i * 60}ms` } : undefined}
              className={`rounded-2xl p-4 border text-center ${
                got ? "bg-white border-orange-200 shadow-soft animate-badge-pop" : "bg-cream-50 border-cream-200"
              }`}
            >
              <div className={`text-4xl mb-2 ${got ? "" : "grayscale opacity-40"}`}>{b.icon}</div>
              <div className={`font-semibold text-sm font-dm ${got ? "text-gray-900" : "text-gray-400"}`}>{b.name}</div>
              <div className="text-[11px] text-gray-400 font-dm mt-0.5 leading-snug">{b.description}</div>
              <div className="mt-1.5 flex items-center justify-center gap-1.5">
                {b.category && (
                  <span className="text-[10px] bg-violet-50 text-violet-DEFAULT px-1.5 py-0.5 rounded-full">
                    {CAT_LABEL[b.category] ?? b.category}
                  </span>
                )}
                <span className="text-[10px] font-bold text-orange-DEFAULT">+{b.xp_reward}</span>
              </div>
              {got && (
                <div className="text-[10px] text-green-600 font-dm mt-1">
                  ✓ {new Date(b.earnedAt as string).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
