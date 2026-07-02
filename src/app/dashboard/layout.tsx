import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Scissors } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppBubble } from "@/lib/whatsapp-server";
import { WhatsAppBubble } from "@/components/layout/whatsapp-bubble";
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
import { normLang, isRtl } from "./dash-i18n";

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
  // Acheteur de patrons : navigation réduite (uniquement si encore simple élève).
  const accountType = (user.user_metadata?.account_type as string) ?? "formations";
  const buyer = accountType === "patrons" && role === "eleve";
  const roleLabel = buyer ? "Acheteur de patrons" : (ROLE_LABEL[role] ?? role);

  const lang = normLang((await cookies()).get("lang")?.value);

  // Bulle WhatsApp (espace étudiant) : formateur assigné sinon administrateur.
  const bubble = role === "eleve"
    ? await getWhatsAppBubble(createAdminClient(), {
        userId: user.id, nom: profile?.nom ?? null, email: user.email ?? null, space: "student",
      })
    : null;

  return (
    <div dir={isRtl(lang) ? "rtl" : "ltr"} className="relative min-h-screen bg-cream-DEFAULT dark:bg-[#0d0a1c] flex">
      <AnimatedBackground />
      {/* ── Sidebar desktop (≥ lg) ── */}
      <aside className="app-sidebar hidden lg:flex w-64 flex-col fixed inset-y-0 start-0 z-30 bg-gradient-to-b from-violet-800 to-violet-900 shadow-xl">
        <SidebarInner nom={profile?.nom ?? null} avatarUrl={profile?.avatar_url ?? null} role={role} roleLabel={roleLabel} lang={lang} buyer={buyer} />
      </aside>

      {/* ── Contenu ── */}
      <main className="app-main flex-1 lg:ms-64 min-w-0">
        {/* Barre supérieure (même identité que la barre publique) + menu horizontal */}
        <div
          className="sticky top-0 z-20 bg-white dark:bg-[#15102b] backdrop-blur-md border-b border-cream-200 dark:border-white/10"
          style={{ boxShadow: "0 4px 24px rgba(107,33,200,0.12)" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3 h-20">
              {/* ── Gauche : menu mobile + logo identité (identique à la barre publique) ── */}
              <div className="flex items-center gap-3 min-w-0">
                <MobileNav nom={profile?.nom ?? null} avatarUrl={profile?.avatar_url ?? null} role={role} roleLabel={roleLabel} lang={lang} buyer={buyer} />
                <Link href="/" aria-label="Accueil Arazzo" className="group flex items-center gap-3 shrink-0">
                  <span className="relative grid place-items-center">
                    <img src="/images/arazzo-icon.png" alt="Arazzo Formation" width={44} height={44} className="h-11 w-11 rounded-xl shadow-sm" />
                    <span className="absolute -bottom-1 -end-1 w-5 h-5 rounded-md bg-white dark:bg-[#15102b] ring-1 ring-violet-950/10 grid place-items-center">
                      <Scissors size={11} className="text-orange-600 -rotate-12" />
                    </span>
                  </span>
                  <span className="leading-none whitespace-nowrap hidden sm:block">
                    <span className="block font-mono text-[9px] tracking-[0.32em] uppercase text-orange-600/80">N° 01 · Atelier</span>
                    <span className="block font-playfair font-bold text-xl mt-0.5">
                      <span className="text-orange-500">Arazzo</span>{" "}
                      <span className="text-violet-800 dark:text-white">Formation</span>
                    </span>
                  </span>
                </Link>
              </div>

              {/* ── Centre : recherche (desktop) ── */}
              <div className="hidden md:block flex-1 max-w-md mx-4">
                <SearchBar compact />
              </div>

              {/* ── Droite : outils de l'espace ── */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <TopbarIcon><LangSwitcher current={lang} /></TopbarIcon>
                <TopbarIcon><ThemeToggle /></TopbarIcon>
                <TopbarIcon><NotificationBell userId={user.id} /></TopbarIcon>
              </div>
            </div>
          </div>
          <DashboardSubnav lang={lang} />
        </div>
        <div className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8"><PageTransition>{children}</PageTransition></div>
        <Toaster />
      </main>

      {/* Menu flottant unique (mêmes 5 entrées que le reste du site) + visite guidée 1er accès */}
      <MobileQuickNav />
      {role === "eleve" && <OnboardingTour lang={lang} />}
      {bubble && <WhatsAppBubble href={bubble.href} />}
    </div>
  );
}
