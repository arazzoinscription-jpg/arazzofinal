"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteGroup } from "./actions";

/** Bouton de suppression d'un groupe. */
export function DeleteGroupButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function remove() {
    if (!confirm("Supprimer ce groupe et toutes ses publications ?")) return;
    startTransition(async () => {
      await deleteGroup(id);
      router.refresh();
    });
  }

  return (
    <button onClick={remove} disabled={isPending}
      className="text-red-400 hover:text-red-600 text-sm font-semibold disabled:opacity-50">
      {isPending ? "…" : "Supprimer"}
    </button>
  );
}
