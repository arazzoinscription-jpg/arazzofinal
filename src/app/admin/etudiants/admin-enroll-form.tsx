"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2 } from "lucide-react";
import { manualEnroll, manualEnrollPack } from "@/app/formateur/cours/[id]/inscrits/actions";
import { toast } from "@/components/ui/toast";

type Opt = { id: string; titre_fr: string | null };

/** Inscription manuelle d'une élève à une FORMATION ou un PACK, par l'admin, avec le type d'inscription. */
export function AdminEnrollForm({ courses, packs = [] }: { courses: Opt[]; packs?: Opt[] }) {
  const router = useRouter();
  const [target, setTarget] = useState("");         // "course:<id>" | "pack:<id>"
  const [plan, setPlan] = useState<"total" | "abonnement">("total");
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) { toast("Choisissez une formation ou un pack", "error"); return; }
    if (!email.trim()) { toast("Saisissez l'email de l'élève", "error"); return; }
    const sep = target.indexOf(":");
    const kind = target.slice(0, sep);
    const id = target.slice(sep + 1);
    start(async () => {
      const res = kind === "pack"
        ? await manualEnrollPack({ packId: id, email: email.trim(), nom: nom.trim() || null, plan })
        : await manualEnroll({ courseId: id, email: email.trim(), nom: nom.trim() || null, plan });
      if (res.ok) {
        toast(plan === "abonnement" ? "Élève inscrite en abonnement ✓" : "Élève inscrite ✓", "success");
        setEmail(""); setNom("");
        router.refresh();
      } else toast(res.error ?? "Erreur", "error");
    });
  }

  const field = "border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white";

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
        <UserPlus size={16} className="text-violet-600" /> Inscrire une élève à une formation ou un pack
      </div>
      <div className="flex flex-wrap gap-2.5">
        <select value={target} onChange={(e) => setTarget(e.target.value)} className={`${field} min-w-56`}>
          <option value="">— Choisir une formation ou un pack —</option>
          <optgroup label="Formations">
            {courses.map((c) => <option key={c.id} value={`course:${c.id}`}>{c.titre_fr ?? "Formation"}</option>)}
          </optgroup>
          {packs.length > 0 && (
            <optgroup label="Packs">
              {packs.map((p) => <option key={p.id} value={`pack:${p.id}`}>📦 {p.titre_fr ?? "Pack"}</option>)}
            </optgroup>
          )}
        </select>
        <select value={plan} onChange={(e) => setPlan(e.target.value as "total" | "abonnement")} className={field} title="Type d'inscription">
          <option value="total">Inscription totale</option>
          <option value="abonnement">Abonnement (par tranches)</option>
        </select>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email de l'élève"
          className={`${field} flex-1 min-w-56`} />
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom (si nouveau compte)"
          className={`${field} min-w-40`} />
        <button type="submit" disabled={pending}
          className="inline-flex items-center gap-1.5 bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-60">
          {pending ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Inscrire
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        <strong>Abonnement</strong> : la formation/le pack doit être en mode abonnement (durée ≥ 2 mois) — l'élève démarre au mois 1, le reste s'ouvre au fil des paiements.
        Si l'email n'existe pas, un compte élève est créé (inactif — activez-le ensuite via « Activer &amp; envoyer l'accès »).
      </p>
    </form>
  );
}
