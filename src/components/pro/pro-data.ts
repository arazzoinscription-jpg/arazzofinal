import {
  LayoutDashboard, BookOpen, PlusCircle, FileQuestion, Scissors, FolderOpen, Package,
  Users, UsersRound, Newspaper, Megaphone, UserMinus, LifeBuoy, UserCog, UserPlus, UserSearch,
  Video, TrendingUp, Wallet, BarChart3,
  GraduationCap, ShoppingBag, Receipt, CreditCard, BadgeCheck, Ticket,
  Settings, Mail, ScrollText, MessageCircle,
  Shapes, Ruler, Clapperboard, FileText,
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
      { href: "/formateur/diplomes", icon: GraduationCap, label: { fr: "Diplômes", ar: "الشهادات", en: "Diplomas" } },
      { href: "/formateur/ressources", icon: FolderOpen, label: { fr: "Ressources", ar: "الموارد", en: "Resources" } },
      { href: "/formateur/packs", icon: Package, label: { fr: "Packs de cours", ar: "حزم الدورات", en: "Course packs" } },
    ],
  },
  {
    key: "community", icon: Users, home: "/formateur/groupes",
    label: { fr: "Communauté", ar: "المجتمع", en: "Community" },
    items: [
      { href: "/formateur/etudiants", icon: GraduationCap, label: { fr: "Étudiants inscrits", ar: "الطلاب المسجّلون", en: "Enrolled students" } },
      { href: "/formateur/communaute", icon: Clapperboard, label: { fr: "Feed vidéo", ar: "فيديوهات المجتمع", en: "Video feed" } },
      { href: "/formateur/groupes", icon: UsersRound, label: { fr: "Mes groupes", ar: "مجموعاتي", en: "My groups" } },
      { href: "/formateur/actualites", icon: Newspaper, label: { fr: "Actualités", ar: "المستجدات", en: "Feed" } },
      { href: "/formateur/annonces", icon: Megaphone, label: { fr: "Annonces", ar: "الإعلانات", en: "Announcements" } },
      { href: "/formateur/questions", icon: MessageCircle, label: { fr: "Questions des élèves", ar: "أسئلة الطلاب", en: "Student questions" } },
      { href: "/formateur/etudiantes-inactives", icon: UserMinus, label: { fr: "Étudiantes inactives", ar: "طالبات غير نشطات", en: "Inactive students" } },
      { href: "/formateur/tickets", icon: LifeBuoy, label: { fr: "Tickets support", ar: "تذاكر الدعم", en: "Support tickets" } },
    ],
  },
  {
    key: "shop", icon: ShoppingBag, home: "/formateur/boutique", items: [],
    label: { fr: "Mise en vente", ar: "العرض للبيع", en: "Sell" },
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
      { href: "/formateur/gains", icon: Wallet, label: { fr: "Mes gains (commission)", ar: "أرباحي (العمولة)", en: "My earnings (commission)" } },
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
    key: "stats", icon: BarChart3, home: "/admin/statistiques", items: [],
    label: { fr: "Statistiques", ar: "الإحصائيات", en: "Statistics" },
  },
  {
    key: "people", icon: Users, home: "/admin/utilisateurs",
    label: { fr: "Personnes", ar: "الأشخاص", en: "People" },
    items: [
      { href: "/admin/utilisateurs", icon: Users, label: { fr: "Utilisateurs", ar: "المستخدمون", en: "Users" } },
      { href: "/admin/formateurs", icon: GraduationCap, label: { fr: "Formateurs", ar: "المدرّبون", en: "Trainers" } },
      { href: "/admin/patronnistes", icon: Scissors, label: { fr: "Patronnistes", ar: "صانعو الباترون", en: "Pattern makers" } },
      { href: "/admin/acheteurs-patrons", icon: ShoppingBag, label: { fr: "Acheteurs de patrons", ar: "مشترو الباترونات", en: "Pattern buyers" } },
      { href: "/admin/demandes", icon: BadgeCheck, label: { fr: "Demandes de rôle", ar: "طلبات الأدوار", en: "Role requests" } },
      { href: "/admin/demandes-enrolement", icon: UserPlus, label: { fr: "Demandes d'enrôlement", ar: "طلبات الالتحاق", en: "Enrollment requests" } },
      { href: "/admin/prospects", icon: UserSearch, label: { fr: "Prospects (sans commande)", ar: "العملاء المحتملون", en: "Prospects (no order)" } },
    ],
  },
  {
    key: "students", icon: GraduationCap, home: "/admin/etudiants", items: [],
    label: { fr: "Étudiants", ar: "الطلاب", en: "Students" },
  },
  {
    key: "gestion", icon: UserCog, home: "/admin/gestion", items: [],
    label: { fr: "Gestion Formateurs & Étudiants", ar: "إدارة المدرّبين والطلاب", en: "Trainers & Students Management" },
  },
  {
    key: "catalog", icon: BookOpen, home: "/admin/formations",
    label: { fr: "Catalogue", ar: "الكتالوج", en: "Catalog" },
    items: [
      { href: "/admin/formations", icon: BookOpen, label: { fr: "Formations", ar: "التكوينات", en: "Courses" } },
      { href: "/admin/packs", icon: Package, label: { fr: "Packs de formation", ar: "حزم التكوين", en: "Course packs" } },
      { href: "/admin/patrons", icon: Scissors, label: { fr: "Patrons", ar: "الباترونات", en: "Patterns" } },
      { href: "/admin/sur-mesure", icon: Ruler, label: { fr: "Sur mesure", ar: "حسب المقاس", en: "Made-to-measure" } },
      { href: "/admin/produits", icon: ShoppingBag, label: { fr: "Produits", ar: "المنتجات", en: "Products" } },
    ],
  },
  {
    key: "sales", icon: Receipt, home: "/admin/commandes",
    label: { fr: "Ventes", ar: "المبيعات", en: "Sales" },
    items: [
      { href: "/admin/commandes", icon: Receipt, label: { fr: "Commandes", ar: "الطلبات", en: "Orders" } },
      { href: "/admin/livraison", icon: Package, label: { fr: "Livraison (التوصيل)", ar: "الدفع عند الاستلام", en: "Delivery (COD)" } },
      { href: "/admin/paiements", icon: CreditCard, label: { fr: "Paiements", ar: "المدفوعات", en: "Payments" } },
      { href: "/admin/preuves", icon: BadgeCheck, label: { fr: "Preuves", ar: "الإثباتات", en: "Proofs" } },
      { href: "/admin/coupons", icon: Ticket, label: { fr: "Coupons", ar: "الكوبونات", en: "Coupons" } },
    ],
  },
  {
    key: "community", icon: Clapperboard, home: "/admin/communaute", items: [],
    label: { fr: "Communauté", ar: "المجتمع", en: "Community" },
  },
  {
    key: "system", icon: Settings, home: "/admin/emails",
    label: { fr: "Système", ar: "النظام", en: "System" },
    items: [
      { href: "/admin/emails", icon: Mail, label: { fr: "Emails", ar: "الرسائل", en: "Emails" } },
      { href: "/admin/whatsapp", icon: MessageCircle, label: { fr: "WhatsApp", ar: "واتساب", en: "WhatsApp" } },
      { href: "/admin/activite", icon: ScrollText, label: { fr: "Journal", ar: "السجلّ", en: "Activity log" } },
    ],
  },
];

