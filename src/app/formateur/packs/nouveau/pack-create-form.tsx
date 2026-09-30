"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X, ChevronUp, ChevronDown, Images } from "lucide-react";
import { createPack, updatePack, uploadPackImage, uploadPackGalleryImage } from "../actions";
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
  gallery?: string[];
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
  // Liste ORDONNÉE des cours choisis (l'ordre = la séquence de la formation).
  const [selected, setSelected] = useState<string[]>(initial?.courseIds ?? []);
  const [uploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // Galerie du pack (carrousel de la page pack). Upload immédiat → URLs, enregistrées avec le pack.
  const [gallery, setGallery] = useState<string[]>(initial?.gallery ?? []);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);

  async function onPickGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setGalleryBusy(true);
    try {
      for (const file of files.slice(0, 15 - gallery.length)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await uploadPackGalleryImage(fd);
        if (res.ok) setGallery((g) => [...g, res.url]);
        else toast(res.error ?? "Échec de l'upload", "error");
      }
    } finally {
      setGalleryBusy(false);
      if (galleryRef.current) galleryRef.current.value = "";
    }
  }
  const removeGallery = (url: string) => setGallery((g) => g.filter((u) => u !== url));

  const isSelected = (id: string) => selected.includes(id);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  // Déplace un cours dans la séquence (monter / descendre).
  function move(index: number, dir: -1 | 1) {
    setSelected((s) => {
      const j = index + dir;
      if (j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[index], next[j]] = [next[j], next[index]];
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

  // Cours sélectionnés DANS L'ORDRE choisi (pour l'affichage et le prix cumulé).
  const byId = new Map(courses.map((c) => [c.id, c]));
  const selectedCourses = selected.map((id) => byId.get(id)).filter(Boolean) as PackCourseOption[];
  const totalDzd = selectedCourses.reduce((sum, c) => sum + (c.prix_dzd ?? 0), 0);

  // Catégories auto : union des catégories des cours sélectionnés.
  const autoCategories = [...new Set(selectedCourses.flatMap((c) => c.categories ?? []))];

  async function submit(e: React.FormEvent, publish: boolean) {
    e.preventDefault();
    if (selected.length === 0) { setError("Sélectionnez au moins un cours."); return; }
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
      courseIds: selected,
      gallery,
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
          <p className="text-xs text-gray-400 mt-1.5">JPG / PNG · photo compressée automatiquement (jusqu'à 15 Mo).</p>
        </div>
      </div>

      {/* Galerie du pack : photos du carrousel en haut de la page de la formation. */}
      <div className="bg-white rounded-2xl p-6 border border-cream-200">
        <div className="flex items-center gap-2 mb-1">
          <Images size={18} className="text-orange-600" />
          <h2 className="font-semibold text-gray-900 text-lg">Galerie de la formation (carrousel)</h2>
        </div>
        <p className="text-xs text-gray-400 font-dm mb-4">Ces photos défilent dans le carrousel en haut de la page de la formation (jusqu'à 15).</p>

        {gallery.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
            {gallery.map((url) => (
              <div key={url} className="relative group aspect-square rounded-xl overflow-hidden border border-cream-200 bg-cream-100">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeGallery(url)} aria-label="Retirer"
                  className="absolute top-1.5 end-1.5 w-8 h-8 grid place-items-center rounded-full bg-black/55 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-red-600">
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={onPickGallery} disabled={galleryBusy} />
        <button type="button" onClick={() => galleryRef.current?.click()} disabled={galleryBusy || gallery.length >= 15}
          className="w-full inline-flex items-center justify-center gap-2 border-2 border-dashed border-cream-300 text-gray-600 py-4 rounded-xl font-semibold hover:bg-cream-50 hover:border-orange-300 transition-colors disabled:opacity-60">
          {galleryBusy ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          {galleryBusy ? "Envoi…" : gallery.length ? "Ajouter d'autres photos" : "Téléverser des photos"}
        </button>
      </div>

      {/* Séquence de la formation : cours choisis, dans l'ordre, réordonnables. */}
      {selectedCourses.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-cream-200">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-gray-900 text-lg">Ordre de la formation</h2>
            <span className="text-sm text-gray-400 font-dm">{selectedCourses.length} cours</span>
          </div>
          <p className="text-xs text-gray-400 font-dm mb-4">Rangez les cours dans l'ordre du parcours (le 1ᵉʳ en haut). Utilisez les flèches.</p>
          <div className="space-y-2">
            {selectedCourses.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-cream-200 bg-cream-50/60">
                <span className="w-7 h-7 shrink-0 grid place-items-center rounded-lg bg-violet-100 text-violet-700 text-sm font-bold">{i + 1}</span>
                <span className="flex-1 font-dm text-gray-800 truncate">{c.titre_fr}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter"
                    className="w-8 h-8 grid place-items-center rounded-lg border border-cream-200 text-gray-500 hover:bg-white hover:text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronUp size={16} />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === selectedCourses.length - 1} aria-label="Descendre"
                    className="w-8 h-8 grid place-items-center rounded-lg border border-cream-200 text-gray-500 hover:bg-white hover:text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronDown size={16} />
                  </button>
                  <button type="button" onClick={() => toggle(c.id)} aria-label="Retirer"
                    className="w-8 h-8 grid place-items-center rounded-lg border border-cream-200 text-gray-400 hover:bg-red-50 hover:text-red-500">
                    <X size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sélection des cours */}
      <div className="bg-white rounded-2xl p-6 border border-cream-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-lg">Cours inclus *</h2>
          <span className="text-sm text-gray-400 font-dm">{selected.length} sélectionné(s)</span>
        </div>

        {courses.length === 0 ? (
          <p className="text-sm text-gray-400 font-dm">Vous n'avez encore aucun cours à regrouper.</p>
        ) : (
          <div className="space-y-2">
            {courses.map((c) => (
              <label key={c.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  isSelected(c.id) ? "border-orange-DEFAULT bg-orange-50" : "border-cream-200 hover:bg-cream-50"
                }`}>
                <input type="checkbox" checked={isSelected(c.id)} onChange={() => toggle(c.id)} className="accent-violet-600 w-4 h-4" />
                <span className="flex-1 font-dm text-gray-800">{c.titre_fr}</span>
                <span className="text-xs text-gray-400">{Number(c.prix_dzd).toLocaleString("fr-DZ")} DA</span>
              </label>
            ))}
          </div>
        )}

        {selected.length > 0 && (
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
