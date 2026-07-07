"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2, Save, GripVertical } from "lucide-react";
import { LessonVideoUploader } from "@/components/courses/lesson-video-uploader";
import { saveCourseContent } from "../content-actions";
import { toast } from "@/components/ui/toast";

export interface EditLesson { id: string | null; titre: string; video_url_bunny: string; devoir: string; devoir_obligatoire: boolean; duree_minutes: string; is_preview: boolean; }
export interface EditChapter { id: string | null; titre: string; unlockMonth: string; lessons: EditLesson[]; }

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

/** Éditeur complet du contenu d'un cours : chapitres, leçons, vidéo (upload Bunny ou URL). */
export function CourseContentEditor({ courseId, initial }: { courseId: string; initial: EditChapter[] }) {
  const router = useRouter();
  const [chapters, setChapters] = useState<EditChapter[]>(
    initial.length ? initial : [{ id: null, titre: "Chapitre 1", unlockMonth: "", lessons: [] }],
  );
  const [saving, startSave] = useTransition();
  const [error, setError] = useState("");

  function update(next: EditChapter[]) { setChapters(next); }

  function addChapter() {
    update([...chapters, { id: null, titre: `Chapitre ${chapters.length + 1}`, unlockMonth: "", lessons: [] }]);
  }
  function removeChapter(ci: number) {
    const ch = chapters[ci];
    const msg = ch.id
      ? "Supprimer ce chapitre et toutes ses leçons ? La progression des élèves sur ces leçons sera perdue."
      : "Supprimer ce chapitre ?";
    if (!confirm(msg)) return;
    update(chapters.filter((_, i) => i !== ci));
  }
  function setChapterField(ci: number, titre: string) {
    const next = [...chapters]; next[ci] = { ...next[ci], titre }; update(next);
  }
  function setChapterUnlockMonth(ci: number, unlockMonth: string) {
    const next = [...chapters]; next[ci] = { ...next[ci], unlockMonth }; update(next);
  }
  function moveChapter(ci: number, dir: -1 | 1) { update(move(chapters, ci, ci + dir)); }

  function addLesson(ci: number) {
    const next = [...chapters];
    next[ci] = { ...next[ci], lessons: [...next[ci].lessons, { id: null, titre: "", video_url_bunny: "", devoir: "Résumer le cours + dessiner le patron + vidéo de montage d'une pièce.", devoir_obligatoire: false, duree_minutes: "", is_preview: false }] };
    update(next);
  }
  function removeLesson(ci: number, li: number) {
    const l = chapters[ci].lessons[li];
    if (l.id && !confirm("Supprimer cette leçon ? La progression des élèves sur cette leçon sera perdue.")) return;
    const next = [...chapters];
    next[ci] = { ...next[ci], lessons: next[ci].lessons.filter((_, i) => i !== li) };
    update(next);
  }
  function setLessonField(ci: number, li: number, patch: Partial<EditLesson>) {
    const next = [...chapters];
    const lessons = [...next[ci].lessons];
    lessons[li] = { ...lessons[li], ...patch };
    next[ci] = { ...next[ci], lessons };
    update(next);
  }
  function moveLesson(ci: number, li: number, dir: -1 | 1) {
    const next = [...chapters];
    next[ci] = { ...next[ci], lessons: move(next[ci].lessons, li, li + dir) };
    update(next);
  }

  function save() {
    setError("");
    // Validation légère
    for (const ch of chapters) {
      if (!ch.titre.trim()) { setError("Chaque chapitre doit avoir un titre."); return; }
      for (const l of ch.lessons) {
        if (!l.titre.trim()) { setError("Chaque leçon doit avoir un titre."); return; }
      }
    }
    startSave(async () => {
      const res = await saveCourseContent({
        courseId,
        chapters: chapters.map((ch) => ({
          id: ch.id,
          titre: ch.titre.trim(),
          unlock_month: ch.unlockMonth && Number(ch.unlockMonth) >= 1 ? Number(ch.unlockMonth) : null,
          lessons: ch.lessons.map((l) => ({
            id: l.id,
            titre: l.titre.trim(),
            video_url_bunny: l.video_url_bunny.trim(),
            devoir: l.devoir.trim(),
            devoir_obligatoire: l.devoir_obligatoire,
            duree_minutes: l.duree_minutes ? Number(l.duree_minutes) : null,
            is_preview: l.is_preview,
          })),
        })),
      });
      if (res.ok) {
        toast("Contenu du cours enregistré ✓", "success");
        router.refresh();
      } else {
        setError(res.error ?? "Erreur lors de l'enregistrement.");
        toast(res.error ?? "Erreur lors de l'enregistrement.", "error");
      }
    });
  }

  const totalLessons = chapters.reduce((n, c) => n + c.lessons.length, 0);

  return (
    <div className="mt-8 bg-white rounded-2xl p-6 border border-cream-200">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-playfair text-xl font-bold text-gray-900">Contenu du cours</h2>
        <button type="button" onClick={addChapter}
          className="inline-flex items-center gap-1.5 text-sm text-orange-600 font-semibold hover:underline">
          <Plus size={16} /> Ajouter un chapitre
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-5 font-dm">
        {chapters.length} chapitre(s) · {totalLessons} leçon(s). Modifiez les titres, l'ordre, et la vidéo de chaque leçon (upload Bunny ou URL).
      </p>

      <div className="space-y-5">
        {chapters.map((ch, ci) => (
          <div key={ch.id ?? `new-${ci}`} className="border border-cream-200 rounded-xl p-4 bg-cream-50/40">
            <div className="flex items-center gap-2 mb-3">
              <GripVertical size={16} className="text-gray-300 shrink-0" />
              <input
                value={ch.titre}
                onChange={(e) => setChapterField(ci, e.target.value)}
                placeholder="Titre du chapitre"
                className="flex-1 font-semibold text-gray-800 border-0 border-b border-cream-200 pb-1.5 focus:outline-none focus:border-orange-DEFAULT bg-transparent"
              />
              {/* Mois d'ouverture (abonnement par tranches) — vide = découpe auto */}
              <label className="flex items-center gap-1 text-[11px] text-gray-500 shrink-0" title="Mois d'ouverture pour l'abonnement par tranches (vide = automatique)">
                <span className="hidden sm:inline">Mois</span>
                <input
                  type="number" min={1} max={24} value={ch.unlockMonth}
                  onChange={(e) => setChapterUnlockMonth(ci, e.target.value)}
                  placeholder="auto"
                  className="w-14 border border-cream-200 rounded-lg px-2 py-1 text-center text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                />
              </label>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => moveChapter(ci, -1)} disabled={ci === 0}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-cream-100 disabled:opacity-30" title="Monter">
                  <ChevronUp size={16} />
                </button>
                <button type="button" onClick={() => moveChapter(ci, 1)} disabled={ci === chapters.length - 1}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-cream-100 disabled:opacity-30" title="Descendre">
                  <ChevronDown size={16} />
                </button>
                <button type="button" onClick={() => removeChapter(ci)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500" title="Supprimer le chapitre">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-3 ml-2 sm:ml-4">
              {ch.lessons.map((l, li) => (
                <div key={l.id ?? `new-${li}`} className="rounded-xl border border-cream-200 bg-white p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400 w-6 shrink-0">{li + 1}.</span>
                    <input
                      value={l.titre}
                      onChange={(e) => setLessonField(ci, li, { titre: e.target.value })}
                      placeholder="Titre de la leçon"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    <input
                      value={l.duree_minutes}
                      onChange={(e) => setLessonField(ci, li, { duree_minutes: e.target.value })}
                      placeholder="min"
                      type="number"
                      className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => moveLesson(ci, li, -1)} disabled={li === 0}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-cream-100 disabled:opacity-30" title="Monter">
                        <ChevronUp size={15} />
                      </button>
                      <button type="button" onClick={() => moveLesson(ci, li, 1)} disabled={li === ch.lessons.length - 1}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-cream-100 disabled:opacity-30" title="Descendre">
                        <ChevronDown size={15} />
                      </button>
                      <button type="button" onClick={() => removeLesson(ci, li)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500" title="Supprimer la leçon">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <LessonVideoUploader
                    title={l.titre}
                    currentUrl={l.video_url_bunny}
                    onUploaded={(embedUrl) => setLessonField(ci, li, { video_url_bunny: embedUrl })}
                  />
                  <input
                    value={l.video_url_bunny}
                    onChange={(e) => setLessonField(ci, li, { video_url_bunny: e.target.value })}
                    placeholder="… ou collez l'URL vidéo Bunny.net"
                    dir="ltr"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <div>
                    <label className="block text-xs font-semibold text-violet-700 mb-1">📋 Devoir à faire (cette leçon)</label>
                    <textarea
                      value={l.devoir}
                      onChange={(e) => setLessonField(ci, li, { devoir: e.target.value })}
                      placeholder="Décrivez ce que l'élève doit réaliser…"
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-y"
                    />
                    <label className="flex items-center gap-2 text-sm mt-2 text-gray-700">
                      <input type="checkbox" checked={l.devoir_obligatoire}
                        onChange={(e) => setLessonField(ci, li, { devoir_obligatoire: e.target.checked })} />
                      <span className="font-semibold text-orange-700">Obligatoire pour le diplôme</span>
                      <span className="text-xs text-gray-400">(doit être validé pour débloquer le diplôme)</span>
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={l.is_preview}
                      onChange={(e) => setLessonField(ci, li, { is_preview: e.target.checked })} />
                    Leçon de prévisualisation gratuite
                  </label>
                </div>
              ))}

              <button type="button" onClick={() => addLesson(ci)}
                className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-orange-600 transition-colors">
                <Plus size={15} /> Ajouter une leçon
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl mt-4">{error}</p>}

      <div className="mt-5 flex justify-end">
        <button type="button" onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 bg-orange-DEFAULT text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? "Enregistrement…" : "Enregistrer le contenu"}
        </button>
      </div>
    </div>
  );
}
