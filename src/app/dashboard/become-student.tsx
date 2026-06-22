"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2 } from "lucide-react";
import { setAccountType } from "./account-actions";

/** Bouton « Devenir élève » : bascule le compte vers l'espace formations. */
export function BecomeStudent() {
  const [pending, start] = useTransition();
  const router = useRouter();

  function go() {
    start(async () => {
      const res = await setAccountType("formations");
      if (res.ok) router.refresh();
    });
  }

  return (
    <button
      onClick={go}
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 bg-orange-DEFAULT hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
    >
      {pending ? <Loader2 size={18} className="animate-spin" /> : <GraduationCap size={18} />}
      Devenir élève — accéder aux formations
    </button>
  );
}
