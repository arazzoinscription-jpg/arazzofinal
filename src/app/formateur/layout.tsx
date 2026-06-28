import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Toaster } from "@/components/ui/toast";
import { LangSwitcher } from "@/app/dashboard/lang-switcher";
import { normLang, isRtl } from "@/app/dashboard/dash-i18n";
import { ProSidebar } from "@/components/pro/pro-sidebar";
import { SidebarToggle } from "@/components/layout/sidebar-toggle";
import { ProSubnav } from "@/components/pro/pro-subnav";
import { ProMobileNav } from "@/components/pro/pro-mobile-nav";
import { PageTransition } from "@/app/dashboard/page-transition";
import { PRO_UI } from "@/components/pro/pro-data";
import { AnimatedBackground } from "@/components/ui/animated-bg";

export default async function FormateurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("nom, role, avatar_url")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "formateur" && profile?.role !== "admin") {
    redirect("/dashboard");
  }

  // Compte suspendu (bloqué / en veille) : l'écran d'accès suspendu vit dans /dashboard.
  const acctStatus = (user.app_metadata?.status as string) ?? "actif";
  if ((acctStatus === "bloque" || acctStatus === "veille") && profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const lang = normLang((await cookies()).get("lang")?.value);
  const ui = PRO_UI[lang];

  return (
    <div dir={isRtl(lang) ? "rtl" : "ltr"} className="relative min-h-screen bg-cream-DEFAULT dark:bg-[#0d0a1c] flex">
      <AnimatedBackground />
      {/* ── Menu vertical (desktop) ── */}
      <aside className="app-sidebar hidden lg:flex w-64 flex-col fixed inset-y-0 start-0 z-30 bg-gradient-to-b from-violet-800 to-violet-900 shadow-xl">
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/" className="nav-center flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-orange-DEFAULT/90 flex items-center justify-center text-white text-lg flex-shrink-0">✂️</span>
            <div className="nav-label">
              <div className="font-playfair font-bold text-white text-lg leading-none">ARAZZO</div>
              <div className="font-playfair italic text-orange-300 text-xs">{ui.formateurSpace}</div>
            </div>
          </Link>
        </div>

        <div className="px-4 py-4 border-b border-white/10">
          <div className="nav-center flex items-center gap-3">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white/20 flex-shrink-0" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-white/15 ring-2 ring-white/20 flex items-center justify-center text-white font-bold flex-shrink-0">
                {profile?.nom?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="min-w-0 nav-label">
              <div className="text-white text-sm font-semibold truncate">{profile?.nom ?? "—"}</div>
              <div className="text-orange-300 text-xs">{profile?.role === "admin" ? ui.roleAdmin : ui.roleFormateur}</div>
            </div>
          </div>
        </div>

        <ProSidebar variant="formateur" lang={lang} />

        <div className="p-3 border-t border-white/10">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="nav-center w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors"
            >
              <LogOut size={18} className="flex-shrink-0" /> <span className="nav-label">{ui.logout}</span>
            </button>
          </form>
        </div>

        <SidebarToggle />
      </aside>

      {/* ── Contenu ── */}
      <main className="app-main flex-1 lg:ms-64 min-w-0">
        <div className="sticky top-0 z-20 bg-white/85 dark:bg-[#0d0a1c]/85 backdrop-blur-md border-b border-cream-200 dark:border-white/10">
          <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3 sm:gap-4">
            <ProMobileNav
              variant="formateur"
              nom={profile?.nom ?? null}
              avatarUrl={profile?.avatar_url ?? null}
              roleLabel={profile?.role === "admin" ? ui.roleAdmin : ui.roleFormateur}
              lang={lang}
              brand={ui.formateurSpace}
            />
            <Link href="/" aria-label="Accueil Arazzo" className="lg:hidden flex items-center shrink-0">
              <img src="/images/arazzo-icon.png" alt="Arazzo Formation" className="h-9 w-9 rounded-lg shadow-sm" />
            </Link>
            <div className="flex-1" />
            <LangSwitcher current={lang} />
            <ThemeToggle />
          </div>
          <ProSubnav variant="formateur" lang={lang} />
        </div>
        <div className="p-4 sm:p-6 lg:p-8"><PageTransition>{children}</PageTransition></div>
      </main>
      <Toaster />
    </div>
  );
}
