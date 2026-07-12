import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Film } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CommunityVideoUploader } from "@/components/community/video-uploader";

export const metadata = { title: "Publier un reel — Communauté Arazzo" };
export const dynamic = "force-dynamic";

export default async function PublierReelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Réservé aux membres connectés (élèves inclus) ; les visiteurs sont invités à se connecter.
  if (!user) redirect("/login?redirect=/communaute/publier");

  return (
    <div className="min-h-[100dvh] bg-[#0b0818] text-white">
      <div className="max-w-lg mx-auto px-4 pt-[max(16px,env(safe-area-inset-top))] pb-24">
        <Link href="/communaute" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-6">
          <ArrowLeft size={16} /> Retour au feed
        </Link>

        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-11 h-11 rounded-2xl bg-orange-500/15 text-orange-300 flex items-center justify-center">
            <Film size={22} />
          </span>
          <h1 className="font-playfair text-2xl font-bold">Publier un reel</h1>
        </div>
        <p className="text-white/60 font-dm text-sm mb-6">
          Partagez une courte vidéo (montage, réalisation, coulisses…) avec la communauté.
          Durée maximale : <strong className="text-white/80">2 minutes</strong>.
        </p>

        {/* Reel élève : durée plafonnée à 120s (2 min) côté client ET serveur. */}
        <CommunityVideoUploader sourceType="student_reel" maxSeconds={120} />
      </div>
    </div>
  );
}
