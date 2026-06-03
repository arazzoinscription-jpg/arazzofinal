"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteQuestion } from "../actions";

/** Bouton de suppression d'une question. */
export function DeleteQuestionButton({ id, quizId }: { id: string; quizId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function remove() {
    if (!confirm("Supprimer cette question ?")) return;
    startTransition(async () => {
      await deleteQuestion(id, quizId);
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
