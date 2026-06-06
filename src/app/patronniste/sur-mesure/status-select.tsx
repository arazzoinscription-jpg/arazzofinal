"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCustomOrderStatus } from "../patrons/actions";

const OPTIONS: { value: string; label: string }[] = [
  { value: "en_attente", label: "En attente" },
  { value: "en_cours", label: "En cours" },
  { value: "termine", label: "Terminé" },
  { value: "annule", label: "Annulé" },
];

export function StatusSelect({ id, current }: { id: string; current: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <select
      defaultValue={current}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await updateCustomOrderStatus(id, e.target.value);
          router.refresh();
        })
      }
      className="rounded-lg border border-cream-200 dark:border-white/15 bg-white dark:bg-white/5 px-2.5 py-1.5 text-sm font-medium text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
