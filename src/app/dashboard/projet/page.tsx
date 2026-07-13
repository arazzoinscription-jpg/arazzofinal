import { redirect } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Gift, Lock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashHeader } from "../dash-header";
import { ProjectUploader } from "./project-uploader";
import { listMyProjectMedia } from "./actions";
import { ATELIER_ADVANTAGES, ATELIER_GIFT_INTRO } from "@/lib/atelier-gift";

export const metadata = { title: "Projet de fin de stage — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function ProjetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const media = await listMyProjectMedia(user.id);

  return (
    <div className="max-w-3xl">
      <DashHeader index="10" eyebrow="Objectif final" title="Projet de fin de stage"
        subtitle="Votre réalisation finale — elle déclenche votre cadeau Espace Atelier." />

      {/* Le cadeau */}
      <div className="rounded-3xl border border-violet-100 dark:border-white/10 bg-gradient-to-br from-violet-50 to-orange-50 dark:from-violet-900/20 dark:to-orange-900/10 p-6 mb-6">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-10 h-10 rounded-2xl bg-orange-DEFAULT/15 text-orange-600 flex items-center justify-center"><Gift size={20} /></span>
          <h2 className="font-playfair text-xl font-bold text-gray-900 dark:text-white">Votre cadeau : l'Espace Atelier (1 an offert)</h2>
        </div>
        <p className="text-sm text-gray-700 dark:text-white/70 font-dm mb-4">{ATELIER_GIFT_INTRO}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {ATELIER_ADVANTAGES.map((a) => (
            <div key={a.title} className="flex items-start gap-2.5 bg-white/70 dark:bg-white/[0.04] rounded-xl px-3 py-2.5">
              <span className="text-lg leading-none">{a.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{a.title}</p>
                <p className="text-xs text-gray-500 dark:text-white/55 font-dm">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conditions */}
      <div className="rounded-3xl border border-cream-200 dark:border-white/10 bg-white dark:bg-white/[0.04] p-6 mb-6">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-10 h-10 rounded-2xl bg-violet-DEFAULT/10 text-violet-700 flex items-center justify-center"><GraduationCap size={20} /></span>
          <h2 className="font-playfair text-xl font-bold text-gray-900 dark:text-white">Les conditions</h2>
        </div>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-white/70 font-dm">
          <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" /> Terminez le parcours de formation exigé par votre formatrice.</li>
          <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" /> Réalisez votre <strong>projet de fin de stage</strong> (une pièce/collection aboutie).</li>
          <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" /> Envoyez ici les <strong>photos et vidéos</strong> de votre projet.</li>
          <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" /> Après validation, votre <strong>Espace Atelier</strong> se débloque.</li>
        </ul>
      </div>

      {/* Envoi des médias */}
      <div className="rounded-3xl border border-cream-200 dark:border-white/10 bg-white dark:bg-white/[0.04] p-6">
        <h2 className="font-playfair text-xl font-bold text-gray-900 dark:text-white mb-1">Mon projet — photos & vidéos</h2>
        <p className="text-sm text-gray-500 dark:text-white/50 font-dm mb-4">Montrez votre réalisation finale sous toutes ses coutures.</p>
        <ProjectUploader initial={media} />
      </div>

      <div className="mt-6 text-center">
        <Link href="/dashboard/espace-atelier"
          className="inline-flex items-center gap-2 bg-violet-700 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-violet-800 transition-colors">
          <Lock size={16} /> Voir mon Espace Atelier
        </Link>
      </div>
    </div>
  );
}
