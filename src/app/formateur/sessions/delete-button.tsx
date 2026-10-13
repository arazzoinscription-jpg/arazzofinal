"use client";

import { useTransition } from "react";
import { deleteSession } from "./actions";

export function DeleteSessionButton({ id, programmeeParAdmin = false }: { id: string; programmeeParAdmin?: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      onClick={() => {
        const question = programmeeParAdmin
          ? "Ce live a été programmé par l'administration : il sera ANNULÉ (et non supprimé). Il disparaît pour les élèves et ses rappels prévus sont annulés. Continuer ?"
          : "Supprimer cette session ?";
        if (!confirm(question)) return;
        startTransition(async () => {
          const r = await deleteSession(id);
          if (!r.ok) alert(r.error ?? "Action impossible.");
        });
      }}
      disabled={isPending}
      className="text-gray-400 hover:text-red-500 transition-colors p-2 flex-shrink-0"
      title={programmeeParAdmin ? "Annuler (programmé par l'administration)" : "Supprimer"}
    >
      {isPending ? "…" : "🗑"}
    </button>
  );
}
