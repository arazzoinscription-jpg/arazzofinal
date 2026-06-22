"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Hand, Loader2 } from "lucide-react";
import { claimCustomOrder } from "../patrons/actions";

/** Bouton « Je la fais » : le patronniste prend en charge la commande (premier arrivé). */
export function ClaimButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setErr(null);
            const res = await claimCustomOrder(id);
            if (res.ok) router.refresh();
            else setErr(res.error || "Erreur");
          })
        }
        className="w-full inline-flex items-center justify-center gap-2 bg-orange-DEFAULT hover:bg-orange-600 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl transition-colors"
      >
        {pending ? <Loader2 size={17} className="animate-spin" /> : <Hand size={17} />}
        Je la fais
      </button>
      {err && <p className="text-xs text-red-600 mt-1.5 text-center">{err}</p>}
    </div>
  );
}
