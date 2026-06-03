import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (prof?.role !== "admin") redirect("/dashboard");

  const links = [
    { href: "/admin", label: "Vue d'ensemble", icon: "📊" },
    { href: "/admin/utilisateurs", label: "Utilisateurs", icon: "👥" },
    { href: "/admin/etudiants", label: "Étudiants inscrits", icon: "🎓" },
    { href: "/admin/formations", label: "Formations", icon: "📚" },
    { href: "/admin/paiements", label: "Paiements", icon: "💳" },
    { href: "/admin/coupons", label: "Coupons", icon: "🎟" },
    { href: "/admin/emails", label: "Emails", icon: "📧" },
    { href: "/admin/activite", label: "Journal", icon: "📜" },
  ];

  return (
    <div className="min-h-screen bg-cream-DEFAULT">
      {/* Barre de navigation admin */}
      <div className="sticky top-0 z-30 bg-[#1a1428] text-white">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-1 overflow-x-auto">
          <span className="font-playfair font-bold text-orange-DEFAULT mr-4 py-3 whitespace-nowrap">⚙️ Admin</span>
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className="px-3 py-3 text-sm text-gray-300 hover:text-white whitespace-nowrap transition-colors font-dm">
              {l.icon} {l.label}
            </Link>
          ))}
          <div className="flex-1" />
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="px-3 py-3 text-sm text-gray-400 hover:text-white whitespace-nowrap font-dm">🚪 Quitter</button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
