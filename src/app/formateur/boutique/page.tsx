import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { patronImage } from "@/lib/patron-images";
import { SellList, type SellItem } from "./sell-list";

export const metadata = { title: "Mise en vente — Formateur" };
export const dynamic = "force-dynamic";

export default async function FormateurBoutiquePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from("users").select("role").eq("id", user!.id).single();
  const isAdmin = prof?.role === "admin";

  const admin = createAdminClient();

  // Espace formateur = SES propres formations/patrons uniquement (la gestion globale est dans /admin).
  const { data: courses } = await admin
    .from("courses").select("id, titre_fr, prix_dzd, thumbnail, formateur_id")
    .eq("formateur_id", user!.id).order("created_at", { ascending: false });

  const { data: patrons } = await admin
    .from("patrons").select("id, titre, prix_dzd, preview_url")
    .eq("formateur_id", user!.id).order("created_at", { ascending: false });

  // Packs du formateur
  const { data: packs } = await admin
    .from("course_packs").select("id, titre_fr, prix_dzd")
    .eq("formateur_id", user!.id).order("created_at", { ascending: false });

  // Produits existants liés (pour savoir ce qui est déjà en vente)
  const { data: products } = await admin
    .from("products").select("id, course_id, patron_id, type, files, price, is_active");

  const byCourse = new Map<string, { id: string; price: number; is_active: boolean }>();
  const byPatron = new Map<string, { id: string; price: number; is_active: boolean }>();
  const byPack = new Map<string, { id: string; price: number; is_active: boolean }>();
  for (const p of products ?? []) {
    if (p.course_id) byCourse.set(p.course_id, { id: p.id, price: Number(p.price), is_active: p.is_active });
    if (p.patron_id) byPatron.set(p.patron_id, { id: p.id, price: Number(p.price), is_active: p.is_active });
    if (p.type === "bundle") {
      const ref = ((p.files as string[]) ?? []).find((f) => f.startsWith("pack:"));
      if (ref) byPack.set(ref.slice(5), { id: p.id, price: Number(p.price), is_active: p.is_active });
    }
  }

  const courseItems: SellItem[] = (courses ?? []).map((c) => {
    const prod = byCourse.get(c.id);
    return {
      id: c.id, title: c.titre_fr ?? "Formation", image: c.thumbnail ?? null,
      sourcePrice: Number(c.prix_dzd ?? 0),
      productId: prod?.id ?? null, active: prod?.is_active ?? false, currentPrice: prod?.price ?? null,
    };
  });

  const patronItems: SellItem[] = (patrons ?? []).map((p) => {
    const prod = byPatron.get(p.id);
    return {
      id: p.id, title: p.titre ?? "Patron", image: p.preview_url || patronImage(p.id),
      sourcePrice: Number(p.prix_dzd ?? 0),
      productId: prod?.id ?? null, active: prod?.is_active ?? false, currentPrice: prod?.price ?? null,
    };
  });

  const packItems: SellItem[] = (packs ?? []).map((p) => {
    const prod = byPack.get(p.id);
    return {
      id: p.id, title: p.titre_fr ?? "Pack", image: null,
      sourcePrice: Number(p.prix_dzd ?? 0),
      productId: prod?.id ?? null, active: prod?.is_active ?? false, currentPrice: prod?.price ?? null,
    };
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <h1 className="font-playfair text-3xl font-bold text-gray-900 dark:text-white">Mise en vente</h1>
        <Link href="/boutique" target="_blank"
          className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300 hover:underline">
          Voir la boutique <ExternalLink size={15} />
        </Link>
      </div>
      <p className="text-gray-500 dark:text-white/50 mb-8">
        {isAdmin
          ? "Choisissez les formations et patrons à vendre, fixez le prix, et ils apparaîtront dans la boutique."
          : "Mettez vos patrons en vente. Pour les formations, publiez votre cours : la mise en vente est validée par l'administration."}
      </p>

      <SellList courses={courseItems} patrons={patronItems} packs={packItems} coursesReadonly={!isAdmin} patronsReadonly={!isAdmin} />
    </div>
  );
}
