"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createPack, updatePack, uploadPackImage } from "../actions";
import { toast } from "@/components/ui/toast";

export interface PackCourseOption {
  id: string;
  titre_fr: string;
  prix_dzd: number;
  categories?: string[];
}

export interface PackCategoryOption { id: string; name: string }

export interface PackInitial {
  titre_fr: string;
  titre_ar: string;
  description_fr: string;
  prix_dzd: string;
  prix_eur: string;
  thumbnail: string;
  courseIds: string[];
  category_id?: string | null;
}

/** Formulaire de création OU d'édition d'un pack de cours (sélection multiple de cours). */
export function PackCreateForm({ courses, packId, initial, categoryOptions = [] }: { courses: PackCourseOption[]; packId?: string; initial?: PackInitial; categoryOptions?: PackCategoryOption[] }) {
  const router = useRouter();
  const isEdit = !!packId;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    titre_fr: initial?.titre_fr ?? "",
    titre_ar: initial?.titre_ar ?? "",
    description_fr: initial?.description_fr ?? "",
    prix_dzd: initial?.prix_dzd ?? "",
    prix_eur: initial?.prix_eur ?? "",
    thumbnail: initial?.thumbnail ?? "",
    category_id: initial?.category_id ?? "",
  });
  const [selected, setSelected] = useState<Set<string>>(new Set(initial?.courseIds ?? []));
  const [uploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    startUpload(async () => {
      const res = await uploadPackImage(fd);
      if (res.ok) { setForm((f) => ({ ...f, thumbnail: res.url })); toast("Photo ajoutée ✓", "success"); }
      else toast(res.error ?? "Échec de l'upload", "error");
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  // Total des cours sélectionnés (pour suggérer un prix de pack avantageux)
  const selectedCourses = courses.filter((c) => selected.has(c.id));
  const totalDzd = selectedCourses.reduce((sum, c) => sum + (c.prix_dzd ?? 0), 0);

  // Catégories auto : union des catégories des cours sélectionnés.
  const autoCategories = [...new Set(selectedCourses.flatMap((c) => c.categories ?? []))];

  async function submit(e: React.FormEvent, publish: boolean) {
    e.preventDefault();
    if (selected.size === 0) { setError("Sélectionnez au moins un cours."); return; }
    if (!form.titre_fr.trim()) { setError("Le titre est requis."); return; }
    setLoading(true);
    setError("");

    const payload = {
      titre_fr: form.titre_fr.trim(),
      titre_ar: form.titre_ar.trim() || null,
      description_fr: form.description_fr.trim() || null,
      prix_dzd: Number(form.prix_dzd) || 0,
      prix_eur: Number(form.prix_eur) || 0,
      thumbnail: form.thumbnail.trim() || null,
      published: publish,
      category_id: form.category_id || null,
      courseIds: [...selected],
    };
    const res = isEdit
      ? await updatePack({ id: packId!, ...payload })
      : await createPack(payload);

    setLoading(false);
    if (res.ok) { toast(isEdit ? "Pack mis à jour ✓" : "Pack créé ✓", "success"); router.push("/formateur/packs"); }
    else setError(res.error ?? "Erreur lors de l'enregistrement.");
  }

  return (
    <form className="space-y-6">
      {/* Infos générales */}
      <div className="bg-white rounded-2xl p-6 border border-cream-200 space-y-5">
        <h2 className="font-semibold text-gray-900 text-lg">Informations du pack</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre du pack (français) *</label>
          <input value={form.titre_fr} onChange={(e) => setForm({ ...form, titre_fr: e.target.value })} required
            placeholder="Ex: Pack Couture Complète"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre (arabe)</label>
          <input value={form.titre_ar} onChange={(e) => setForm({ ...form, titre_ar: e.target.value })} dir="rtl"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 text-right" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <textarea value={form.description_fr} onChange={(e) => setForm({ ...form, description_fr: e.target.value })} rows={4}
            placeholder="Décrivez ce que contient le pack…"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
        </div>

        {/* Catégorie du pack : détermine dans quelle catégorie il apparaît sur la page Offre. */}
        {categoryOptions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Catégorie (page Offre)</label>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option value="">— Aucune (n'apparaît pas dans une catégorie de l'offre) —</option>
              {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">Ex. « Modélisme femme » → le pack s'affiche quand on clique sur cette catégorie dans la page Offre.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Prix du pack (DA) *</label>
            <input type="number" min={0} value={form.prix_dzd} onChange={(e) => setForm({ ...form, prix_dzd: e.target.value })} required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Prix du pack (€) *</label>
            <input type="number" min={0} value={form.prix_eur} onChange={(e) => setForm({ ...form, prix_eur: e.target.value })} required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Photo du pack</label>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
          {form.thumbnail ? (
            <div className="relative inline-block">
              <img src={form.thumbnail} alt="Aperçu du pack" className="w-44 h-44 object-cover rounded-xl border border-cream-200" />
              <button type="button" onClick={() => setForm({ ...form, thumbnail: "" })}
                className="absolute -top-2 -end-2 bg-white border border-cream-200 rounded-full p-1 shadow hover:bg-red-50 text-gray-500 hover:text-red-500">
                <X size={15} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="w-44 h-44 rounded-xl border-2 border-dashed border-cream-300 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-orange-400 hover:text-orange-500 transition-colors disabled:opacity-60">
              {uploading ? <Loader2 size={26} className="animate-spin" /> : <ImagePlus size={26} />}
              <span className="text-xs font-semibold">{uploading ? "Envoi…" : "Ajouter une photo"}</span>
            </button>
          )}
          <p className="text-xs text-gray-400 mt-1.5">JPG / PNG · max 8 Mo</p>
        </div>
      </div>

      {/* Sélection des cours */}
      <div className="bg-white rounded-2xl p-6 border border-cream-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-lg">Cours inclus *</h2>
          <span className="text-sm text-gray-400 font-dm">{selected.size} sélectionné(s)</span>
        </div>

        {courses.length === 0 ? (
          <p className="text-sm text-gray-400 font-dm">Vous n'avez encore aucun cours à regrouper.</p>
        ) : (
          <div className="space-y-2">
            {courses.map((c) => (
              <label key={c.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  selected.has(c.id) ? "border-orange-DEFAULT bg-orange-50" : "border-cream-200 hover:bg-cream-50"
                }`}>
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="accent-violet-600 w-4 h-4" />
                <span className="flex-1 font-dm text-gray-800">{c.titre_fr}</span>
                <span className="text-xs text-gray-400">{Number(c.prix_dzd).toLocaleString("fr-DZ")} DA</span>
              </label>
            ))}
          </div>
        )}

        {selected.size > 0 && (
          <p className="text-xs text-gray-500 font-dm mt-3">
            Valeur cumulée des cours : <strong>{totalDzd.toLocaleString("fr-DZ")} DA</strong>
            {form.prix_dzd && Number(form.prix_dzd) < totalDzd && (
              <span className="text-green-600"> · économie de {(totalDzd - Number(form.prix_dzd)).toLocaleString("fr-DZ")} DA pour l'élève</span>
            )}
          </p>
        )}

        {autoCategories.length > 0 && (
          <div className="mt-3 border-t border-cream-100 pt-3">
            <p className="text-xs font-semibold text-gray-500 mb-1.5">Catégories du pack (reprises des cours) :</p>
            <div className="flex flex-wrap gap-1.5">
              {autoCategories.map((c, i) => (
                <span key={i} className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">🏷️ {c}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

      <div className="flex gap-4">
        <button type="button" onClick={(e) => submit(e, false)} disabled={loading}
          className="flex-1 border-2 border-orange-DEFAULT text-orange-600 py-3.5 rounded-xl font-semibold hover:bg-orange-50 transition-colors disabled:opacity-50">
          {isEdit ? "Enregistrer (brouillon)" : "Enregistrer en brouillon"}
        </button>
        <button type="button" onClick={(e) => submit(e, true)} disabled={loading}
          className="flex-1 bg-orange-DEFAULT text-white py-3.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50">
          {loading ? "Enregistrement…" : isEdit ? "Enregistrer et publier" : "Publier le pack"}
        </button>
      </div>
    </form>
  );
}
