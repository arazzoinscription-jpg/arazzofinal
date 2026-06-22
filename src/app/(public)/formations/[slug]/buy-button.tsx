"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, PlayCircle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Sur la fiche formation : on ne paie plus directement ici.
 *  - inscrit       → bouton « Accéder au cours »
 *  - non inscrit   → bouton « Voir sur la boutique » (page produit où se fait l'achat)
 *  - sans produit  → état « Bientôt en boutique »
 */
export function BuyButton({
  courseId, firstLessonId, productSlug, viewLabel, accessLabel, soonLabel,
}: {
  courseId: string;
  firstLessonId?: string;
  productSlug?: string | null;
  viewLabel: string;
  accessLabel: string;
  soonLabel: string;
}) {
  const supabase = createClient();
  const [state, setState] = useState<{ loading: boolean; isEnrolled: boolean }>({ loading: true, isEnrolled: false });

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) setState({ loading: false, isEnrolled: false }); return; }
      const { data: enroll } = await supabase
        .from("enrollments").select("id").eq("user_id", user.id).eq("course_id", courseId).maybeSingle();
      if (active) setState({ loading: false, isEnrolled: !!enroll });
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  if (state.loading) {
    return <div className="w-full py-3.5 rounded-xl bg-cream-100 dark:bg-white/10 animate-pulse" />;
  }

  if (state.isEnrolled) {
    return (
      <Link href={firstLessonId ? `/dashboard/cours/${firstLessonId}` : "/dashboard"}
        className="flex items-center justify-center gap-2 w-full bg-orange-DEFAULT text-white py-3.5 rounded-xl font-bold hover:bg-orange-600 transition-colors">
        <PlayCircle size={18} /> {accessLabel}
      </Link>
    );
  }

  if (!productSlug) {
    return (
      <div className="flex items-center justify-center gap-2 w-full bg-cream-100 dark:bg-white/10 text-gray-500 dark:text-white/50 py-3.5 rounded-xl font-semibold">
        <Clock size={18} /> {soonLabel}
      </div>
    );
  }

  return (
    <Link href={`/boutique/${productSlug}`}
      className="flex items-center justify-center gap-2 w-full bg-orange-DEFAULT text-white py-3.5 rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-glow">
      <ShoppingBag size={18} /> {viewLabel}
    </Link>
  );
}
