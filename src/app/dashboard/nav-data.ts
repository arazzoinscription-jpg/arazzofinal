import {
  LayoutDashboard, GraduationCap, ShoppingBag, Users, UserCog,
  TrendingUp, Trophy, Video, FolderOpen, Award,
  Package, Receipt, FileText, Store, Ruler,
  Newspaper, UsersRound, Megaphone, LifeBuoy,
  User, Lock, Bell,
  type LucideIcon,
} from "lucide-react";
import type { Lang } from "./dash-i18n";

type L = Record<Lang, string>;
export interface SubItem { href: string; label: L; icon: LucideIcon; }
export interface NavSection {
  key: string; label: L; icon: LucideIcon; home: string; items: SubItem[]; match?: string[];
}

export const SECTIONS: NavSection[] = [
  {
    key: "home", icon: LayoutDashboard, home: "/dashboard", items: [],
    label: { fr: "Tableau de bord", ar: "لوحة التحكم", en: "Dashboard" },
  },
  {
    key: "learn", icon: GraduationCap, home: "/dashboard/progression",
    match: ["/dashboard/cours", "/dashboard/quiz"],
    label: { fr: "Apprentissage", ar: "التعلّم", en: "Learning" },
    items: [
      { href: "/dashboard/progression", icon: TrendingUp, label: { fr: "Progression", ar: "التقدّم", en: "Progress" } },
      { href: "/dashboard/recompenses", icon: Trophy, label: { fr: "Récompenses", ar: "المكافآت", en: "Rewards" } },
      { href: "/dashboard/sessions", icon: Video, label: { fr: "Sessions live", ar: "حصص مباشرة", en: "Live sessions" } },
      { href: "/dashboard/ressources", icon: FolderOpen, label: { fr: "Ressources", ar: "الموارد", en: "Resources" } },
      { href: "/dashboard/certificats", icon: Award, label: { fr: "Certificats", ar: "الشهادات", en: "Certificates" } },
    ],
  },
  {
    key: "shop", icon: ShoppingBag, home: "/boutique",
    label: { fr: "Boutique", ar: "المتجر", en: "Shop" },
    items: [
      { href: "/boutique", icon: Store, label: { fr: "Catalogue", ar: "الكتالوج", en: "Catalog" } },
      { href: "/dashboard/commandes", icon: Package, label: { fr: "Mes commandes", ar: "طلباتي", en: "My orders" } },
      { href: "/dashboard/factures", icon: Receipt, label: { fr: "Mes factures", ar: "فواتيري", en: "My invoices" } },
      { href: "/dashboard/patrons", icon: FileText, label: { fr: "Mes patrons", ar: "باتروناتي", en: "My patterns" } },
      { href: "/dashboard/sur-mesure", icon: Ruler, label: { fr: "Sur mesure", ar: "حسب المقاس", en: "Made-to-measure" } },
    ],
  },
  {
    key: "community", icon: Users, home: "/dashboard/actualites",
    label: { fr: "Communauté", ar: "المجتمع", en: "Community" },
    items: [
      { href: "/dashboard/actualites", icon: Newspaper, label: { fr: "Actualités", ar: "المستجدات", en: "Feed" } },
      { href: "/dashboard/groupes", icon: UsersRound, label: { fr: "Mes groupes", ar: "مجموعاتي", en: "My groups" } },
      { href: "/dashboard/annonces", icon: Megaphone, label: { fr: "Annonces", ar: "الإعلانات", en: "Announcements" } },
      { href: "/dashboard/support", icon: LifeBuoy, label: { fr: "Support", ar: "الدعم", en: "Support" } },
    ],
  },
  {
    key: "account", icon: UserCog, home: "/dashboard/profil",
    label: { fr: "Mon compte", ar: "حسابي", en: "Account" },
    items: [
      { href: "/dashboard/profil", icon: User, label: { fr: "Profil", ar: "الملف الشخصي", en: "Profile" } },
      { href: "/dashboard/securite", icon: Lock, label: { fr: "Sécurité", ar: "الأمان", en: "Security" } },
      { href: "/dashboard/preferences", icon: Bell, label: { fr: "Préférences", ar: "التفضيلات", en: "Preferences" } },
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
