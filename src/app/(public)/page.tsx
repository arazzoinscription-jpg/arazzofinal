import { cookies } from "next/headers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/sections/hero";
import { ApproachSection } from "@/components/sections/approach";
import { CategoriesSection } from "@/components/sections/categories";
import { CoursesSection } from "@/components/sections/courses-section";
import { TestimonialsSection } from "@/components/sections/testimonials";
import { CommunityCtaSection } from "@/components/sections/community-cta";
import { CtaSection } from "@/components/sections/cta";
import { FlickeringGrid } from "@/components/ui/flickering-grid-hero";
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
      <Navbar lang={lang} solid />
      <main>
        <HeroSection lang={lang} />

        {/* Sections sous le héro : fond commun à grille scintillante (FlickeringGrid) */}
        <div className="relative bg-cream-DEFAULT dark:bg-[#0b0818]">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <FlickeringGrid squareSize={3} gridGap={16} flickerChance={0.12} maxOpacity={0.16} color="#5B16F9" className="h-full w-full" />
          </div>
          <ApproachSection lang={lang} />
          <CategoriesSection lang={lang} />
          <CoursesSection courses={courses ?? []} lang={lang} />
          <TestimonialsSection lang={lang} />
          <CommunityCtaSection lang={lang} />
          <CtaSection lang={lang} />
        </div>
      </main>
      <Footer lang={lang} />
    </div>
  );
}
