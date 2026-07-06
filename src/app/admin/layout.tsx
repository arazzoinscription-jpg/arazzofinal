import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { LogOut, Search, Scissors } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Toaster } from "@/components/ui/toast";
import { ChatWidget } from "@/components/messaging/chat-widget";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LangSwitcher } from "@/app/dashboard/lang-switcher";
import { normLang, isRtl } from "@/app/dashboard/dash-i18n";
import { ProSidebar } from "@/components/pro/pro-sidebar";
import { SidebarToggle } from "@/components/layout/sidebar-toggle";
import { ProSubnav } from "@/components/pro/pro-subnav";
import { ProMobileNav } from "@/components/pro/pro-mobile-nav";
import { PageTransition } from "@/app/dashboard/page-transition";
import { PRO_UI } from "@/components/pro/pro-data";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { isAdmin } from "@/lib/roles";
import { SpaceSwitcher } from "@/components/pro/space-switcher";
import { PushOptIn } from "@/components/pwa/push-opt-in";
import { PwaBackButton } from "@/components/pwa/pwa-back-button";

// Identité « Atelier » : sidebar sombre #1e0a3c, fond #faf7ff, header épuré.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("nom, role, roles, avatar_url").eq("id", user.id).single();
  if (!isAdmin(profile)) redirect("/dashboard");

  const lang = normLang((await cookies()).get("lang")?.value);
  const ui = PRO_UI[lang];

  return (
    <div dir={isRtl(lang) ? "rtl" : "ltr"} className="relative min-h-screen bg-[#faf7ff] dark:bg-[#0d0a1c] flex">
      {/* ── Menu vertical (desktop) ── */}
      <aside className="app-sidebar hidden lg:flex w-64 flex-col fixed inset-y-0 start-0 z-30 bg-[#1e0a3c] shadow-xl">
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/" className="nav-center flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#6B21C8] flex items-center justify-center flex-shrink-0">
              <Scissors size={18} className="text-white" />
            </span>
            <div className="nav-label leading-none">
              <span className="font-bold text-lg text-[#b088f1]">Arazzo</span>{" "}
              <span className="font-bold text-lg text-[#E8650A]">{ui.adminSpace}</span>
            </div>
          </Link>
        </div>

        <div className="px-4 py-4 border-b border-white/10">
          <div className="nav-center flex items-center gap-3">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white/20 flex-shrink-0" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#6B21C8] ring-2 ring-white/20 flex items-center justify-center text-white font-bold flex-shrink-0">
                {profile?.nom?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="min-w-0 nav-label">
              <div className="text-white text-sm font-semibold truncate">{profile?.nom ?? "—"}</div>
              <div className="text-[#b088f1] text-xs">{ui.roleAdmin}</div>
            </div>
          </div>
        </div>

        <ProSidebar variant="admin" lang={lang} />

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
        <div className="sticky top-0 z-20 bg-[#faf7ff]/85 dark:bg-[#0d0a1c]/85 backdrop-blur-md pt-[env(safe-area-inset-top)]">
          <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3 sm:gap-4">
            <PwaBackButton />
            <ProMobileNav
              variant="admin"
              nom={profile?.nom ?? null}
              avatarUrl={profile?.avatar_url ?? null}
              roleLabel={ui.roleAdmin}
              lang={lang}
              brand={ui.adminSpace}
            />
            {/* Recherche (style atelier) */}
            <div className="hidden md:flex flex-1 max-w-md relative">
              <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Rechercher…"
                className="w-full bg-white border border-gray-100 rounded-xl ps-9 pe-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6B21C8]/30 shadow-sm"
              />
            </div>
            <div className="flex-1 md:hidden" />
            <SpaceSwitcher role={profile?.role ?? null} roles={profile?.roles ?? []} current="admin" lang={lang} />
            <NotificationBell userId={user.id} />
            <LangSwitcher current={lang} />
            <ThemeToggle />
          </div>
          <ProSubnav variant="admin" lang={lang} />
        </div>
        <div className="px-4 sm:px-6 lg:px-8 pt-4"><PushOptIn /></div>
        <PageTransition>{children}</PageTransition>
        <Toaster />
      </main>
      <ChatWidget />
    </div>
  );
}
