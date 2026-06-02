"use client";

import { useTransition } from "react";
import { deleteResource } from "./actions";

export function DeleteResourceButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      onClick={() => { if (confirm("Supprimer cette ressource ?")) startTransition(() => { deleteResource(id); }); }}
      disabled={isPending}
      className="text-gray-400 hover:text-red-500 transition-colors p-2 flex-shrink-0"
      title="Supprimer"
    >
      {isPending ? "…" : "🗑"}
    </button>
  );
}
