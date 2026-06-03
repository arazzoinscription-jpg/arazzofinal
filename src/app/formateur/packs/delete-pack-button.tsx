"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePack } from "./actions";

/** Bouton de suppression d'un pack. */
export function DeletePackButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function remove() {
    if (!confirm("Supprimer ce pack ? Les cours qu'il contient ne sont pas supprimés.")) return;
    startTransition(async () => {
      await deletePack(id);
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
