import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CommunityVideoUploader } from "@/components/community/video-uploader";

export const metadata = { title: "Communauté — Admin Arazzo" };

export default function AdminCommunautePage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-gray-900">Communauté</h1>
          <p className="text-sm text-gray-500 font-dm">Publiez une vidéo directement dans le feed communauté.</p>
        </div>
        <Link href="/communaute" className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:underline">
          Voir le feed <ArrowUpRight size={15} />
        </Link>
      </div>

      <CommunityVideoUploader sourceType="admin" />
    </div>
  );
}
