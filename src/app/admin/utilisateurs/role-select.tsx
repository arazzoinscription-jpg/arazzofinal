"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeUserRole } from "../actions";

export function RoleSelect({ userId, role }: { userId: string; role: string }) {
  const router = useRouter();
  const [val, setVal] = useState(role);
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState("");

  function change(newRole: string) {
    setErr("");
    const prev = val;
    setVal(newRole);
    startTransition(async () => {
      const res = await changeUserRole({ userId, role: newRole as "eleve" | "formateur" | "admin" });
      if (!res.ok) { setVal(prev); setErr(res.error ?? "Erreur"); }
      else router.refresh();
    });
  }

  return (
    <div>
      <select value={val} onChange={(e) => change(e.target.value)} disabled={isPending}
        className={`text-sm border rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 ${
          val === "admin" ? "border-orange-300 text-orange-700" : val === "formateur" ? "border-violet-300 text-violet-DEFAULT" : "border-gray-200 text-gray-600"
        }`}>
        <option value="eleve">Élève</option>
        <option value="formateur">Formateur</option>
        <option value="admin">Admin</option>
      </select>
      {err && <p className="text-xs text-red-500 mt-0.5">{err}</p>}
    </div>
  );
}
