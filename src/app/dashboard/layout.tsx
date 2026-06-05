import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SearchBar } from "@/components/search/search-bar";
import { Toaster } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DashboardSubnav } from "./dashboard-subnav";
import { DashboardNav } from "./dashboard-nav";
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

  const lang = normLang((await cookies()).get("lang")?.value);
  const t = DICT[lang];

  return (
    <div dir={isRtl(lang) ? "rtl" : "ltr"} className="min-h-screen bg-cream-DEFAULT dark:bg-[#0d0a1c] flex">
      {/* ── Sidebar ── */}
      <aside className="w-64 flex flex-col fixed inset-y-0 start-0 z-30 bg-gradient-to-b from-violet-800 to-violet-900 shadow-xl">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-orange-DEFAULT/90 flex items-center justify-center text-white text-lg">✂️</span>
            <div>
              <div className="font-playfair font-bold text-white text-lg leading-none">ARAZZO</div>
              <div className="font-playfair italic text-orange-300 text-xs">Formation</div>
            </div>
          </Link>
        </div>

        {/* Carte utilisateur */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white/20" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-white/15 ring-2 ring-white/20 flex items-center justify-center text-white font-bold">
                {profile?.nom?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-white text-sm font-semibold truncate">{profile?.nom ?? "Élève"}</div>
              <div className="text-white/50 text-xs">{ROLE_LABEL[role] ?? role}</div>
            </div>
          </div>
        </div>

        {/* Navigation groupée */}
        <DashboardNav role={role} lang={lang} />

        {/* Déconnexion */}
        <div className="p-3 border-t border-white/10">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors"
            >
              <span className="text-base">🚪</span> Déconnexion
            </button>
          </form>
        </div>
      </aside>

      {/* ── Contenu ── */}
      <main className="flex-1 ms-64 min-w-0">
        {/* Barre supérieure + menu horizontal (sticky ensemble) */}
        <div className="sticky top-0 z-20 bg-white/85 dark:bg-[#0d0a1c]/85 backdrop-blur-md border-b border-cream-200 dark:border-white/10">
          <div className="px-6 lg:px-8 py-3 flex items-center gap-4">
            <div className="hidden sm:block">
              <p className="text-xs text-gray-400 dark:text-white/40 font-dm leading-none">{t.greeting} 👋</p>
              <p className="text-sm font-semibold text-violet-800 dark:text-orange-300 font-dm capitalize">{prenom}</p>
            </div>
            <div className="flex-1 max-w-md">
              <SearchBar compact />
            </div>
            <LangSwitcher current={lang} />
            <ThemeToggle />
            <NotificationBell userId={user.id} />
          </div>
          <DashboardSubnav lang={lang} />
        </div>
        <div className="p-6 lg:p-8">{children}</div>
        <Toaster />
      </main>
    </div>
  );
}
