"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { CategoryPicker } from "@/components/courses/category-picker";
import { setCourseCategories } from "../category-actions";

export function CourseCategoryEditor({ courseId, initial }: { courseId: string; initial: string[] }) {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>(initial);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  function save() {
    setDone(false);
    start(async () => {
      const res = await setCourseCategories(courseId, ids);
      if (res.ok) { setDone(true); router.refresh(); setTimeout(() => setDone(false), 2500); }
      else alert(res.error || "Erreur");
    });
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-cream-200 mt-6">
      <h2 className="font-semibold text-gray-900 text-lg mb-1">Catégories</h2>
      <p className="text-xs text-gray-400 mb-3">Où ce cours apparaît dans le catalogue (Modélisme › Femme › Niveau 1, etc.).</p>
      <CategoryPicker value={ids} onChange={setIds} />
      <button onClick={save} disabled={pending}
        className="mt-4 inline-flex items-center gap-2 bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-60">
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Enregistrer les catégories
      </button>
      {done && <span className="ms-3 text-sm text-green-600 font-semibold">✓ Enregistré</span>}
    </div>
  );
}
