import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SearchBar } from "@/components/search/search-bar";
import { Toaster } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DashboardSubnav } from "./dashboard-subnav";
import { SidebarInner } from "./sidebar-inner";
import { MobileNav } from "./mobile-nav";
import { LangSwitcher } from "./lang-switcher";
import { DICT, normLang, isRtl } from "./dash-i18n";

const ROLE_LABEL: Record<string, string> = { eleve: "Élève", formateur: "Formatrice", admin: "Administratrice" };

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

  const { data: profile } = await supabase
    .from("users")
    .select("nom, role, avatar_url")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "eleve";
  const prenom = (profile?.nom ?? "").split(" ")[0] || "vous";
  const roleLabel = ROLE_LABEL[role] ?? role;

  const lang = normLang((await cookies()).get("lang")?.value);
  const t = DICT[lang];

  return (
    <div dir={isRtl(lang) ? "rtl" : "ltr"} className="min-h-screen bg-cream-DEFAULT dark:bg-[#0d0a1c] flex">
      {/* ── Sidebar desktop (≥ lg) ── */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 start-0 z-30 bg-gradient-to-b from-violet-800 to-violet-900 shadow-xl">
        <SidebarInner nom={profile?.nom ?? null} avatarUrl={profile?.avatar_url ?? null} role={role} roleLabel={roleLabel} lang={lang} />
      </aside>

      {/* ── Contenu ── */}
      <main className="flex-1 lg:ms-64 min-w-0">
        {/* Barre supérieure + menu horizontal (sticky ensemble) */}
        <div className="sticky top-0 z-20 bg-white/85 dark:bg-[#0d0a1c]/85 backdrop-blur-md border-b border-cream-200 dark:border-white/10">
          <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3 sm:gap-4">
            {/* Hamburger (mobile) */}
            <MobileNav nom={profile?.nom ?? null} avatarUrl={profile?.avatar_url ?? null} role={role} roleLabel={roleLabel} lang={lang} />

            <div className="hidden md:block">
              <p className="text-xs text-gray-400 dark:text-white/40 font-dm leading-none">{t.greeting} 👋</p>
              <p className="text-sm font-semibold text-violet-800 dark:text-orange-300 font-dm capitalize">{prenom}</p>
            </div>
            <div className="flex-1 min-w-0 max-w-md">
              <SearchBar compact />
            </div>
            <LangSwitcher current={lang} />
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <NotificationBell userId={user.id} />
          </div>
          <DashboardSubnav lang={lang} />
        </div>
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        <Toaster />
      </main>
    </div>
  );
}