/* ───────────────────────── Espace PATRONNISTE ───────────────────────── */
export const PATRONNISTE_SECTIONS: ProSection[] = [
  {
    key: "home", icon: LayoutDashboard, home: "/patronniste", items: [],
    label: { fr: "Vue d'ensemble", ar: "نظرة عامة", en: "Overview" },
  },
  {
    key: "patrons", icon: Shapes, home: "/patronniste/patrons",
    label: { fr: "Mes patrons", ar: "باتروناتي", en: "My patterns" },
    items: [
      { href: "/patronniste/patrons", icon: FolderOpen, label: { fr: "Tous les patrons", ar: "كل الباترونات", en: "All patterns" } },
      { href: "/patronniste/patrons/nouveau", icon: PlusCircle, label: { fr: "Nouveau patron", ar: "باترون جديد", en: "New pattern" } },
    ],
  },
  {
    key: "community", icon: Clapperboard, home: "/patronniste/communaute", items: [],
    label: { fr: "Communauté", ar: "المجتمع", en: "Community" },
  },
  {
    key: "shop", icon: ShoppingBag, home: "/patronniste/boutique", items: [],
    label: { fr: "Mise en vente", ar: "العرض للبيع", en: "Sell" },
  },
  {
    key: "commandes", icon: Receipt, home: "/patronniste/commandes",
    label: { fr: "Commandes", ar: "الطلبات", en: "Orders" },
    items: [
      { href: "/patronniste/commandes", icon: ShoppingBag, label: { fr: "Achats clients", ar: "مشتريات العملاء", en: "Client purchases" } },
      { href: "/patronniste/sur-mesure", icon: Ruler, label: { fr: "Sur mesure", ar: "حسب المقاس", en: "Made-to-measure" } },
      { href: "/patronniste/gains", icon: Wallet, label: { fr: "Mes gains", ar: "أرباحي", en: "My earnings" } },
    ],
  },
];

export type ProVariant = "formateur" | "admin" | "patronniste";
export const SECTION_SETS: Record<ProVariant, ProSection[]> = {
  formateur: FORMATEUR_SECTIONS,
  admin: ADMIN_SECTIONS,
  patronniste: PATRONNISTE_SECTIONS,
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
  formateurSpace: string; adminSpace: string; patronnisteSpace: string;
  roleFormateur: string; roleAdmin: string; rolePatronniste: string;
  studentSpace: string; logout: string; changeSpace: string;
}> = {
  fr: {
    navigation: "Navigation",
    formateurSpace: "Espace Formateur", adminSpace: "Espace Admin", patronnisteSpace: "Espace Patronniste",
    roleFormateur: "Formatrice", roleAdmin: "Administratrice", rolePatronniste: "Patronniste",
    studentSpace: "Mon espace élève", logout: "Déconnexion", changeSpace: "Changer d'espace",
  },
  ar: {
    navigation: "التنقّل",
    formateurSpace: "فضاء المدرّب", adminSpace: "فضاء الإدارة", patronnisteSpace: "فضاء الباترونيست",
    roleFormateur: "مدرّبة", roleAdmin: "مديرة", rolePatronniste: "باترونيست",
    studentSpace: "فضاء الطالبة", logout: "تسجيل الخروج", changeSpace: "تغيير الفضاء",
  },
  en: {
    navigation: "Navigation",
    formateurSpace: "Trainer space", adminSpace: "Admin space", patronnisteSpace: "Pattern-maker space",
    roleFormateur: "Trainer", roleAdmin: "Administrator", rolePatronniste: "Pattern maker",
    studentSpace: "Student space", logout: "Sign out", changeSpace: "Switch space",
  },
};
