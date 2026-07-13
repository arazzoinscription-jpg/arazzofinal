import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ATELIER_ADVANTAGES, ATELIER_GIFT_TITLE, ATELIER_UNLOCK_MESSAGE } from "@/lib/atelier-gift";

export const metadata = { title: "Espace Atelier — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function EspaceAtelierPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Espace VERROUILLÉ : le contenu (services de l'atelier) sera programmé plus tard.
  // Pour l'instant, on présente le cadeau et on incite à faire le projet de fin de stage.
  return (
    <div className="max-w-3xl">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b0818] via-violet-800 to-orange-600 text-white p-7 sm:p-10 text-center shadow-2xl">
        <div aria-hidden className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
        <div className="relative">
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-white/15 backdrop-blur ring-2 ring-white/25 mb-4">
            <Lock size={30} />
          </span>
          <h1 className="font-playfair text-3xl sm:text-4xl font-bold">{ATELIER_GIFT_TITLE}</h1>
          <p className="mt-3 text-white/85 font-dm text-lg max-w-xl mx-auto">{ATELIER_UNLOCK_MESSAGE}</p>
          <span className="inline-flex items-center gap-1.5 mt-5 text-xs font-bold uppercase tracking-wider bg-white/15 border border-white/25 rounded-full px-4 py-1.5">
            <Lock size={13} /> Espace verrouillé
          </span>
        </div>
      </div>

      {/* Les avantages */}
      <h2 className="font-playfair text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4 flex items-center gap-2">
        <Sparkles size={22} className="text-orange-DEFAULT" /> Ce que vous débloquez
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ATELIER_ADVANTAGES.map((a) => (
          <div key={a.title} className="relative rounded-2xl border border-cream-200 dark:border-white/10 bg-white dark:bg-white/[0.04] p-4 flex items-start gap-3">
            <span className="text-2xl leading-none">{a.icon}</span>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white">{a.title}</p>
              <p className="text-sm text-gray-500 dark:text-white/55 font-dm">{a.desc}</p>
            </div>
            <Lock size={14} className="absolute top-3 end-3 text-gray-300 dark:text-white/25" />
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 px-4 py-3 text-sm text-violet-900 dark:text-violet-200 font-dm text-center">
        🎁 <strong>1 an d'abonnement offert</strong> dans l'Espace Atelier — débloqué après votre projet de fin de stage.
      </div>

      {/* CTA vers le projet */}
      <div className="mt-6 text-center">
        <Link href="/dashboard/projet"
          className="inline-flex items-center gap-2 bg-orange-DEFAULT text-white px-7 py-3.5 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-colors shadow-glow">
          Faire mon projet de fin de stage <ArrowRight size={19} />
        </Link>
        <p className="mt-3 text-xs text-gray-400 dark:text-white/40 font-dm">L'Espace Atelier ouvrira bientôt. Préparez votre projet dès maintenant !</p>
      </div>
    </div>
  );
}
