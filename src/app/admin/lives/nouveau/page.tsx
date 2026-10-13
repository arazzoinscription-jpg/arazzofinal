import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminConnecte } from "@/lib/student-care/guard";
import { coursNiveaux, etatMigration } from "@/lib/live-care/load";
import { ajouterJours, jourAlger } from "@/lib/live-care/temps";
import { creerLiveAction } from "../actions";
import { FormulaireLive } from "../formulaire";

export const metadata = { title: "Programmer un live — Admin" };
export const dynamic = "force-dynamic";

export default async function NouveauLivePage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  if (!(await adminConnecte())) redirect("/dashboard");
  const admin = createAdminClient();
  if (await etatMigration(admin)) redirect("/admin/lives");
  const niveaux = await coursNiveaux(admin);
  const demain = ajouterJours(jourAlger(new Date()), 1);
  const erreur = Array.isArray(searchParams.erreur) ? searchParams.erreur[0] : searchParams.erreur;
  return (
    <div className="px-4 lg:px-8 py-6 max-w-3xl">
      <Link href="/admin/lives" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3"><ArrowLeft size={15} /> Retour aux lives</Link>
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-4">Programmer un live</h1>
      {erreur ? <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-2 text-sm text-red-700">{erreur}</div> : null}
      <FormulaireLive
        action={creerLiveAction}
        niveaux={niveaux}
        mode="creer"
        valeurs={{ titre: "", description: "", jour: demain, heure: "20:00", duree_minutes: 60, lien: "", course_ids: [], recurrence: "unique", jour_fin: ajouterJours(demain, 28), rappels: [] }}
      />
    </div>
  );
}
