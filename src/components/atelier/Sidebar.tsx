"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Calendar, BarChart3, Users,
  Settings, HelpCircle, LogOut, Menu, X, Scissors,
} from "lucide-react";

interface Item { href: string; label: string; icon: React.ElementType; badge?: number; }

const MENU: Item[] = [
  { href: "/atelier", label: "Dashboard", icon: LayoutDashboard },
  { href: "/atelier/commandes", label: "Commandes", icon: ShoppingBag, badge: 38 },
  { href: "/atelier/calendrier", label: "Calendrier", icon: Calendar },
  { href: "/atelier/analytiques", label: "Analytiques", icon: BarChart3 },
  { href: "/atelier/equipe", label: "Équipe", icon: Users },
];

const GENERAL: Item[] = [
  { href: "/atelier/parametres", label: "Paramètres", icon: Settings },
  { href: "/atelier/aide", label: "Aide", icon: HelpCircle },
  { href: "/login", label: "Déconnexion", icon: LogOut },
];

function NavLink({ item, active, onClick }: { item: Item; active: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active ? "bg-[#6B21C8] text-white shadow-sm" : "text-white/60 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon size={18} />
      <span className="flex-1">{item.label}</span>
      {item.badge != null && (
        <span className="text-[11px] font-bold bg-[#E8650A] text-white px-2 py-0.5 rounded-full">{item.badge}</span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/atelier" ? pathname === "/atelier" : pathname.startsWith(href));

  const content = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-[#6B21C8] flex items-center justify-center">
          <Scissors size={18} className="text-white" />
        </span>
        <div className="leading-none">
          <span className="font-bold text-lg text-[#b088f1]">Arazzo</span>{" "}
          <span className="font-bold text-lg text-[#E8650A]">Formation</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        <div>
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">Menu</p>
          <div className="space-y-1">
            {MENU.map((i) => <NavLink key={i.href} item={i} active={isActive(i.href)} onClick={() => setOpen(false)} />)}
          </div>
        </div>
        <div>
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">Général</p>
          <div className="space-y-1">
            {GENERAL.map((i) => <NavLink key={i.href} item={i} active={isActive(i.href)} onClick={() => setOpen(false)} />)}
          </div>
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {/* Bouton hamburger (mobile) */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        className="lg:hidden fixed top-4 left-4 z-40 w-10 h-10 rounded-xl bg-[#1e0a3c] text-white flex items-center justify-center shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Sidebar fixe (desktop) */}
      <aside className="hidden lg:flex flex-col w-60 fixed inset-y-0 left-0 z-30 bg-[#1e0a3c]">
        {content}
      </aside>

      {/* Drawer (mobile) */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-[#1e0a3c] shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer le menu"
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center"
            >
              <X size={18} />
            </button>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
