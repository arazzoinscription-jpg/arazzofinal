import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CoverGrid, type CoverCourse } from "./cover-grid";

export const metadata = { title: "Images de couverture — Formateur" };
export const dynamic = "force-dynamic";

/** Une couverture est « cassée » si elle pointe vers l'ancien domaine WordPress supprimé. */
function coverState(thumbnail: string | null): CoverCourse["state"] {
  if (!thumbnail) return "missing";
  if (thumbnail.includes("formation-arazzo.com")) return "broken";
  return "ok";
}

export default async function CouverturesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: courses } = await admin
    .from("courses")
    .select("id, titre_fr, thumbnail, formateur_id")
    .or(`formateur_id.eq.${user.id},formateur_id.is.null`)
    .order("titre_fr", { ascending: true });

  const list: CoverCourse[] = (courses ?? []).map((c) => ({
    id: c.id,
    title: c.titre_fr ?? "Sans titre",
    thumbnail: c.thumbnail ?? null,
    state: coverState(c.thumbnail ?? null),
  }));

  const broken = list.filter((c) => c.state === "broken").length;
  const missing = list.filter((c) => c.state === "missing").length;

  return (
    <div>
      <Link href="/formateur/cours"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-white/60 hover:text-orange-600 mb-4">
        <ArrowLeft size={15} /> Retour à mes cours
      </Link>

      <div className="mb-6">
        <h1 className="font-playfair text-3xl font-bold text-gray-900 dark:text-white">Images de couverture</h1>
        <p className="text-gray-500 dark:text-white/50 mt-1 font-dm">
          Téléversez l'image de couverture de chaque cours. Choisissez la photo depuis votre appareil : elle est
          enregistrée directement sur le site (plus de dépendance à l'ancien site WordPress).
        </p>
      </div>

      {(broken > 0 || missing > 0) && (
        <div className="mb-6 rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-400/30 p-4 text-sm text-amber-900 dark:text-amber-200">
          <p className="font-semibold mb-1">À corriger</p>
          <p>
            {broken > 0 && <><b>{broken}</b> image(s) cassée(s) (ancien site WordPress supprimé)</>}
            {broken > 0 && missing > 0 && " · "}
            {missing > 0 && <><b>{missing}</b> cours sans image</>}
            . Téléversez une nouvelle image ci-dessous pour chacun.
          </p>
        </div>
      )}

      <CoverGrid courses={list} />
    </div>
  );
}
