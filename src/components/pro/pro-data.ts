import {
  LayoutDashboard, BookOpen, PlusCircle, FileQuestion, Scissors, FolderOpen, Package,
  Users, UsersRound, Newspaper, Megaphone, UserMinus, LifeBuoy,
  Video, TrendingUp, Wallet, BarChart3,
  GraduationCap, ShoppingBag, Receipt, CreditCard, BadgeCheck, Ticket,
  Settings, Mail, ScrollText,
  type LucideIcon,
} from "lucide-react";
import type { Lang } from "@/app/dashboard/dash-i18n";

export type { Lang };
type L = Record<Lang, string>;

export interface ProSubItem { href: string; label: L; icon: LucideIcon; }
export interface ProSection {
  key: string; label: L; icon: LucideIcon; home: string; items: ProSubItem[]; match?: string[];
}

/* ───────────────────────── Espace FORMATEUR ───────────────────────── */
export const FORMATEUR_SECTIONS: ProSection[] = [
  {
    key: "home", icon: LayoutDashboard, home: "/formateur", items: [],
    label: { fr: "Vue d'ensemble", ar: "نظرة عامة", en: "Overview" },
  },
  {
    key: "content", icon: BookOpen, home: "/formateur/cours",
    label: { fr: "Contenu", ar: "المحتوى", en: "Content" },
    items: [
      { href: "/formateur/cours", icon: BookOpen, label: { fr: "Cours", ar: "الدورات", en: "Courses" } },
      { href: "/formateur/cours/nouveau", icon: PlusCircle, label: { fr: "Nouveau cours", ar: "دورة جديدة", en: "New course" } },
      { href: "/formateur/quiz", icon: FileQuestion, label: { fr: "Quiz", ar: "اختبارات", en: "Quizzes" } },
      { href: "/formateur/pratiques", icon: Scissors, label: { fr: "Travaux pratiques", ar: "أعمال تطبيقية", en: "Practical work" } },
      { href: "/formateur/ressources", icon: FolderOpen, label: { fr: "Ressources", ar: "الموارد", en: "Resources" } },
      { href: "/formateur/packs", icon: Package, label: { fr: "Packs de cours", ar: "حزم الدورات", en: "Course packs" } },
    ],
  },
  {
    key: "community", icon: Users, home: "/formateur/groupes",
    label: { fr: "Communauté", ar: "المجتمع", en: "Community" },
    items: [
      { href: "/formateur/groupes", icon: UsersRound, label: { fr: "Mes groupes", ar: "مجموعاتي", en: "My groups" } },
      { href: "/formateur/actualites", icon: Newspaper, label: { fr: "Actualités", ar: "المستجدات", en: "Feed" } },
      { href: "/formateur/annonces", icon: Megaphone, label: { fr: "Annonces", ar: "الإعلانات", en: "Announcements" } },
      { href: "/formateur/etudiantes-inactives", icon: UserMinus, label: { fr: "Étudiantes inactives", ar: "طالبات غير نشطات", en: "Inactive students" } },
      { href: "/formateur/tickets", icon: LifeBuoy, label: { fr: "Tickets support", ar: "تذاكر الدعم", en: "Support tickets" } },
    ],
  },
  {
    key: "live", icon: Video, home: "/formateur/sessions", items: [],
    label: { fr: "Sessions live", ar: "حصص مباشرة", en: "Live sessions" },
  },
  {
    key: "revenue", icon: TrendingUp, home: "/formateur/stats",
    label: { fr: "Revenus", ar: "الإيرادات", en: "Revenue" },
    items: [
      { href: "/formateur/stats", icon: Wallet, label: { fr: "Revenus & stats", ar: "الإيرادات والإحصائيات", en: "Revenue & stats" } },
      { href: "/formateur/analytics", icon: BarChart3, label: { fr: "Statistiques avancées", ar: "إحصائيات متقدمة", en: "Advanced analytics" } },
    ],
  },
];

