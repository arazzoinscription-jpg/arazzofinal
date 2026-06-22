import { cookies } from "next/headers";
import { Toaster } from "@/components/ui/toast";
import { Navbar } from "@/components/layout/navbar";
import { MobileQuickNav } from "@/components/layout/mobile-quick-nav";
import { FlickeringBackground } from "@/components/ui/flickering-bg";
import { normLang, isRtl } from "@/lib/store-i18n";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const lang = normLang((await cookies()).get("lang")?.value);

  return (
    <div dir={isRtl(lang) ? "rtl" : "ltr"} className="relative min-h-screen bg-cream-DEFAULT dark:bg-[#0d0a1c] transition-colors">
      <FlickeringBackground />
      {/* Même menu que le reste du site (Formations, Patrons, Offre…) + panier */}
      <Navbar lang={lang} solid />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-28 sm:pb-12">{children}</main>
      {/* Barre de navigation mobile du bas (même barre que le reste du site) */}
      <MobileQuickNav />
      <Toaster />
    </div>
  );
}
