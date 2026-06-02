"use client";

import { useState, useTransition } from "react";
import { createSession } from "./actions";

export function SessionForm({ courses }: { courses: { id: string; titre_fr: string }[] }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ titre: "", description: "", course_id: "", starts_at: "", meet_url: "" });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await createSession({
        titre: form.titre,
        description: form.description,
        course_id: form.course_id || null,
        starts_at: form.starts_at,
        meet_url: form.meet_url,
      });
      if (res.ok) {
        setMsg({ ok: true, text: "Session créée ✓" });
        setForm({ titre: "", description: "", course_id: "", starts_at: "", meet_url: "" });
      } else {
        setMsg({ ok: false, text: res.error ?? "Erreur" });
      }
    });
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-cream-200 shadow-soft p-6 space-y-4">
      <h2 className="font-playfair text-xl font-bold text-gray-900">Planifier une session live</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre *</label>
        <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} required
          placeholder="Atelier live : finitions du caftan"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Date & heure *</label>
          <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Formation (optionnel)</label>
          <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
            <option value="">Toutes les étudiantes</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.titre_fr}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Lien Meet / Zoom</label>
        <input type="url" value={form.meet_url} onChange={(e) => setForm({ ...form, meet_url: e.target.value })}
          placeholder="https://meet.google.com/xxx-xxxx-xxx"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
      </div>

      {msg && <p className={`text-sm px-4 py-2.5 rounded-xl ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{msg.text}</p>}

      <button type="submit" disabled={isPending}
        className="bg-violet-DEFAULT text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50">
        {isPending ? "Création…" : "Créer la session"}
      </button>
    </form>
  );
}
