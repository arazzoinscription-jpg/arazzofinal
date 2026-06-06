// i18n du dashboard — FR / AR / EN (basé sur un cookie "lang" lu côté serveur).
export type Lang = "fr" | "ar" | "en";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "fr", label: "FR" },
  { code: "ar", label: "ع" },
  { code: "en", label: "EN" },
];
export const isRtl = (l: Lang) => l === "ar";
export const normLang = (v?: string | null): Lang =>
  v === "ar" || v === "en" || v === "fr" ? v : "fr";

type Dict = {
  greeting: string;
  navigation: string;
  pro: string;
  trainer: string;
  admin: string;
  // home
  level: string;
  streakDays: string;
  streakNow: string;
  lessons: string;
  xpTotal: string;
  courses: string;
  activity: string;
  activitySub: string;
  today: string;
  thisMonth: string;
  inProgress: string;
  resume: string;
  ofLessons: (a: number, b: number) => string;
  noCourse: string;
  explore: string;
  nextSession: string;
  noSession: string;
  rewards: string;
  weeklyGoal: (n: number) => string;
  soonHere: string;
  completed: string;
  logout: string;
  menu: string;
};

export const DICT: Record<Lang, Dict> = {
  fr: {
    greeting: "Bonjour",
    navigation: "Navigation",
    pro: "Espace pro",
    trainer: "Espace formateur",
    admin: "Administration",
    level: "Niveau",
    streakDays: "jours",
    streakNow: "Série en cours",
    lessons: "Leçons",
    xpTotal: "XP total",
    courses: "Cours",
    activity: "Activité d'apprentissage",
    activitySub: "Votre progression XP",
    today: "AUJOURD'HUI",
    thisMonth: "CE MOIS",
    inProgress: "EN COURS",
    resume: "Reprendre votre formation",
    ofLessons: (a, b) => `${a}/${b} leçons`,
    noCourse: "Vous n'avez pas encore de formation.",
    explore: "Explorer le catalogue",
    nextSession: "Prochaine session live",
    noSession: "Aucune programmée",
    rewards: "Mes récompenses & badges",
    weeklyGoal: (n) => `Objectif : ${n} leçons / semaine`,
    soonHere: "Vos prochaines formations apparaîtront ici.",
    completed: "terminé",
    logout: "Déconnexion",
    menu: "Menu",
  },
  ar: {
    greeting: "مرحباً",
    navigation: "التنقّل",
    pro: "فضاء المهنيين",
    trainer: "فضاء المدرّب",
    admin: "الإدارة",
    level: "المستوى",
    streakDays: "أيام",
    streakNow: "سلسلة متواصلة",
    lessons: "دروس",
    xpTotal: "مجموع XP",
    courses: "دورات",
    activity: "نشاط التعلّم",
    activitySub: "تقدّمك في XP",
    today: "اليوم",
    thisMonth: "هذا الشهر",
    inProgress: "قيد التقدّم",
    resume: "استأنفي تكوينك",
    ofLessons: (a, b) => `${a}/${b} دروس`,
    noCourse: "ليس لديك أي تكوين بعد.",
    explore: "استكشاف الكتالوج",
    nextSession: "الحصّة المباشرة القادمة",
    noSession: "لا توجد حصص مبرمجة",
    rewards: "مكافآتي و شاراتي",
    weeklyGoal: (n) => `الهدف: ${n} دروس / أسبوع`,
    soonHere: "ستظهر تكويناتك القادمة هنا.",
    completed: "مكتمل",
    logout: "تسجيل الخروج",
    menu: "القائمة",
  },
  en: {
    greeting: "Hello",
    navigation: "Navigation",
    pro: "Pro space",
    trainer: "Trainer space",
    admin: "Administration",
    level: "Level",
    streakDays: "days",
    streakNow: "Current streak",
    lessons: "Lessons",
    xpTotal: "Total XP",
    courses: "Courses",
    activity: "Learning activity",
    activitySub: "Your XP progress",
    today: "TODAY",
    thisMonth: "THIS MONTH",
    inProgress: "IN PROGRESS",
    resume: "Resume your course",
    ofLessons: (a, b) => `${a}/${b} lessons`,
    noCourse: "You don't have any course yet.",
    explore: "Browse the catalog",
    nextSession: "Next live session",
    noSession: "None scheduled",
    rewards: "My rewards & badges",
    weeklyGoal: (n) => `Goal: ${n} lessons / week`,
    soonHere: "Your next courses will appear here.",
    completed: "completed",
    logout: "Sign out",
    menu: "Menu",
  },
};
