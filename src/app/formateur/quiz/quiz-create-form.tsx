"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createQuiz } from "./actions";

export function QuizCreateForm({ lessons }: { lessons: { id: string; label: string }[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ lesson_id: "", title: "", type: "lesson_end", min_score: "70", time_limit: "", max_attempts: "3" });
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await createQuiz({
        lesson_id: form.lesson_id, title: form.title,
        type: form.type as any, min_score: Number(form.min_score),
        time_limit_seconds: form.time_limit ? Number(form.time_limit) * 60 : null,
        max_attempts: Number(form.max_attempts),
      });
      if (res.ok) router.push(`/formateur/quiz/${res.id}`);
      else setMsg({ ok: false, text: res.error ?? "Erreur" });
    });
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-cream-200 shadow-soft p-6 space-y-4">
      <h2 className="font-playfair text-xl font-bold text-gray-900">Nouveau quiz</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Leçon associée *</label>
        <select value={form.lesson_id} onChange={(e) => setForm({ ...form, lesson_id: e.target.value })} required
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
          <option value="">— Choisir une leçon —</option>
          {lessons.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre *</label>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Quiz : les bases du patron"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white">
            <option value="lesson_end">Fin de leçon</option>
            <option value="module_end">Fin de module</option>
            <option value="timed">Chronométré</option>
            <option value="practical">Pratique (photo)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Score min (%)</label>
          <input type="number" value={form.min_score} onChange={(e) => setForm({ ...form, min_score: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Temps (min)</label>
          <input type="number" value={form.time_limit} onChange={(e) => setForm({ ...form, time_limit: e.target.value })} placeholder="∞" className="w-full border border-gray-200 rounded-xl px-3 py-2.5" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tentatives</label>
          <input type="number" value={form.max_attempts} onChange={(e) => setForm({ ...form, max_attempts: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5" />
        </div>
      </div>
      {msg && <p className="text-sm text-red-600">{msg.text}</p>}
      <button type="submit" disabled={isPending} className="bg-violet-DEFAULT text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-50">
        {isPending ? "Création…" : "Créer et ajouter des questions →"}
      </button>
    </form>
  );
}
