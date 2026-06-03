import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    .select("nom, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "formateur" && profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const navLinks = [
    { href: "/formateur", icon: "📊", label: "Vue d'ensemble" },
    { href: "/formateur/analytics", icon: "📈", label: "Statistiques avancées" },
    { href: "/formateur/cours/nouveau", icon: "➕", label: "Nouveau cours" },
    { href: "/formateur/stats", icon: "💰", label: "Revenus & stats" },
    { href: "/formateur/sessions", icon: "🎥", label: "Sessions live" },
    { href: "/formateur/quiz", icon: "📝", label: "Quiz" },
    { href: "/formateur/pratiques", icon: "🪡", label: "Travaux pratiques" },
    { href: "/formateur/ressources", icon: "📂", label: "Ressources" },
    { href: "/formateur/annonces", icon: "📢", label: "Annonces" },
    { href: "/formateur/tickets", icon: "🎫", label: "Tickets support" },
    { href: "/formateur/etudiantes-inactives", icon: "😴", label: "Étudiantes inactives" },
  ];

  return (
    <div className="min-h-screen bg-cream-DEFAULT flex">
      <aside className="w-64 bg-[#1a1a2e] flex flex-col fixed inset-y-0 left-0 z-30">
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-orange-DEFAULT text-xl">✂️</span>
            <div>
              <div className="font-playfair font-bold text-white text-lg">ARAZZO</div>
              <div className="font-playfair italic text-orange-DEFAULT text-xs -mt-0.5">
                Espace Formateur
              </div>
            </div>
          </Link>
        </div>

        <div className="p-4 border-b border-white/10">
          <p className="text-white font-semibold text-sm">{profile?.nom}</p>
          <p className="text-orange-DEFAULT text-xs">Formateur</p>
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
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:text-white transition-colors text-sm mt-4"
          >
            <span>👤</span>
            Mon espace élève
          </Link>
        </nav>
      </aside>
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
