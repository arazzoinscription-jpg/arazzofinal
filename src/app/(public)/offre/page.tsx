import { cookies } from "next/headers";
import { SalesPage, type CourseOption, type PayInfo, type ModelismeGroup } from "./sales-page";
import { normLang, isRtl } from "./offre-i18n";
import { createAdminClient } from "@/lib/supabase/admin";

// Les 3 grandes formations de Modélisme présentées en cartes sur l'offre.
// (slug de la catégorie racine → titre affiché + photo « Nano Banana »).
const MODELISME_CARDS: { slug: string; title: string; image: string }[] = [
  { slug: "modelisme-femme", title: "Modélisme Femme", image: "/images/offre-modelisme-femme.jpg" },
  { slug: "modelisme-homme", title: "Modélisme Homme", image: "/images/offre-modelisme-homme.jpg" },
  { slug: "modelisme-enfants", title: "Modélisme Enfants", image: "/images/offre-modelisme-enfants.jpg" },
];

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Arazzo Formation — Apprends la couture de zéro | تعلّمي الخياطة من الصفر",
  description: "Transforme ta passion en projet rentable : couture & modélisme de zéro, depuis chez toi. Teste ton niveau, choisis ta formation et inscris-toi. FR / AR / EN.",
};

export default async function OffrePage({ searchParams }: { searchParams: { c?: string } }) {
  const lang = normLang((await cookies()).get("lang")?.value);
  const admin = createAdminClient();
  const preselectCourseId = typeof searchParams?.c === "string" ? searchParams.c : null;

  const { data: courses } = await admin
    .from("courses")
    .select("*")
    .eq("published", true)
    .eq("visible_inscription", true)
    .order("ordre", { ascending: true });

  const options: CourseOption[] = (courses ?? []).map((c) => ({
    id: c.id,
    titre: c.titre_fr ?? "Formation",
    niveau: (c.niveau as string) ?? "debutant",
    prixDzd: Number(c.prix_dzd) || 0,
    thumbnail: c.thumbnail ?? null,
    slug: c.slug ?? "",
    subscriptionEnabled: (c as { subscription_enabled?: boolean }).subscription_enabled === true,
    durationMonths: (c as { duration_months?: number | null }).duration_months ?? null,
    fullDiscount: (c as { full_payment_discount?: boolean }).full_payment_discount !== false,
  }));

  // ── Organisation « Modélisme » : 3 cartes (Femme / Homme / Enfants) → niveaux ──
  // Chaque niveau liste les formations EN VENTE (publiées + visible_inscription)
  // que l'admin y a rangées via la page Catégorie. Lecture résiliente.
  const modelismeGroups: ModelismeGroup[] = [];
  try {
    const optById = new Map(options.map((o) => [o.id, o]));
    const { data: cats } = await admin
      .from("categories").select("id, parent_id, name_fr, slug, ordre").order("ordre", { ascending: true });
    const all = cats ?? [];
    const niveauIds: string[] = [];
    const niveauxByGroup = new Map<string, { id: string; name: string }[]>();
    const rootIdBySlug = new Map<string, string>();
    for (const card of MODELISME_CARDS) {
      const root = all.find((c) => c.slug === card.slug);
      if (!root) continue;
      rootIdBySlug.set(card.slug, root.id);
      const niveaux = all.filter((c) => c.parent_id === root.id).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
      niveauxByGroup.set(card.slug, niveaux.map((n) => ({ id: n.id, name: n.name_fr ?? "Niveau" })));
      niveauIds.push(...niveaux.map((n) => n.id));
    }

    // course_id ↔ category_id, restreint aux niveaux de modélisme concernés.
    const linksByCat = new Map<string, string[]>();
    if (niveauIds.length) {
      const { data: cc } = await admin
        .from("course_categories").select("course_id, category_id").in("category_id", niveauIds);
      for (const r of cc ?? []) {
        if (!linksByCat.has(r.category_id)) linksByCat.set(r.category_id, []);
        linksByCat.get(r.category_id)!.push(r.course_id);
      }
    }

    // Packs rangés dans une catégorie racine (migration 074) → affichés dans l'offre + enrôlables.
    const packsByRoot = new Map<string, { id: string; titre: string; prixDzd: number; slug: string }[]>();
    const rootIds = [...rootIdBySlug.values()];
    if (rootIds.length) {
      try {
        const { data: pks } = await admin
          .from("course_packs")
          .select("id, titre_fr, prix_dzd, thumbnail, slug, category_id, subscription_enabled, duration_months, full_payment_discount")
          .eq("published", true).in("category_id", rootIds);
        for (const p of (pks ?? []) as any[]) {
          if (!p.category_id) continue;
          if (!packsByRoot.has(p.category_id)) packsByRoot.set(p.category_id, []);
          packsByRoot.get(p.category_id)!.push({ id: p.id, titre: p.titre_fr ?? "Pack", prixDzd: Number(p.prix_dzd) || 0, slug: p.slug ?? "" });
          // Rendre le pack sélectionnable dans le formulaire d'inscription.
          if (!options.some((o) => o.id === p.id)) {
            options.push({
              id: p.id, titre: p.titre_fr ?? "Pack", niveau: "pack",
              prixDzd: Number(p.prix_dzd) || 0, thumbnail: p.thumbnail ?? null, slug: p.slug ?? "",
              subscriptionEnabled: p.subscription_enabled === true,
              durationMonths: p.duration_months ?? null,
              fullDiscount: p.full_payment_discount !== false,
              isPack: true,
            });
          }
        }
      } catch { /* migration 074 non appliquée */ }
    }

    for (const card of MODELISME_CARDS) {
      const niveaux = (niveauxByGroup.get(card.slug) ?? []).map((n) => {
        const courseIds = linksByCat.get(n.id) ?? [];
        const courses = courseIds
          .map((id) => optById.get(id))
          .filter((o): o is CourseOption => !!o)
          .map((o) => ({ id: o.id, titre: o.titre, prixDzd: o.prixDzd, slug: o.slug }));
        return { name: n.name, courses };
      }).filter((n) => n.courses.length > 0); // on n'affiche que les niveaux avec des formations en vente
      const packs = packsByRoot.get(rootIdBySlug.get(card.slug) ?? "") ?? [];
      modelismeGroups.push({ slug: card.slug, title: card.title, image: card.image, niveaux, packs });
    }
  } catch { /* taxonomie absente : pas de cartes modélisme */ }

  // Packs proposés en abonnement (publiés + mode abonnement). Lecture résiliente :
  // si la migration 047 n'est pas appliquée, la requête échoue → aucun pack ajouté.
  const { data: subPacks } = await admin
    .from("course_packs")
    .select("*")
    .eq("published", true)
    .eq("subscription_enabled", true)
    .order("created_at", { ascending: false });

  // Slug boutique (produit « bundle ») de chaque pack → lien « voir le détail ».
  const bundleSlugByPack = new Map<string, string>();
  const { data: bundleProds } = await admin.from("products").select("slug, files").eq("type", "bundle").eq("is_active", true);
  for (const b of bundleProds ?? []) {
    const ref = ((b.files as string[]) ?? []).find((f) => f.startsWith("pack:"));
    if (ref && b.slug) bundleSlugByPack.set(ref.slice(5), b.slug as string);
  }

  for (const p of subPacks ?? []) {
    if (options.some((o) => o.id === p.id)) continue; // déjà ajouté via une catégorie modélisme
    options.push({
      id: p.id,
      titre: p.titre_fr ?? "Pack",
      niveau: "pack",
      prixDzd: Number(p.prix_dzd) || 0,
      thumbnail: p.thumbnail ?? null,
      slug: p.slug ?? "",
      subscriptionEnabled: true,
      durationMonths: (p as { duration_months?: number | null }).duration_months ?? null,
      fullDiscount: (p as { full_payment_discount?: boolean }).full_payment_discount !== false,
      isPack: true,
      detailSlug: bundleSlugByPack.get(p.id) ?? null,
    });
  }

  let pay: PayInfo | null = null;
  try {
    const { data } = await admin
      .from("ccp_config").select("account_number, account_key, beneficiary_name, rip").eq("is_active", true).limit(1).maybeSingle();
    pay = data ?? null;
  } catch { /* pas de config */ }

  return (
    <div dir={isRtl(lang) ? "rtl" : "ltr"}>
      <SalesPage lang={lang} courses={options} pay={pay} preselectCourseId={preselectCourseId} modelismeGroups={modelismeGroups} />
    </div>
  );
}
