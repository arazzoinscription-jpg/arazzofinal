"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTicket } from "./actions";

export function NewTicket() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ sujet: "", body: "", priorite: "normale" as "basse" | "normale" | "haute" });
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    startTransition(async () => {
      const res = await createTicket(form);
      if (res.ok) { setForm({ sujet: "", body: "", priorite: "normale" }); setOpen(false); router.push(`/dashboard/support/${res.id}`); }
      else setErr(res.error ?? "Erreur");
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
        + Nouveau ticket
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-cream-200 shadow-soft p-6 space-y-4">
      <h2 className="font-playfair text-xl font-bold text-gray-900">Nouveau ticket</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Sujet *</label>
        <input value={form.sujet} onChange={(e) => setForm({ ...form, sujet: e.target.value })} required
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Message *</label>
        <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required rows={4}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Priorité</label>
        <select value={form.priorite} onChange={(e) => setForm({ ...form, priorite: e.target.value as any })}
          className="border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
          <option value="basse">Basse</option><option value="normale">Normale</option><option value="haute">Haute</option>
        </select>
      </div>
      {err && <p className="text-red-500 text-sm">{err}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="bg-orange-DEFAULT text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50">
          {isPending ? "Envoi…" : "Créer le ticket"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-6 py-2.5 rounded-xl border border-cream-200 text-gray-600 font-semibold hover:bg-cream-50">Annuler</button>
      </div>
    </form>
  );
}
