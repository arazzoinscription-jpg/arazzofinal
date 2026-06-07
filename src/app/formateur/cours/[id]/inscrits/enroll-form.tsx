"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2 } from "lucide-react";
import { manualEnroll } from "./actions";
import { toast } from "@/components/ui/toast";

export function EnrollForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await manualEnroll({ courseId, email, nom: nom || null });
      if (res.ok) {
        toast("Élève inscrite ✅", "success");
        setEmail(""); setNom("");
        router.refresh();
      } else {
        toast(res.error ?? "Erreur", "error");
      }
    });
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-cream-200 p-5 mb-6">
      <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <UserPlus size={18} className="text-orange-600" /> Inscription manuelle
      </h2>
      <p className="text-sm text-gray-500 font-dm mb-4">
        Inscrivez une élève directement (sans commande). Si le compte n'existe pas, il sera créé automatiquement.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Email de l'élève *"
          className="flex-1 border border-cream-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <input
          value={nom} onChange={(e) => setNom(e.target.value)}
          placeholder="Nom (optionnel)"
          className="sm:w-48 border border-cream-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <button type="submit" disabled={pending}
          className="inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-60">
          {pending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Inscrire
        </button>
      </div>
    </form>
  );
}
