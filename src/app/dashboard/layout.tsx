import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SearchBar } from "@/components/search/search-bar";
import { Toaster } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AnimatedBackground } from "@/components/ui/animated-bg";
import { DashboardSubnav } from "./dashboard-subnav";
import { SidebarInner } from "./sidebar-inner";
import { MobileNav } from "./mobile-nav";
import { MobileQuickNav } from "@/components/layout/mobile-quick-nav";
import { OnboardingTour } from "./onboarding-tour";
import { TopbarIcon } from "./topbar-icon";
import { PageTransition } from "./page-transition";
import { LangSwitcher } from "./lang-switcher";
import { DICT, normLang, isRtl } from "./dash-i18n";

const ROLE_LABEL: Record<string, string> = { eleve: "Élève", formateur: "Formatrice", patronniste: "Patronniste", admin: "Administratrice" };

/** Écran affiché lorsqu'un compte est bloqué ou mis en veille. */
function SuspendedScreen({ status }: { status: "bloque" | "veille" }) {
  const blocked = status === "bloque";
  return (
    <div className="min-h-screen bg-cream-DEFAULT flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-cream-200 p-8 text-center">
        <div className="text-5xl mb-4">{blocked ? "🚫" : "⏸️"}</div>
        <h1 className="font-playfair text-2xl font-bold text-gray-900 mb-2">
          {blocked ? "Compte bloqué" : "Compte en veille"}
        </h1>
        <p className="text-gray-500 font-dm mb-6">
          {blocked
            ? "Votre accès a été suspendu par l'équipe Arazzo. Contactez le support pour plus d'informations."
            : "Votre compte est temporairement en veille. Contactez l'équipe Arazzo pour le réactiver."}
        </p>
        <form action="/api/auth/signout" method="POST">
          <button type="submit" className="w-full bg-orange-DEFAULT text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Compte bloqué / en veille : accès suspendu (le ban Auth empêche aussi la reconnexion).
  const acctStatus = (user.app_metadata?.status as string) ?? "actif";
  if (acctStatus === "bloque" || acctStatus === "veille") {
    return <SuspendedScreen status={acctStatus as "bloque" | "veille"} />;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("nom, role, avatar_url")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "eleve";
  const prenom = (profile?.nom ?? "").split(" ")[0] || "vous";
  // Acheteur de patrons : navigation réduite (uniquement si encore simple élève).
  const accountType = (user.user_metadata?.account_type as string) ?? "formations";
  const buyer = accountType === "patrons" && role === "eleve";
  const roleLabel = buyer ? "Acheteur de patrons" : (ROLE_LABEL[role] ?? role);

  const lang = normLang((await cookies()).get("lang")?.value);
  const t = DICT[lang];

  return (
    <div dir={isRtl(lang) ? "rtl" : "ltr"} className="relative min-h-screen bg-cream-DEFAULT dark:bg-[#0d0a1c] flex">
      <AnimatedBackground />
      {/* ── Sidebar desktop (≥ lg) ── */}
      <aside className="app-sidebar hidden lg:flex w-64 flex-col fixed inset-y-0 start-0 z-30 bg-gradient-to-b from-violet-800 to-violet-900 shadow-xl">
        <SidebarInner nom={profile?.nom ?? null} avatarUrl={profile?.avatar_url ?? null} role={role} roleLabel={roleLabel} lang={lang} buyer={buyer} />
      </aside>

      {/* ── Contenu ── */}
      <main className="app-main flex-1 lg:ms-64 min-w-0">
        {/* Barre supérieure + menu horizontal (sticky ensemble) */}
        <div className="sticky top-0 z-20 bg-white/85 dark:bg-[#0d0a1c]/85 backdrop-blur-md border-b border-cream-200 dark:border-white/10">
          <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3 sm:gap-4">
            {/* Hamburger (mobile) */}
            <MobileNav nom={profile?.nom ?? null} avatarUrl={profile?.avatar_url ?? null} role={role} roleLabel={roleLabel} lang={lang} buyer={buyer} />

            {/* Logo → accueil (mobile : la sidebar est masquée) */}
            <Link href="/" aria-label="Accueil Arazzo" className="lg:hidden flex items-center shrink-0">
              <img src="/images/arazzo-icon.png" alt="Arazzo Formation" className="h-9 w-9 rounded-lg shadow-sm" />
            </Link>

            <div className="hidden md:block">
              <p className="text-xs text-gray-400 dark:text-white/40 font-dm leading-none">{t.greeting} 👋</p>
              <p className="text-sm font-semibold text-violet-800 dark:text-orange-300 font-dm capitalize">{prenom}</p>
            </div>
            <div className="flex-1 min-w-0 max-w-md">
              <div className="hidden sm:block">
                <SearchBar compact />
              </div>
            </div>
            <TopbarIcon><LangSwitcher current={lang} /></TopbarIcon>
            <TopbarIcon><ThemeToggle /></TopbarIcon>
            <TopbarIcon><NotificationBell userId={user.id} /></TopbarIcon>
          </div>
          <DashboardSubnav lang={lang} />
        </div>
        <div className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8"><PageTransition>{children}</PageTransition></div>
        <Toaster />
      </main>

      {/* Menu flottant unique (mêmes 5 entrées que le reste du site) + visite guidée 1er accès */}
      <MobileQuickNav />
      {role === "eleve" && <OnboardingTour lang={lang} />}
    </div>
  );
}
