export interface LeaderboardEntry {
  rang: number;
  studentId: string;
  nom: string;
  xp: number;
  niveau: string;
}

function initials(nom: string) {
  return (nom || "?").trim().charAt(0).toUpperCase();
}

/** Classement mensuel : podium pour le top 3 + liste 4→10, élève courante surlignée. */
export function Leaderboard({ rows, currentUserId }: { rows: LeaderboardEntry[]; currentUserId: string }) {
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3, 10);
  // Ordre d'affichage du podium : 2 - 1 - 3
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean) as LeaderboardEntry[];
  const heights: Record<number, string> = { 1: "h-24", 2: "h-16", 3: "h-12" };
  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-cream-200 p-10 text-center text-gray-400 font-dm">
        Le classement se remplit avec l'activité du mois. Soyez la première ! 🚀
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-soft p-5">
      {/* Podium */}
      {top3.length > 0 && (
        <div className="flex items-end justify-center gap-3 mb-6">
          {podium.map((p) => (
            <div key={p.studentId} className="flex flex-col items-center w-24">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mb-1 ${
                p.studentId === currentUserId ? "bg-orange-DEFAULT text-white ring-2 ring-orange-200" : "bg-violet-100 text-violet-DEFAULT"
              }`}>
                {initials(p.nom)}
              </div>
              <div className="text-xs font-semibold text-gray-900 font-dm truncate max-w-full">{p.nom.split(" ")[0]}</div>
              <div className="text-[11px] text-gray-400 font-dm">{p.xp} XP</div>
              <div className={`w-full ${heights[p.rang]} bg-gradient-to-t from-violet-DEFAULT to-violet-400 rounded-t-xl mt-1 flex items-start justify-center pt-1 text-xl`}>
                {medals[p.rang]}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reste du top 10 */}
      <div className="divide-y divide-cream-100">
        {rest.map((r) => (
          <div key={r.studentId} className={`flex items-center gap-3 px-2 py-2.5 rounded-lg ${r.studentId === currentUserId ? "bg-violet-50" : ""}`}>
            <span className="w-6 text-center text-gray-400 font-bold font-dm">{r.rang}</span>
            <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-DEFAULT flex items-center justify-center text-sm font-bold">{initials(r.nom)}</div>
            <span className="flex-1 font-medium text-gray-900 font-dm truncate">
              {r.nom}{r.studentId === currentUserId ? " (vous)" : ""}
            </span>
            <span className="text-xs text-gray-400 font-dm capitalize hidden sm:inline">{r.niveau}</span>
            <span className="font-bold text-violet-DEFAULT font-dm">{r.xp} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
}
