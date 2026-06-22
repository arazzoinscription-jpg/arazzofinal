"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2 } from "lucide-react";
import { manualEnroll } from "@/app/formateur/cours/[id]/inscrits/actions";
import { toast } from "@/components/ui/toast";

/** Inscription manuelle d'une élève à un cours, par l'admin. */
export function AdminEnrollForm({ courses }: { courses: { id: string; titre_fr: string | null }[] }) {
  const router = useRouter();
  const [courseId, setCourseId] = useState("");
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId) { toast("Choisissez un cours", "error"); return; }
    if (!email.trim()) { toast("Saisissez l'email de l'élève", "error"); return; }
    start(async () => {
      const res = await manualEnroll({ courseId, email: email.trim(), nom: nom.trim() || null });
      if (res.ok) {
        toast("Élève inscrite ✓", "success");
        setEmail(""); setNom("");
        router.refresh();
      } else toast(res.error ?? "Erreur", "error");
    });
  }

  const field = "border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white";

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
        <UserPlus size={16} className="text-violet-600" /> Inscrire une élève à un cours
      </div>
      <div className="flex flex-wrap gap-2.5">
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={`${field} min-w-52`}>
          <option value="">— Choisir un cours —</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.titre_fr ?? "Cours"}</option>)}
        </select>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email de l'élève"
          className={`${field} flex-1 min-w-56`} />
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom (si nouveau compte)"
          className={`${field} min-w-44`} />
        <button type="submit" disabled={pending}
          className="inline-flex items-center gap-1.5 bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-60">
          {pending ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Inscrire
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2">Si l'email n'existe pas, un compte élève est créé (inactif — activez-le ensuite via « Activer & envoyer l'accès »).</p>
    </form>
  );
}
