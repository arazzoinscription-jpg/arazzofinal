interface StreakWidgetProps {
  streak: number;
  activityDays: string[]; // dates ISO "YYYY-MM-DD" où l'élève a été active
}

const JOURS = ["L", "M", "M", "J", "V", "S", "D"];

/** Widget de série : flamme animée + 7 derniers jours (✓ / ✗). */
export function StreakWidget({ streak, activityDays }: StreakWidgetProps) {
  const set = new Set(activityDays);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);
  const activeToday = set.has(todayIso);

  // 7 derniers jours (du plus ancien au plus récent)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() - (6 - i) * 86400000);
    const iso = d.toISOString().slice(0, 10);
    return { iso, label: JOURS[(d.getDay() + 6) % 7], active: set.has(iso), isToday: iso === todayIso };
  });

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-soft p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className={`text-4xl ${streak > 0 ? "animate-flame" : "grayscale opacity-50"}`}>🔥</span>
        <div>
          <div className="font-playfair text-2xl font-bold text-gray-900">{streak} jour{streak > 1 ? "s" : ""}</div>
          <div className="text-sm text-gray-500 font-dm">
            {streak > 0 ? "de suite !" : "Commencez votre série aujourd'hui"}
          </div>
        </div>
      </div>

      {!activeToday && (
        <div className="bg-orange-50 text-orange-700 text-sm font-dm rounded-xl px-3 py-2 mb-4">
          ⚡ Ne cassez pas votre série — terminez une leçon aujourd'hui !
        </div>
      )}

      <div className="flex justify-between gap-1">
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="text-[11px] text-gray-400 font-dm">{d.label}</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
              d.active ? "bg-orange-DEFAULT text-white"
                : d.isToday ? "border-2 border-dashed border-orange-300 text-orange-400"
                : "bg-cream-100 text-gray-300"
            }`}>
              {d.active ? "✓" : d.isToday ? "•" : "·"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
