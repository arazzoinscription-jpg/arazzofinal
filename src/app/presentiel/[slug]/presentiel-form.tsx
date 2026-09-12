"use client";

import { useState } from "react";
import { submitPresentielLead } from "@/app/actions/presentiel-lead";

const CRENEAUX = [
  "Samedi matin", "Samedi après-midi",
  "Dimanche matin", "Dimanche après-midi",
  "En semaine (matin)", "En semaine (après-midi)", "Le soir",
];

export default function PresentielForm({ offer }: { offer: string }) {
  const [f, setF] = useState({ full_name: "", phone: "", email: "", wilaya: "", message: "" });
  const [dispos, setDispos] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const toggle = (c: string) => setDispos((d) => (d.includes(c) ? d.filter((x) => x !== c) : [...d, c]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (f.full_name.trim().length < 2) { setErr("Votre nom est requis."); return; }
    if (f.phone.trim().length < 6) { setErr("Un numéro WhatsApp est requis."); return; }
    setState("sending");
    const res = await submitPresentielLead({ offer, ...f, availabilities: dispos });
    if (res.ok) setState("done");
    else { setErr(res.error || "Envoi impossible."); setState("idle"); }
  }

  if (state === "done") {
    return (
      <div className="rounded-2xl border-2 border-[#128a4c]/30 bg-[#128a4c]/5 p-6 text-center">
        <div className="text-3xl">🌸</div>
        <h3 className="font-serif text-xl font-semibold text-[#2A0880] mt-2">C'est bien noté !</h3>
        <p className="text-gray-600 mt-1">Nous vous rappellerons sur WhatsApp pour confirmer votre place et le créneau.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">Prénom & nom
          <input value={f.full_name} onChange={(e) => set("full_name", e.target.value)} required
            className="border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#5B16F9]" placeholder="Votre nom" />
        </label>
        <label className="grid gap-1 text-sm">WhatsApp
          <input value={f.phone} onChange={(e) => set("phone", e.target.value)} required type="tel"
            className="border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#5B16F9]" placeholder="0X XX XX XX XX" />
        </label>
        <label className="grid gap-1 text-sm">E-mail <span className="text-gray-400">(optionnel)</span>
          <input value={f.email} onChange={(e) => set("email", e.target.value)} type="email"
            className="border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#5B16F9]" placeholder="vous@exemple.com" />
        </label>
        <label className="grid gap-1 text-sm">Wilaya
          <input value={f.wilaya} onChange={(e) => set("wilaya", e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#5B16F9]" placeholder="Sétif" />
        </label>
      </div>

      <fieldset className="border border-gray-200 rounded-xl p-3">
        <legend className="text-sm font-semibold px-1">Quand pouvez-vous venir ?</legend>
        <div className="flex flex-wrap gap-2 mt-1">
          {CRENEAUX.map((c) => (
            <button type="button" key={c} onClick={() => toggle(c)}
              className={`text-sm rounded-full px-3 py-1.5 border ${dispos.includes(c) ? "bg-[#5B16F9] text-white border-[#5B16F9]" : "bg-white text-gray-600 border-gray-200"}`}>
              {c}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="grid gap-1 text-sm">Message <span className="text-gray-400">(optionnel)</span>
        <textarea value={f.message} onChange={(e) => set("message", e.target.value)} rows={2}
          className="border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#5B16F9] resize-none" placeholder="Une question ?" />
      </label>

      {err ? <p className="text-red-600 text-sm">{err}</p> : null}
      <button type="submit" disabled={state === "sending"}
        className="bg-gradient-to-br from-[#FE7223] to-[#f2520a] text-white font-bold px-6 py-4 rounded-xl hover:brightness-105 transition disabled:opacity-60">
        {state === "sending" ? "Envoi…" : "Je suis intéressée →"}
      </button>
      <p className="text-center text-xs text-gray-400">Ce n'est pas encore une inscription : nous vous rappellerons pour confirmer.</p>
    </form>
  );
}
