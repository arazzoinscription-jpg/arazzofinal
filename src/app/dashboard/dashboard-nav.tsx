"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem { href: string; icon: string; label: string; }
interface NavGroup { title: string; items: NavItem[]; }

const GROUPS: NavGroup[] = [
  {
    title: "Apprentissage",
    items: [
      { href: "/dashboard", icon: "📚", label: "Mes cours" },
      { href: "/dashboard/progression", icon: "📈", label: "Ma progression" },
      { href: "/dashboard/recompenses", icon: "🏅", label: "Récompenses" },
      { href: "/dashboard/sessions", icon: "🎥", label: "Sessions live" },
      { href: "/dashboard/ressources", icon: "📂", label: "Ressources" },
      { href: "/dashboard/certificats", icon: "🎓", label: "Certificats" },
    ],
  },
  {
    title: "Boutique",
    items: [
      { href: "/boutique", icon: "🛍️", label: "Boutique" },
      { href: "/dashboard/commandes", icon: "📦", label: "Mes commandes" },
      { href: "/dashboard/factures", icon: "🧾", label: "Mes factures" },
      { href: "/dashboard/patrons", icon: "📄", label: "Mes patrons" },
    ],
  },
  {
    title: "Communauté",
    items: [
      { href: "/dashboard/actualites", icon: "📰", label: "Actualités" },
      { href: "/dashboard/groupes", icon: "👥", label: "Mes groupes" },
      { href: "/dashboard/annonces", icon: "📢", label: "Annonces" },
      { href: "/dashboard/support", icon: "🎫", label: "Support" },
    ],
  },
  {
    title: "Mon compte",
    items: [
      { href: "/dashboard/profil", icon: "👤", label: "Mon profil" },
      { href: "/dashboard/securite", icon: "🔐", label: "Sécurité" },
      { href: "/dashboard/preferences", icon: "🔔", label: "Préférences email" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export function DashboardNav({ role }: { role: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">{group.title}</p>
          <div className="space-y-0.5">
            {group.items.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? "bg-white text-violet-800 shadow-sm"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="text-base">{l.icon}</span>
                  <span className="truncate">{l.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {(role === "formateur" || role === "admin") && (
        <div>
          <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Espace pro</p>
          <div className="space-y-0.5">
            <Link href="/formateur"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-orange-200 hover:bg-white/10 hover:text-orange-100 transition-colors">
              <span className="text-base">🎓</span> Espace formateur
            </Link>
            {role === "admin" && (
              <Link href="/admin"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-orange-200 hover:bg-white/10 hover:text-orange-100 transition-colors">
                <span className="text-base">⚙️</span> Administration
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
