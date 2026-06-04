"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AnnounceForm({ courses }: { courses: { id: string; titre_fr: string }[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ titre: "", body: "", course_id: "", sendEmail: true });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    const res = await fetch("/api/announcements/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titre: form.titre, body: form.body, course_id: form.course_id || null, sendEmail: form.sendEmail }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMsg({ ok: true, text: `Annonce envoyée à ${data.audience} étudiante(s) · ${data.emailsSent} email(s).` });
      setForm({ titre: "", body: "", course_id: "", sendEmail: true });
      router.refresh();
    } else setMsg({ ok: false, text: data.error ?? "Erreur" });
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-cream-200 shadow-soft p-6 space-y-4">
      <h2 className="font-playfair text-xl font-bold text-gray-900">Nouvelle annonce</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre *</label>
        <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} required
          placeholder="Nouvelle session live cette semaine !"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Message *</label>
        <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required rows={4}
          placeholder="Votre message aux étudiantes…"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Destinataires</label>
          <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option value="">Toutes les étudiantes</option>
            {courses.map((c) => <option key={c.id} value={c.id}>Inscrites à : {c.titre_fr}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 font-dm pb-2.5">
          <input type="checkbox" checked={form.sendEmail} onChange={(e) => setForm({ ...form, sendEmail: e.target.checked })} />
          Envoyer aussi par email
        </label>
      </div>

      {msg && <p className={`text-sm px-4 py-2.5 rounded-xl ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{msg.text}</p>}

      <button type="submit" disabled={loading}
        className="bg-orange-DEFAULT text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50">
        {loading ? "Envoi…" : "📢 Publier l'annonce"}
      </button>
    </form>
  );
}
