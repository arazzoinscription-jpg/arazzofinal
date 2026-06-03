"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateCourse } from "../../actions";

export interface EditableCourse {
  id: string;
  titre_fr: string;
  titre_ar: string | null;
  description_fr: string | null;
  description_ar: string | null;
  niveau: "debutant" | "intermediaire" | "avance";
  duree: string | null;
  prix_dzd: number;
  prix_eur: number;
  thumbnail: string | null;
  published: boolean;
}

/** Formulaire d'édition d'un cours (accessible au formateur propriétaire et à l'admin). */
export function CourseEditForm({ course, backHref }: { course: EditableCourse; backHref: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    titre_fr: course.titre_fr ?? "",
    titre_ar: course.titre_ar ?? "",
    description_fr: course.description_fr ?? "",
    description_ar: course.description_ar ?? "",
    niveau: course.niveau ?? "debutant",
    duree: course.duree ?? "",
    prix_dzd: String(course.prix_dzd ?? ""),
    prix_eur: String(course.prix_eur ?? ""),
    thumbnail: course.thumbnail ?? "",
    published: course.published,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSaved(false);

    const res = await updateCourse({
      id: course.id,
      titre_fr: form.titre_fr.trim(),
      titre_ar: form.titre_ar.trim() || null,
      description_fr: form.description_fr.trim(),
      description_ar: form.description_ar.trim() || null,
      niveau: form.niveau as EditableCourse["niveau"],
      duree: form.duree.trim() || null,
      prix_dzd: Number(form.prix_dzd) || 0,
      prix_eur: Number(form.prix_eur) || 0,
      thumbnail: form.thumbnail.trim() || null,
      published: form.published,
    });

    setLoading(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    } else {
      setError(res.error ?? "Erreur lors de l'enregistrement.");
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-cream-200 space-y-5">
        <h2 className="font-semibold text-gray-900 text-lg">Informations générales</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre (français) *</label>
          <input value={form.titre_fr} onChange={(e) => set("titre_fr", e.target.value)} required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre (arabe)</label>
          <input value={form.titre_ar} onChange={(e) => set("titre_ar", e.target.value)} dir="rtl"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 text-right" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
          <textarea value={form.description_fr} onChange={(e) => set("description_fr", e.target.value)} required rows={5}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (arabe)</label>
          <textarea value={form.description_ar} onChange={(e) => set("description_ar", e.target.value)} dir="rtl" rows={4}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none text-right" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Prix (DA) *</label>
            <input type="number" min={0} value={form.prix_dzd} onChange={(e) => set("prix_dzd", e.target.value)} required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Prix (€) *</label>
            <input type="number" min={0} value={form.prix_eur} onChange={(e) => set("prix_eur", e.target.value)} required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Niveau</label>
            <select value={form.niveau} onChange={(e) => set("niveau", e.target.value as EditableCourse["niveau"])}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
              <option value="debutant">Débutant</option>
              <option value="intermediaire">Intermédiaire</option>
              <option value="avance">Avancé</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Durée totale</label>
            <input value={form.duree} onChange={(e) => set("duree", e.target.value)} placeholder="Ex: 8h30"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">URL miniature</label>
          <input value={form.thumbnail} onChange={(e) => set("thumbnail", e.target.value)} placeholder="https://…"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>

        {/* Statut publié / brouillon */}
        <div className="flex items-center justify-between bg-cream-50 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-800">Statut</p>
            <p className="text-xs text-gray-400">{form.published ? "Le cours est visible publiquement." : "Le cours est en brouillon (non visible)."}</p>
          </div>
          <button type="button" onClick={() => set("published", !form.published)} role="switch" aria-checked={form.published}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${form.published ? "bg-green-500" : "bg-gray-300"}`}>
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${form.published ? "translate-x-[22px]" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">{error}</p>}
      {saved && <p className="text-green-600 text-sm bg-green-50 px-4 py-3 rounded-xl">✓ Modifications enregistrées.</p>}

      <div className="flex gap-4">
        <Link href={backHref}
          className="flex-1 text-center border-2 border-gray-200 text-gray-600 py-3.5 rounded-xl font-semibold hover:bg-cream-50 transition-colors">
          Retour
        </Link>
        <button type="submit" disabled={loading}
          className="flex-1 bg-orange-DEFAULT text-white py-3.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50">
          {loading ? "Enregistrement…" : "Enregistrer les modifications"}
        </button>
      </div>
    </form>
  );
}
