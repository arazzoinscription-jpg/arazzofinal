import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CommunityVideoUploader } from "@/components/community/video-uploader";
import { createAdminClient } from "@/lib/supabase/admin";
import { FEED_LIBRARY_ID } from "@/lib/bunny/stream";
import { chargerAValider, chargerDefisAdmin } from "@/lib/visiteuses/a-valider";
import { FileAValider } from "./file-a-valider";
import { DefisAdmin } from "./defis-admin";

export const metadata = { title: "Communauté — Admin Arazzo" };
export const dynamic = "force-dynamic";

export default async function AdminCommunautePage() {
  // Publications des comptes sans formation à valider + défi de la semaine (migration 103 ; sinon message).
  const admin = createAdminClient();
  const [aValider, defis] = await Promise.all([chargerAValider(admin), chargerDefisAdmin(admin)]);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-gray-900">Communauté</h1>
          <p className="text-sm text-gray-500 font-dm">Validez les publications, lancez le défi de la semaine, publiez une vidéo dans le feed.</p>
        </div>
        <Link href="/communaute" className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:underline">
          Voir le feed <ArrowUpRight size={15} />
        </Link>
      </div>

      <FileAValider items={aValider.items} dispo={aValider.dispo} bibliotheque={FEED_LIBRARY_ID} />
      <DefisAdmin defis={defis} dispo={aValider.dispo} />

      <section className="space-y-3">
        <h2 className="font-semibold text-gray-900">Publier une vidéo dans le feed</h2>
        <CommunityVideoUploader sourceType="admin" />
      </section>
    </div>
  );
}
