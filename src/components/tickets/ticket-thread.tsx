"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMessage, setStatus, assignToMe } from "@/app/dashboard/support/actions";

type Msg = { id: string; body: string; created_at: string; authorName: string; mine: boolean; staff: boolean };

const STATUS: Record<string, { label: string; cls: string }> = {
  ouvert: { label: "Ouvert", cls: "bg-blue-100 text-blue-700" },
  en_cours: { label: "En cours", cls: "bg-yellow-100 text-yellow-700" },
  resolu: { label: "Résolu", cls: "bg-green-100 text-green-700" },
  ferme: { label: "Fermé", cls: "bg-gray-100 text-gray-500" },
};

export function TicketThread({
  ticketId, statut, messages, isStaff,
}: {
  ticketId: string; statut: string; messages: Msg[]; isStaff: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState("");

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setErr("");
    startTransition(async () => {
      const res = await addMessage(ticketId, body);
      if (res.ok) { setBody(""); router.refresh(); }
      else setErr(res.error ?? "Erreur");
    });
  }

  function changeStatus(s: "ouvert" | "en_cours" | "resolu" | "ferme") {
    startTransition(async () => { await setStatus(ticketId, s); router.refresh(); });
  }

  const closed = statut === "ferme";

  return (
    <div>
      {/* Statut + actions staff */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS[statut]?.cls}`}>{STATUS[statut]?.label}</span>
        {isStaff && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => startTransition(async () => { await assignToMe(ticketId); router.refresh(); })}
              className="text-xs border border-cream-200 px-3 py-1 rounded-lg hover:bg-cream-50 font-dm">M'assigner</button>
            <button onClick={() => changeStatus("en_cours")} className="text-xs border border-yellow-200 text-yellow-700 px-3 py-1 rounded-lg hover:bg-yellow-50 font-dm">En cours</button>
            <button onClick={() => changeStatus("resolu")} className="text-xs border border-green-200 text-green-700 px-3 py-1 rounded-lg hover:bg-green-50 font-dm">Résolu</button>
            <button onClick={() => changeStatus("ferme")} className="text-xs border border-gray-200 text-gray-500 px-3 py-1 rounded-lg hover:bg-gray-50 font-dm">Fermer</button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="space-y-3 mb-5">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.mine ? "bg-violet-DEFAULT text-white" : "bg-white border border-cream-200"}`}>
              <div className={`text-xs mb-0.5 ${m.mine ? "text-violet-200" : "text-gray-400"}`}>
                {m.authorName}{m.staff && " · Équipe"} · {new Date(m.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
              <p className={`whitespace-pre-line font-dm ${m.mine ? "text-white" : "text-gray-700"}`}>{m.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Réponse */}
      {closed ? (
        <p className="text-sm text-gray-400 font-dm bg-cream-50 rounded-xl px-4 py-3 text-center">Ce ticket est fermé.</p>
      ) : (
        <form onSubmit={send} className="flex gap-2">
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Votre réponse…"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          <button type="submit" disabled={isPending}
            className="bg-violet-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50">
            {isPending ? "…" : "Envoyer"}
          </button>
        </form>
      )}
      {err && <p className="text-red-500 text-sm mt-2">{err}</p>}
    </div>
  );
}
