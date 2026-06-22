"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Ban, PauseCircle, CheckCircle2, UserX, Loader2 } from "lucide-react";
import { cancelEnrollment, setStudentStatus } from "./actions";
import { toast } from "@/components/ui/toast";

type Status = "actif" | "veille" | "bloque";
const LABEL: Record<Status, string> = { actif: "Actif", veille: "En veille", bloque: "Bloqué" };

/** Menu d'actions sur une élève inscrite : annuler l'inscription, mettre en veille, bloquer, réactiver. */
export function StudentActions({ courseId, userId, status }: { courseId: string; userId: string; status: Status }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function status_(next: Status) {
    setOpen(false);
    start(async () => {
      const res = await setStudentStatus(courseId, userId, next);
      if (res.ok) { toast(`Statut : ${LABEL[next]} ✅`, "success"); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  function cancel() {
    setOpen(false);
    if (!confirm("Annuler l'inscription de cette élève à ce cours ?")) return;
    start(async () => {
      const res = await cancelEnrollment(courseId, userId);
      if (res.ok) { toast("Inscription annulée ✅", "success"); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-cream-200 text-gray-500 hover:bg-cream-50 disabled:opacity-50"
        aria-label="Actions"
      >
        {pending ? <Loader2 size={15} className="animate-spin" /> : <MoreVertical size={16} />}
      </button>

      {open && (
        <div className="absolute end-0 mt-1 w-56 rounded-xl border border-cream-200 bg-white shadow-lg z-20 py-1.5 text-sm">
          {status !== "actif" && (
            <button onClick={() => status_("actif")} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-green-700 hover:bg-green-50">
              <CheckCircle2 size={16} /> Réactiver
            </button>
          )}
          {status !== "veille" && (
            <button onClick={() => status_("veille")} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-amber-700 hover:bg-amber-50">
              <PauseCircle size={16} /> Mettre en veille
            </button>
          )}
          {status !== "bloque" && (
            <button onClick={() => status_("bloque")} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-red-700 hover:bg-red-50">
              <Ban size={16} /> Bloquer
            </button>
          )}
          <div className="my-1 border-t border-cream-100" />
          <button onClick={cancel} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-gray-700 hover:bg-cream-50">
            <UserX size={16} /> Annuler l'inscription
          </button>
        </div>
      )}
    </div>
  );
}

export function StudentStatusBadge({ status }: { status: Status }) {
  if (status === "actif") return null;
  const cls = status === "bloque" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
  return <span className={`ms-2 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{LABEL[status]}</span>;
}
