"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deletePatron } from "./actions";

export function DeletePatronButton({ id, titre }: { id: string; titre: string }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();

  function onDelete() {
    start(async () => {
      const res = await deletePatron(id);
      if (res.ok) router.refresh();
      else alert(res.error || "Erreur");
      setConfirm(false);
    });
  }

  if (confirm) {
    return (
      <span className="inline-flex items-center gap-1">
        <button onClick={onDelete} disabled={pending} className="text-xs font-semibold text-red-600 hover:underline">
          {pending ? <Loader2 size={13} className="animate-spin" /> : "Confirmer"}
        </button>
        <span className="text-gray-300">·</span>
        <button onClick={() => setConfirm(false)} className="text-xs text-gray-400 hover:underline">Annuler</button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      aria-label={`Supprimer ${titre}`}
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
    >
      <Trash2 size={16} />
    </button>
  );
}
