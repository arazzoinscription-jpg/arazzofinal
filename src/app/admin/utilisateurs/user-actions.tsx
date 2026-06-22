"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Ban, PauseCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { setUserStatus, bulkActivateAndInvite } from "../actions";
import { toast } from "@/components/ui/toast";

type Status = "actif" | "veille" | "bloque";

const LABEL: Record<Status, string> = { actif: "Actif", veille: "En veille", bloque: "Bloqué" };

/** Menu d'actions sur un compte : réactiver / mettre en veille / bloquer. */
export function UserActions({ userId, status, isAdmin }: { userId: string; status: Status; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function act(next: Status) {
    setOpen(false);
    start(async () => {
      const res = await setUserStatus({ userId, status: next });
      if (res.ok) { toast(`Statut : ${LABEL[next]} ✅`, "success"); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  function sendAccess() {
    setOpen(false);
    start(async () => {
      const res = await bulkActivateAndInvite([userId]);
      if (res.ok && res.sent) { toast("Compte activé · accès envoyé par email ✅", "success"); router.refresh(); }
      else toast(res.error ?? "Envoi impossible", "error");
    });
  }

  if (isAdmin) {
    return <span className="text-xs text-gray-300">—</span>;
  }

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-100 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
        aria-label="Actions"
      >
        {pending ? <Loader2 size={15} className="animate-spin" /> : <MoreVertical size={16} />}
      </button>

      {open && (
        <div className="absolute end-0 mt-1 w-60 rounded-xl border border-gray-100 bg-white shadow-lg z-20 py-1.5 text-sm">
          <button onClick={sendAccess} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-violet-700 hover:bg-violet-50 font-semibold">
            <Mail size={16} /> Activer &amp; envoyer l'accès
          </button>
          <div className="my-1 border-t border-gray-100" />
          {status !== "actif" && (
            <button onClick={() => act("actif")} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-green-700 hover:bg-green-50">
              <CheckCircle2 size={16} /> Réactiver
            </button>
          )}
          {status !== "veille" && (
            <button onClick={() => act("veille")} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-amber-700 hover:bg-amber-50">
              <PauseCircle size={16} /> Mettre en veille
            </button>
          )}
          {status !== "bloque" && (
            <button onClick={() => act("bloque")} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-red-700 hover:bg-red-50">
              <Ban size={16} /> Bloquer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Pastille de statut. */
export function StatusBadge({ status }: { status: Status }) {
  const cls = status === "bloque" ? "bg-red-100 text-red-700"
    : status === "veille" ? "bg-amber-100 text-amber-700"
    : "bg-green-100 text-green-700";
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>{LABEL[status]}</span>;
}
