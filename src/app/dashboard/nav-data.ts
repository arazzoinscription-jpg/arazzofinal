import {
  LayoutDashboard, GraduationCap, ShoppingBag, Users, UserCog,
  TrendingUp, Trophy, Video, FolderOpen, Award,
  Package, Receipt, FileText, Store,
  Newspaper, UsersRound, Megaphone, LifeBuoy,
  User, Lock, Bell,
  type LucideIcon,
} from "lucide-react";

export interface SubItem { href: string; label: string; icon: LucideIcon; }
export interface NavSection {
  key: string;
  label: string;
  icon: LucideIcon;
  home: string;            // destination quand on clique la section dans la sidebar
  items: SubItem[];        // onglets horizontaux
  match?: string[];        // préfixes supplémentaires qui activent la section
}

export const SECTIONS: NavSection[] = [
  {
    key: "home", label: "Tableau de bord", icon: LayoutDashboard, home: "/dashboard", items: [],
  },
  {
    key: "learn", label: "Apprentissage", icon: GraduationCap, home: "/dashboard/progression",
    match: ["/dashboard/cours", "/dashboard/quiz"],
    items: [
      { href: "/dashboard/progression", label: "Progression", icon: TrendingUp },
      { href: "/dashboard/recompenses", label: "Récompenses", icon: Trophy },
      { href: "/dashboard/sessions", label: "Sessions live", icon: Video },
      { href: "/dashboard/ressources", label: "Ressources", icon: FolderOpen },
      { href: "/dashboard/certificats", label: "Certificats", icon: Award },
    ],
  },
  {
    key: "shop", label: "Boutique", icon: ShoppingBag, home: "/boutique",
    items: [
      { href: "/boutique", label: "Catalogue", icon: Store },
      { href: "/dashboard/commandes", label: "Mes commandes", icon: Package },
      { href: "/dashboard/factures", label: "Mes factures", icon: Receipt },
      { href: "/dashboard/patrons", label: "Mes patrons", icon: FileText },
    ],
  },
  {
    key: "community", label: "Communauté", icon: Users, home: "/dashboard/actualites",
    items: [
      { href: "/dashboard/actualites", label: "Actualités", icon: Newspaper },
      { href: "/dashboard/groupes", label: "Mes groupes", icon: UsersRound },
      { href: "/dashboard/annonces", label: "Annonces", icon: Megaphone },
      { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
    ],
  },
  {
    key: "account", label: "Mon compte", icon: UserCog, home: "/dashboard/profil",
    items: [
      { href: "/dashboard/profil", label: "Profil", icon: User },
      { href: "/dashboard/securite", label: "Sécurité", icon: Lock },
      { href: "/dashboard/preferences", label: "Préférences", icon: Bell },
    ],
  },
];

/** Détermine la section active d'après l'URL. */
export function activeSectionKey(pathname: string): string {
  if (pathname === "/dashboard") return "home";
  for (const s of SECTIONS) {
    if (s.key === "home") continue;
    if (pathname === s.home) return s.key;
    if (s.items.some((i) => pathname === i.href || pathname.startsWith(i.href + "/"))) return s.key;
    if (s.match?.some((m) => pathname.startsWith(m))) return s.key;
  }
  return "home";
}