/* ───────────────────────── Espace ADMIN ───────────────────────── */
export const ADMIN_SECTIONS: ProSection[] = [
  {
    key: "home", icon: LayoutDashboard, home: "/admin", items: [],
    label: { fr: "Vue d'ensemble", ar: "نظرة عامة", en: "Overview" },
  },
  {
    key: "people", icon: Users, home: "/admin/utilisateurs",
    label: { fr: "Personnes", ar: "الأشخاص", en: "People" },
    items: [
      { href: "/admin/utilisateurs", icon: Users, label: { fr: "Utilisateurs", ar: "المستخدمون", en: "Users" } },
      { href: "/admin/etudiants", icon: GraduationCap, label: { fr: "Étudiants inscrits", ar: "الطلاب المسجّلون", en: "Enrolled students" } },
    ],
  },
  {
    key: "catalog", icon: BookOpen, home: "/admin/formations",
    label: { fr: "Catalogue", ar: "الكتالوج", en: "Catalog" },
    items: [
      { href: "/admin/formations", icon: BookOpen, label: { fr: "Formations", ar: "التكوينات", en: "Courses" } },
      { href: "/admin/produits", icon: ShoppingBag, label: { fr: "Produits", ar: "المنتجات", en: "Products" } },
    ],
  },
  {
    key: "sales", icon: Receipt, home: "/admin/commandes",
    label: { fr: "Ventes", ar: "المبيعات", en: "Sales" },
    items: [
      { href: "/admin/commandes", icon: Receipt, label: { fr: "Commandes", ar: "الطلبات", en: "Orders" } },
      { href: "/admin/paiements", icon: CreditCard, label: { fr: "Paiements", ar: "المدفوعات", en: "Payments" } },
      { href: "/admin/preuves", icon: BadgeCheck, label: { fr: "Preuves", ar: "الإثباتات", en: "Proofs" } },
      { href: "/admin/coupons", icon: Ticket, label: { fr: "Coupons", ar: "الكوبونات", en: "Coupons" } },
    ],
  },
  {
    key: "system", icon: Settings, home: "/admin/emails",
    label: { fr: "Système", ar: "النظام", en: "System" },
    items: [
      { href: "/admin/emails", icon: Mail, label: { fr: "Emails", ar: "الرسائل", en: "Emails" } },
      { href: "/admin/activite", icon: ScrollText, label: { fr: "Journal", ar: "السجلّ", en: "Activity log" } },
    ],
  },
];

export type ProVariant = "formateur" | "admin";
export const SECTION_SETS: Record<ProVariant, ProSection[]> = {
  formateur: FORMATEUR_SECTIONS,
  admin: ADMIN_SECTIONS,
};

/** Section active d'après l'URL (la plus spécifique). */
export function proActiveKey(sections: ProSection[], pathname: string): string {
  const home = sections.find((s) => s.key === "home");
  if (home && pathname === home.home) return "home";
  for (const s of sections) {
    if (s.key === "home") continue;
    if (pathname === s.home) return s.key;
    if (s.items.some((i) => pathname === i.href || pathname.startsWith(i.href + "/"))) return s.key;
    if (s.match?.some((m) => pathname.startsWith(m))) return s.key;
  }
  return "home";
}

/** Sous-onglet actif : on choisit le href le plus long qui matche (évite le double surlignage). */
export function proActiveItem(items: ProSubItem[], pathname: string): string | null {
  let best: string | null = null;
  for (const it of items) {
    if (pathname === it.href || pathname.startsWith(it.href + "/")) {
      if (!best || it.href.length > best.length) best = it.href;
    }
  }
  return best;
}

/* ───────────────────────── Textes UI (FR / AR / EN) ───────────────────────── */
export const PRO_UI: Record<Lang, {
  navigation: string;
  formateurSpace: string; adminSpace: string;
  roleFormateur: string; roleAdmin: string;
  studentSpace: string; logout: string;
}> = {
  fr: {
    navigation: "Navigation",
    formateurSpace: "Espace Formateur", adminSpace: "Espace Admin",
    roleFormateur: "Formatrice", roleAdmin: "Administratrice",
    studentSpace: "Mon espace élève", logout: "Déconnexion",
  },
  ar: {
    navigation: "التنقّل",
    formateurSpace: "فضاء المدرّب", adminSpace: "فضاء الإدارة",
    roleFormateur: "مدرّبة", roleAdmin: "مديرة",
    studentSpace: "فضاء الطالبة", logout: "تسجيل الخروج",
  },
  en: {
    navigation: "Navigation",
    formateurSpace: "Trainer space", adminSpace: "Admin space",
    roleFormateur: "Trainer", roleAdmin: "Administrator",
    studentSpace: "Student space", logout: "Sign out",
  },
};
