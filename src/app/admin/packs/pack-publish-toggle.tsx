"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { togglePackPublish } from "@/app/admin/actions";
import { toast } from "@/components/ui/toast";

/** Bascule publié / brouillon d'un pack depuis le catalogue admin. */
export function PackPublishToggle({ packId, published }: { packId: string; published: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function toggle() {
    start(async () => {
      const res = await togglePackPublish(packId, !published);
      if (res.ok) { toast(!published ? "Pack publié ✅" : "Pack repassé en brouillon", "success"); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  return (
    <button onClick={toggle} disabled={pending}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-60 ${
        published ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      }`}>
      {pending ? <Loader2 size={12} className="animate-spin" /> : <span>{published ? "● Publié" : "○ Brouillon"}</span>}
    </button>
  );
}
