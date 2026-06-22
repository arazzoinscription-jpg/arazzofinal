"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignCourseFormateur } from "../actions";

/** Sélecteur pour affecter un formateur à un cours (admin). */
export function FormateurSelect({
  courseId, current, formateurs,
}: {
  courseId: string;
  current: string | null;
  formateurs: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const [val, setVal] = useState(current ?? "");
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");

  function change(v: string) {
    setErr("");
    const prev = val;
    setVal(v);
    start(async () => {
      const res = await assignCourseFormateur(courseId, v || null);
      if (!res.ok) { setVal(prev); setErr(res.error ?? "Erreur"); }
      else router.refresh();
    });
  }

  return (
    <div>
      <select value={val} onChange={(e) => change(e.target.value)} disabled={pending}
        className="text-sm border border-gray-100 rounded-lg px-2 py-1 bg-white max-w-[150px] focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60">
        <option value="">— Aucun —</option>
        {formateurs.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
      </select>
      {err && <p className="text-[11px] text-red-500 mt-0.5">{err}</p>}
    </div>
  );
}
