import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SearchBar } from "@/components/search/search-bar";

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

  const navLinks = [
    { href: "/dashboard", icon: "📚", label: "Mes cours" },
    { href: "/dashboard/actualites", icon: "📰", label: "Actualités" },
    { href: "/dashboard/groupes", icon: "👥", label: "Mes groupes" },
    { href: "/dashboard/progression", icon: "📈", label: "Ma progression" },
    { href: "/dashboard/recompenses", icon: "🏅", label: "Récompenses" },
    { href: "/dashboard/sessions", icon: "🎥", label: "Sessions live" },
    { href: "/dashboard/ressources", icon: "📂", label: "Ressources" },
    { href: "/dashboard/annonces", icon: "📢", label: "Annonces" },
    { href: "/dashboard/patrons", icon: "📄", label: "Mes patrons" },
    { href: "/dashboard/certificats", icon: "🎓", label: "Certificats" },
    { href: "/dashboard/support", icon: "🎫", label: "Support" },
    { href: "/dashboard/profil", icon: "👤", label: "Mon profil" },
    { href: "/dashboard/securite", icon: "🔐", label: "Sécurité" },
    { href: "/dashboard/preferences", icon: "🔔", label: "Préférences email" },
  ];

  return (
    <div className="min-h-screen bg-cream-DEFAULT flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a1a2e] flex flex-col fixed inset-y-0 left-0 z-30">
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-orange-DEFAULT text-xl">✂️</span>
            <div>
              <div className="font-playfair font-bold text-white text-lg">ARAZZO</div>
              <div className="font-playfair italic text-orange-DEFAULT text-xs -mt-0.5">
                Formation
              </div>
            </div>
          </Link>
        </div>

        {/* User */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-DEFAULT flex items-center justify-center text-white font-bold">
              {profile?.nom?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <div className="text-white text-sm font-semibold">
                {profile?.nom ?? "Élève"}
              </div>
              <div className="text-gray-400 text-xs capitalize">
                {profile?.role ?? "eleve"}
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-300 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
            >
              <span>{l.icon}</span>
              {l.label}
            </Link>
          ))}

          {profile?.role === "formateur" || profile?.role === "admin" ? (
            <Link
              href="/formateur"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-orange-DEFAULT hover:bg-white/10 transition-colors text-sm font-semibold mt-4"
            >
              <span>🎓</span>
              Espace formateur
            </Link>
          ) : null}

          {profile?.role === "admin" ? (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-orange-DEFAULT hover:bg-white/10 transition-colors text-sm font-semibold"
            >
              <span>⚙️</span>
              Administration
            </Link>
          ) : null}
        </nav>

        <div className="p-4 border-t border-white/10">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full text-left text-gray-400 hover:text-white text-sm px-4 py-2 transition-colors"
            >
              🚪 Déconnexion
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-64">
        {/* Barre supérieure : recherche + cloche de notifications */}
        <div className="sticky top-0 z-20 bg-cream-DEFAULT/80 backdrop-blur-sm border-b border-cream-200 px-8 py-3 flex items-center gap-3">
          <div className="flex-1 max-w-md">
            <SearchBar compact />
          </div>
          <NotificationBell userId={user.id} />
        </div>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
