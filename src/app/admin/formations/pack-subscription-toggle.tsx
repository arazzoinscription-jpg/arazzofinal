"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { setPackSubscription } from "../actions";
import { batchSizes } from "@/lib/subscription-plan";

/**
 * Toggle « mode abonnement » d'un PACK (paiement par tranches + ouverture
 * progressive des chapitres de tous les cours du pack). Réservé à l'admin.
 * `chaptersCount` = total des chapitres de tous les cours inclus.
 */
export function PackSubscriptionToggle({
  packId, enabled, durationMonths, chaptersCount,
}: {
  packId: string;
  enabled: boolean;
  durationMonths: number | null;
  chaptersCount: number;
}) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [months, setMonths] = useState(durationMonths ?? 4);
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState("");

  function save(nextOn: boolean, nextMonths: number) {
    setErr("");
    startTransition(async () => {
      const res = await setPackSubscription({ packId, enabled: nextOn, durationMonths: nextOn ? nextMonths : null });
      if (!res.ok) { setOn(!nextOn); setErr(res.error ?? "Erreur"); }
      else router.refresh();
    });
  }

  function toggle() {
    const next = !on;
    setOn(next);
    save(next, months);
  }

  const sizes = on && chaptersCount > 0 ? batchSizes(chaptersCount, months) : [];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <button onClick={toggle} disabled={isPending} role="switch" aria-checked={on}
          title={on ? "Désactiver l'abonnement" : "Activer le paiement par tranches"}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-40 ${on ? "bg-violet-600" : "bg-gray-300"}`}>
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
        </button>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${on ? "text-violet-700" : "text-gray-400"}`}>
          <CalendarClock size={13} /> {on ? "Abonnement" : "—"}
        </span>
      </div>

      {on && (
        <div className="flex items-center gap-1.5">
          <input
            type="number" min={2} max={24} value={months}
            onChange={(e) => setMonths(Math.max(2, Math.min(24, Number(e.target.value) || 2)))}
            onBlur={() => save(true, months)}
            disabled={isPending}
            className="w-14 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <span className="text-[11px] text-gray-400">mois</span>
        </div>
      )}

      {sizes.length > 0 && (
        <span className="text-[10px] text-gray-400" title="Chapitres ouverts par mois">
          {chaptersCount} ch → {sizes.join(", ")}
        </span>
      )}
      {err && <span className="text-[11px] text-red-500">{err}</span>}
    </div>
  );
}
