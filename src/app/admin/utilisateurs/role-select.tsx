"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setUserRole } from "../actions";

type Toggleable = "formateur" | "patronniste" | "admin";

// Élève est le socle : toujours présent, non décochable.
const LABELS: { key: "eleve" | Toggleable; label: string; fixed?: boolean }[] = [
  { key: "eleve", label: "Élève", fixed: true },
  { key: "formateur", label: "Formateur" },
  { key: "patronniste", label: "Patronniste" },
  { key: "admin", label: "Admin" },
];

const COLORS: Record<string, string> = {
  eleve: "text-gray-600",
  formateur: "text-violet-700",
  patronniste: "text-blush-600",
  admin: "text-orange-700",
};

export function RoleSelect({ userId, roles }: { userId: string; roles: string[] }) {
  const router = useRouter();
  const [current, setCurrent] = useState<string[]>(() =>
    Array.from(new Set(["eleve", ...(roles ?? [])])),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [err, setErr] = useState("");

  function toggle(role: Toggleable, grant: boolean) {
    setErr("");
    setBusy(role);
    const prev = current;
    // Optimiste
    setCurrent((c) => (grant ? Array.from(new Set([...c, role])) : c.filter((r) => r !== role)));
    startTransition(async () => {
      const res = await setUserRole({ userId, role, grant });
      if (!res.ok) {
        setCurrent(prev);
        setErr(res.error ?? "Erreur");
      } else if (res.roles) {
        setCurrent(res.roles);
        router.refresh();
      }
      setBusy(null);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      {LABELS.map(({ key, label, fixed }) => {
        const checked = current.includes(key);
        return (
          <label
            key={key}
            className={`flex items-center gap-2 text-sm ${COLORS[key]} ${fixed ? "opacity-60" : "cursor-pointer"}`}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={fixed || busy !== null}
              onChange={(e) => !fixed && toggle(key as Toggleable, e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 disabled:opacity-50"
            />
            <span className="flex items-center gap-1">
              {label}
              {busy === key && <Loader2 size={12} className="animate-spin" />}
            </span>
          </label>
        );
      })}
      {err && <p className="text-xs text-red-500 mt-0.5">{err}</p>}
    </div>
  );
}
