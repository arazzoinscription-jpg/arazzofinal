"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2 } from "lucide-react";
import { manualEnrollPack } from "@/app/formateur/cours/[id]/inscrits/actions";
import { toast } from "@/components/ui/toast";

/** Inscrit une élève à TOUS les cours d'un pack (espace formateur). */
export function PackEnrollForm({ packId }: { packId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { toast("Saisissez l'email de l'élève", "error"); return; }
    start(async () => {
      const res = await manualEnrollPack({ packId, email: email.trim(), nom: nom.trim() || null });
      if (res.ok) {
        toast(`Élève inscrite au pack (${res.added} cours) ✓`, "success");
        setEmail(""); setNom(""); setOpen(false);
        router.refresh();
      } else toast(res.error ?? "Erreur", "error");
    });
  }

  const field = "border border-cream-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white w-full";

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700 hover:text-violet-900">
        <UserPlus size={15} /> Inscrire une élève
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="w-full space-y-2 mt-1">
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email de l'élève" className={field} />
      <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom (si nouveau compte)" className={field} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="inline-flex items-center gap-1.5 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-60">
          {pending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Inscrire au pack
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700">Annuler</button>
      </div>
    </form>
  );
}
