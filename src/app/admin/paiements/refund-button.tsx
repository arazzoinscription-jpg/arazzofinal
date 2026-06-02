"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { refundEnrollment } from "../actions";

export function RefundButton({ enrollmentId }: { enrollmentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <button
      onClick={() => {
        const reason = prompt("Motif du remboursement ?", "Remboursement à la demande");
        if (reason === null) return;
        startTransition(async () => { await refundEnrollment(enrollmentId, reason); router.refresh(); });
      }}
      disabled={isPending}
      className="text-xs border border-red-200 text-red-600 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {isPending ? "…" : "Rembourser"}
    </button>
  );
}
