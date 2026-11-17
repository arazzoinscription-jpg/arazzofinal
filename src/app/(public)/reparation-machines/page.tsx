import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { canonicalSiteUrl } from "@/lib/site-url";
import ReparationLanding, { type CentreOffre } from "./reparation-landing";
import { FAQ } from "./contenu";

// Landing « تصليح ماشينات الخياطة » — formation accélérée 3 jours, niveau 0,
// présentielle à Sétif et à El Eulma. Le contenu (texte arabe, photos, vidéo du
// formateur) est fixe ; le PRIX et les places viennent de l'instantané que l'OS
// pousse au clic « Synchroniser » (offres `reparation-machines` et
// `reparation-machines-eulma`). Tant qu'une offre n'est pas ouverte dans l'OS, la
// page reste en ligne, sans prix, et le formulaire dépose quand même le prospect
// (`presentiel_leads`) que l'OS rapatrie dans son CRM présentiel.

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const TITRE = "تكوين تصليح ماشينات الخياطة في سطيف والعلمة — دورة مكثّفة 3 أيام";
const DESCRIPTION =
  "تكوين حضوري مكثّف 3 أيام في تصليح وصيانة ماشينات الخياطة (المستوى 0): الماشينة الدروات (الغرزة المستقيمة)، السرجيتوز (Surjeteuse)، والكولوريت (Recouvreuse) اختيارية. تنظيف، تزييت، ضبط الغرزة والخيط، تبديل الإبرة، وتصليح الأعطال اليومية — في سطيف والعلمة مع Arazzo.";

export function generateMetadata(): Metadata {
  const base = canonicalSiteUrl();
  return {
    title: TITRE,
    description: DESCRIPTION,
    keywords: [
      "تصليح ماشينات الخياطة", "تصليح ماكينة الخياطة", "صيانة ماكينات الخياطة", "تكوين تصليح الماشينات",
      "دورة صيانة آلات الخياطة", "تصليح السرجيتوز", "تصليح الماشينة الدروات", "الكولوريت", "ريكوفريز",
      "تكوين مكثف سطيف", "تكوين العلمة", "Arazzo", "réparation machine à coudre Sétif",
      "formation réparation machine à coudre", "entretien surjeteuse", "recouvreuse", "El Eulma",
    ],
    alternates: { canonical: `${base}/reparation-machines` },
    openGraph: {
      title: TITRE,
      description: DESCRIPTION,
      url: `${base}/reparation-machines`,
      locale: "ar_DZ",
      type: "website",
      images: [{ url: `${base}/reparation-machines/og.jpg`, width: 1200, height: 2134, alt: "تكوين تصليح ماشينات الخياطة — Arazzo" }],
    },
  };
}

type Row = { slug: string; data: Record<string, unknown> };

export default async function Page() {
  noStore();
  let rows: Row[] = [];
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("presentiel_snapshots")
      .select("slug,data")
      .in("slug", ["reparation-machines", "reparation-machines-eulma"]);
    rows = (data ?? []) as Row[];
  } catch {
    rows = [];
  }
  const lire = (slug: string): CentreOffre | null => {
    const d = rows.find((r) => r.slug === slug)?.data as Record<string, any> | undefined;
    if (!d) return null;
    return {
      price_total: typeof d.price_total === "number" ? d.price_total : null,
      formulas: Array.isArray(d.formulas) ? d.formulas : [],
      schedule_label: d.schedule_label ?? null,
      address: d.center?.address ?? null,
      maps_url: d.center?.maps_url ?? null,
      seats: d.seats ?? null,
    };
  };
  const base = canonicalSiteUrl();
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Course",
      name: TITRE,
      description: DESCRIPTION,
      inLanguage: "ar",
      provider: { "@type": "Organization", name: "Arazzo", url: base },
      hasCourseInstance: [
        { "@type": "CourseInstance", courseMode: "onsite", duration: "P3D", location: { "@type": "Place", name: "Arazzo Sétif", address: "Sétif, Algérie" } },
        { "@type": "CourseInstance", courseMode: "onsite", duration: "P3D", location: { "@type": "Place", name: "Arazzo El Eulma", address: "El Eulma, Algérie" } },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.r } })),
    },
  ];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ReparationLanding setif={lire("reparation-machines")} eulma={lire("reparation-machines-eulma")} />
    </>
  );
}
