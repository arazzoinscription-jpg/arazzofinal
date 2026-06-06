"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
import { approveRoleRequest, rejectRoleRequest } from "./actions";

export function RowActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function run(fn: (id: string) => Promise<{ ok: boolean; error?: string }>) {
    start(async () => {
      const res = await fn(id);
      if (!res.ok) alert(res.error || "Erreur");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => run(approveRoleRequest)}
        disabled={pending}
        className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
      >
        {pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approuver
      </button>
      <button
        onClick={() => run(rejectRoleRequest)}
        disabled={pending}
        className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 disabled:opacity-60 text-gray-700 dark:text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
      >
        <X size={13} /> Refuser
      </button>
    </div>
  );
}
