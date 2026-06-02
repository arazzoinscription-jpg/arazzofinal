import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/sections/hero";
import { ApproachSection } from "@/components/sections/approach";
import { CoursesSection } from "@/components/sections/courses-section";
import { TestimonialsSection } from "@/components/sections/testimonials";
import { BecomeTrainerSection } from "@/components/sections/become-trainer";
import { CtaSection } from "@/components/sections/cta";
import { createPublicClient } from "@/lib/supabase/public";

// ISR : page régénérée au plus toutes les 10 minutes (landing ultra-rapide)
export const revalidate = 600;

export default async function HomePage() {
  const supabase = createPublicClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("*, formateur:users(nom)")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(3);

  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <ApproachSection />
        <CoursesSection courses={courses ?? []} />
        <TestimonialsSection />
        <BecomeTrainerSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
