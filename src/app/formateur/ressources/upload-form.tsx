"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  { v: "pdf", label: "📄 PDF" },
  { v: "patron", label: "📐 Patron" },
  { v: "zip", label: "🗜 Archive ZIP" },
  { v: "video", label: "🎬 Vidéo bonus" },
  { v: "autre", label: "📎 Autre" },
];

export function UploadForm({ courses }: { courses: { id: string; titre_fr: string }[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [titre, setTitre] = useState("");
  const [type, setType] = useState("pdf");
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !titre) { setMsg({ ok: false, text: "Fichier et titre requis." }); return; }
    if (file.size > 52428800) { setMsg({ ok: false, text: "Fichier trop volumineux (max 50 Mo)." }); return; }

    setLoading(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("titre", titre);
    fd.append("type", type);
    if (courseId) fd.append("course_id", courseId);

    const res = await fetch("/api/resources/upload", { method: "POST", body: fd });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Ressource ajoutée ✓" });
      setTitre(""); if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } else {
      setMsg({ ok: false, text: data.error ?? "Erreur" });
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-cream-200 shadow-soft p-6 space-y-4">
      <h2 className="font-playfair text-xl font-bold text-gray-900">Ajouter une ressource</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre *</label>
        <input value={titre} onChange={(e) => setTitre(e.target.value)} required
          placeholder="Patron de base — taille 38"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
            {TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Formation</label>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option value="">Générale (toutes)</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.titre_fr}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Fichier * (max 50 Mo)</label>
        <input ref={fileRef} type="file" required
          className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-50 file:text-orange-600 file:font-semibold hover:file:bg-orange-100" />
      </div>

      {msg && <p className={`text-sm px-4 py-2.5 rounded-xl ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{msg.text}</p>}

      <button type="submit" disabled={loading}
        className="bg-orange-DEFAULT text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50">
        {loading ? "Envoi…" : "Téléverser"}
      </button>
    </form>
  );
}
