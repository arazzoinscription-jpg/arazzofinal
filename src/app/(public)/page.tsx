import { cookies } from "next/headers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/sections/hero";
import { ApproachSection } from "@/components/sections/approach";
import { CategoriesSection } from "@/components/sections/categories";
import { AtelierShowcaseSection } from "@/components/sections/atelier-showcase";
import { CoursesSection } from "@/components/sections/courses-section";
import { TestimonialsSection } from "@/components/sections/testimonials";
import { CtaSection } from "@/components/sections/cta";
import { createPublicClient } from "@/lib/supabase/public";
import { normLang, isRtl } from "@/lib/home-i18n";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const lang = normLang((await cookies()).get("lang")?.value);

  const supabase = createPublicClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("*, formateur:users(nom)")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(3);

  return (
    <div dir={isRtl(lang) ? "rtl" : "ltr"}>
      <Navbar lang={lang} />
      <main>
        <HeroSection lang={lang} />
        <ApproachSection lang={lang} />
        <CategoriesSection lang={lang} />
        <AtelierShowcaseSection lang={lang} />
        <CoursesSection courses={courses ?? []} lang={lang} />
        <TestimonialsSection lang={lang} />
        <CtaSection lang={lang} />
      </main>
      <Footer lang={lang} />
    </div>
  );
}
