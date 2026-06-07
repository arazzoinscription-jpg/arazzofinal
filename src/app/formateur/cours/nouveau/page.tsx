"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CategoryPicker } from "@/components/courses/category-picker";
import { setCourseCategories } from "../category-actions";

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function NewCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    titre_fr: "",
    titre_ar: "",
    description_fr: "",
    description_ar: "",
    prix_dzd: "",
    prix_eur: "",
    niveau: "debutant",
    duree: "",
    thumbnail: "",
  });
  const [catIds, setCatIds] = useState<string[]>([]);

  const [chapters, setChapters] = useState<
    { titre: string; lessons: { titre: string; video_url_bunny: string; duree_minutes: string; is_preview: boolean }[] }[]
  >([{ titre: "Chapitre 1", lessons: [] }]);

  function addChapter() {
    setChapters([...chapters, { titre: `Chapitre ${chapters.length + 1}`, lessons: [] }]);
  }

  function addLesson(chIdx: number) {
    const updated = [...chapters];
    updated[chIdx].lessons.push({ titre: "", video_url_bunny: "", duree_minutes: "", is_preview: false });
    setChapters(updated);
  }

  async function handleSubmit(e: React.FormEvent, publish: boolean) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Non authentifié"); setLoading(false); return; }

    const slug = slugify(form.titre_fr) + "-" + Date.now();

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .insert({
        titre_fr: form.titre_fr,
        titre_ar: form.titre_ar || null,
        slug,
        description_fr: form.description_fr,
        description_ar: form.description_ar || null,
        prix_dzd: Number(form.prix_dzd),
        prix_eur: Number(form.prix_eur),
        niveau: form.niveau,
        duree: form.duree || null,
        thumbnail: form.thumbnail || null,
        formateur_id: user.id,
        published: publish,
      })
      .select()
      .single();

    if (courseError || !course) {
      setError(courseError?.message ?? "Erreur lors de la création");
      setLoading(false);
      return;
    }

    // Catégories du cours
    if (catIds.length > 0) {
      try { await setCourseCategories(course.id, catIds); } catch { /* non bloquant */ }
    }

    // Insert chapters and lessons
    for (let ci = 0; ci < chapters.length; ci++) {
      const ch = chapters[ci];
      const { data: chapter } = await supabase
        .from("chapters")
        .insert({ course_id: course.id, titre: ch.titre, ordre: ci + 1 })
        .select()
        .single();

      if (chapter) {
        for (let li = 0; li < ch.lessons.length; li++) {
          const l = ch.lessons[li];
          await supabase.from("lessons").insert({
            chapter_id: chapter.id,
            titre: l.titre,
            video_url_bunny: l.video_url_bunny,
            duree_minutes: l.duree_minutes ? Number(l.duree_minutes) : null,
            ordre: li + 1,
            is_preview: l.is_preview,
          });
        }
      }
    }

    router.push("/formateur");
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-8">
        Créer un nouveau cours
      </h1>

      <form className="space-y-8">
        {/* Basic info */}
        <div className="bg-white rounded-2xl p-6 border border-cream-200 space-y-5">
          <h2 className="font-semibold text-gray-900 text-lg">Informations générales</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Titre (français) *
            </label>
            <input
              value={form.titre_fr}
              onChange={(e) => setForm({ ...form, titre_fr: e.target.value })}
              required
              placeholder="Ex: Caftan Moderne"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Titre (arabe)
            </label>
            <input
              value={form.titre_ar}
              onChange={(e) => setForm({ ...form, titre_ar: e.target.value })}
              placeholder="القفطان الحديث"
              dir="rtl"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 text-right"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description *
            </label>
            <textarea
              value={form.description_fr}
              onChange={(e) => setForm({ ...form, description_fr: e.target.value })}
              required
              rows={5}
              placeholder="Décrivez votre cours en détail…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Prix (DA) *
              </label>
              <input
                type="number"
                value={form.prix_dzd}
                onChange={(e) => setForm({ ...form, prix_dzd: e.target.value })}
                required
                placeholder="2500"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Prix (€) *
              </label>
              <input
                type="number"
                value={form.prix_eur}
                onChange={(e) => setForm({ ...form, prix_eur: e.target.value })}
                required
                placeholder="25"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Niveau</label>
              <select
                value={form.niveau}
                onChange={(e) => setForm({ ...form, niveau: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              >
                <option value="debutant">Débutant</option>
                <option value="intermediaire">Intermédiaire</option>
                <option value="avance">Avancé</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Durée totale</label>
              <input
                value={form.duree}
                onChange={(e) => setForm({ ...form, duree: e.target.value })}
                placeholder="Ex: 8h30"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">URL miniature</label>
            <input
              value={form.thumbnail}
              onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
              placeholder="https://storage.bunnycdn.com/…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Catégories</label>
            <p className="text-xs text-gray-400 mb-2">Cochez les catégories où ce cours doit apparaître (ex. Modélisme › Femme › Niveau 1).</p>
            <CategoryPicker value={catIds} onChange={setCatIds} />
          </div>
        </div>

        {/* Chapters */}
        <div className="bg-white rounded-2xl p-6 border border-cream-200">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 text-lg">Chapitres et leçons</h2>
            <button
              type="button"
              onClick={addChapter}
              className="text-sm text-orange-600 font-semibold hover:underline"
            >
              + Ajouter un chapitre
            </button>
          </div>

          <div className="space-y-6">
            {chapters.map((ch, ci) => (
              <div key={ci} className="border border-cream-200 rounded-xl p-4">
                <input
                  value={ch.titre}
                  onChange={(e) => {
                    const updated = [...chapters];
                    updated[ci].titre = e.target.value;
                    setChapters(updated);
                  }}
                  placeholder="Titre du chapitre"
                  className="w-full font-semibold text-gray-800 border-0 border-b border-cream-200 pb-2 mb-3 focus:outline-none focus:border-orange-DEFAULT bg-transparent"
                />

                {ch.lessons.map((l, li) => (
                  <div key={li} className="ml-4 mb-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={l.titre}
                        onChange={(e) => {
                          const updated = [...chapters];
                          updated[ci].lessons[li].titre = e.target.value;
                          setChapters(updated);
                        }}
                        placeholder="Titre de la leçon"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                      <input
                        value={l.duree_minutes}
                        onChange={(e) => {
                          const updated = [...chapters];
                          updated[ci].lessons[li].duree_minutes = e.target.value;
                          setChapters(updated);
                        }}
                        placeholder="Durée (min)"
                        type="number"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                    </div>
                    <input
                      value={l.video_url_bunny}
                      onChange={(e) => {
                        const updated = [...chapters];
                        updated[ci].lessons[li].video_url_bunny = e.target.value;
                        setChapters(updated);
                      }}
                      placeholder="URL vidéo Bunny.net"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={l.is_preview}
                        onChange={(e) => {
                          const updated = [...chapters];
                          updated[ci].lessons[li].is_preview = e.target.checked;
                          setChapters(updated);
                        }}
                      />
                      Leçon de prévisualisation gratuite
                    </label>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addLesson(ci)}
                  className="ml-4 text-sm text-gray-400 hover:text-orange-600 transition-colors"
                >
                  + Ajouter une leçon
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">{error}</p>
        )}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, false)}
            disabled={loading}
            className="flex-1 border-2 border-orange-DEFAULT text-orange-600 py-3.5 rounded-xl font-semibold hover:bg-orange-50 transition-colors disabled:opacity-50"
          >
            Enregistrer en brouillon
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={loading}
            className="flex-1 bg-orange-DEFAULT text-white py-3.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {loading ? "Publication…" : "Publier le cours"}
          </button>
        </div>
      </form>
    </div>
  );
}
