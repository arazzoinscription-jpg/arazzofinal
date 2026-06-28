// i18n vitrine publique — Formations (+ guide) & Boutique. FR / AR / EN (cookie "lang").
export type Lang = "fr" | "ar" | "en";
export const isRtl = (l: Lang) => l === "ar";
export const normLang = (v?: string | null): Lang =>
  v === "ar" || v === "en" || v === "fr" ? v : "fr";

export interface StoreDict {
  formations: {
    crumbRoot: string;
    allTitle: string;
    nbFormations: (n: number) => string;
    nbCategories: (n: number) => string;
    back: string;
    noCategory: string;
    nbSub: (n: number) => string;
    nbCourses: (n: number) => string;
    emptyLeaf: string;
    seeAll: string;
  };
  guide: {
    enrollEyebrow: string;
    enrollTitle: string; enrollTitleHi: string; enrollSub: string;
    steps: { title: string; desc: string }[];
    useEyebrow: string; useTitle1: string; useTitle2: string; useText: string; useCta: string;
    features: { title: string; desc: string }[];
    ctaTitle: string; ctaTitleHi: string; ctaSub: string; ctaPrimary: string; ctaSecondary: string;
  };
  shop: {
    heroEyebrow: string; heroTitle1: string; heroTitleHi: string; heroTitle2: string; heroSub: string; heroCta: string;
    filters: { all: string; course: string; digital_file: string; patron_pdf: string; bundle: string };
    nbProducts: (n: number) => string;
    empty: string; seeAll: string;
    add: string; adding: string; inCart: string; soldOut: string; reserve: string;
    types: { course: string; digital_file: string; patron_pdf: string; bundle: string };
    // fiche produit
    backToShop: string;
    inStock: (n: number) => string; available: string;
    addToCart: string; viewCart: string;
    reassure: { t1: string; s1: string; t2: string; s2: string; t3: string; s3: string };
    related: string;
    // header boutique
    navShop: string; navFormations: string; navSpace: string; navLogin: string;
  };
}

const FR: StoreDict = {
  formations: {
    crumbRoot: "Formations",
    allTitle: "Nos formations",
    nbFormations: (n) => `${n} formation${n > 1 ? "s" : ""}`,
    nbCategories: (n) => `${n} catégorie${n > 1 ? "s" : ""}`,
    back: "Retour",
    noCategory: "Aucune catégorie.",
    nbSub: (n) => `${n} sous-catégorie${n > 1 ? "s" : ""}`,
    nbCourses: (n) => `${n} formation${n > 1 ? "s" : ""}`,
    emptyLeaf: "Aucune formation dans cette catégorie pour l'instant.",
    seeAll: "Voir toutes les catégories",
  },
  guide: {
    enrollEyebrow: "S'inscrire",
    enrollTitle: "Quatre points,", enrollTitleHi: "une couture",
    enrollSub: "De la sélection à votre première leçon, le parcours est aussi simple qu'un point droit.",
    steps: [
      { title: "Choisissez", desc: "Parcourez les catégories et trouvez la formation faite pour votre niveau." },
      { title: "Réglez", desc: "Payez en toute sécurité par CCP, BaridiMob ou virement." },
      { title: "Envoyez la preuve", desc: "Joignez le reçu depuis « Mes commandes ». Validation sous 24 h." },
      { title: "Apprenez", desc: "Accès débloqué : vos cours s'ouvrent dans votre espace élève." },
    ],
    useEyebrow: "Votre atelier en ligne",
    useTitle1: "Tout se passe", useTitle2: "dans votre espace",
    useText: "Une fois inscrite, votre tableau de bord réunit vos cours, vos exercices corrigés et vos échanges avec la formatrice. Vous avancez à votre rythme, du fil à l'aiguille jusqu'à la pièce finie.",
    useCta: "Accéder à mon espace",
    features: [
      { title: "Cours vidéo HD", desc: "Des leçons filmées en atelier, à suivre à votre rythme, où que vous soyez." },
      { title: "Travaux pratiques", desc: "Envoyez photo & vidéo de vos réalisations et recevez la correction de la formatrice." },
      { title: "Questions / réponses", desc: "Posez vos questions sous chaque leçon — la formatrice vous répond." },
      { title: "Suivi & progression", desc: "Visualisez votre avancement, de la première coupe à la pièce finie." },
    ],
    ctaTitle: "Prête à tailler votre", ctaTitleHi: "première pièce", ctaSub: "Rejoignez les couturières qui apprennent un métier, point après point, depuis chez elles.",
    ctaPrimary: "Créer mon compte", ctaSecondary: "Voir la boutique",
  },
  shop: {
    heroEyebrow: "Boutique Arazzo",
    heroTitle1: "Tout pour coudre, créer", heroTitleHi: "progresser", heroTitle2: "&",
    heroSub: "Formations en ligne, patrons PDF prêts à imprimer et fichiers numériques — sélectionnés par nos formatrices.",
    heroCta: "Découvrir les formations",
    filters: { all: "Tout", course: "Formations", digital_file: "Fichiers", patron_pdf: "Patrons PDF", bundle: "Packs" },
    nbProducts: (n) => `${n} produit${n > 1 ? "s" : ""}`,
    empty: "Aucun produit dans cette catégorie pour le moment.",
    seeAll: "Voir tous les produits",
    add: "Ajouter au panier", adding: "Ajout…", inCart: "Voir le panier", soldOut: "Épuisé", reserve: "Réserver ta place",
    types: { course: "Formation", digital_file: "Fichier numérique", patron_pdf: "Patron PDF", bundle: "Pack" },
    backToShop: "Retour à la boutique",
    inStock: (n) => `En stock (${n} disponible${n > 1 ? "s" : ""})`, available: "Disponible immédiatement",
    addToCart: "Ajouter au panier", viewCart: "Voir le panier",
    reassure: { t1: "Paiement sûr", s1: "CCP · BaridiMob", t2: "Accès rapide", s2: "après validation", t3: "Qualité Arazzo", s3: "formateurs experts" },
    related: "Vous aimerez aussi",
    navShop: "Boutique", navFormations: "Formations", navSpace: "Mon espace", navLogin: "Connexion",
  },
};

const AR: StoreDict = {
  formations: {
    crumbRoot: "الدورات",
    allTitle: "دوراتنا التكوينية",
    nbFormations: (n) => `${n} دورة`,
    nbCategories: (n) => `${n} فئة`,
    back: "رجوع",
    noCategory: "لا توجد فئات.",
    nbSub: (n) => `${n} فئة فرعية`,
    nbCourses: (n) => `${n} دورة`,
    emptyLeaf: "لا توجد دورات في هذه الفئة حاليًا.",
    seeAll: "عرض كل الفئات",
  },
  guide: {
    enrollEyebrow: "التسجيل",
    enrollTitle: "أربع غُرَز،", enrollTitleHi: "خياطة واحدة",
    enrollSub: "من اختيار الدورة إلى درسك الأول، المسار بسيط كغرزة مستقيمة.",
    steps: [
      { title: "اختاري", desc: "تصفّحي الفئات واعثري على الدورة المناسبة لمستواك." },
      { title: "ادفعي", desc: "ادفعي بأمان عبر CCP أو بريدي موب أو التحويل البنكي." },
      { title: "أرسلي الإثبات", desc: "أرفقي الوصل من «طلباتي». تتمّ المصادقة خلال 24 ساعة." },
      { title: "تعلّمي", desc: "يُفتح الوصول: تظهر دوراتك في فضائك الخاص." },
    ],
    useEyebrow: "ورشتك على الإنترنت",
    useTitle1: "كل شيء يجري", useTitle2: "في فضائك الخاص",
    useText: "بمجرّد تسجيلك، تجمع لوحة التحكّم دوراتك وتمارينك المُصحَّحة وتبادلاتك مع المدرّبة. تتقدّمين على إيقاعك، من الخيط والإبرة حتى القطعة المكتملة.",
    useCta: "الدخول إلى فضائي",
    features: [
      { title: "دروس فيديو عالية الجودة", desc: "دروس مصوّرة في الورشة، تتابعينها على إيقاعك أينما كنتِ." },
      { title: "أعمال تطبيقية", desc: "أرسلي صورة وفيديو لإنجازاتك واحصلي على تصحيح المدرّبة." },
      { title: "أسئلة وأجوبة", desc: "اطرحي أسئلتك أسفل كل درس — وتجيبك المدرّبة." },
      { title: "المتابعة والتقدّم", desc: "تابعي تقدّمك، من أول قصّة إلى القطعة المكتملة." },
    ],
    ctaTitle: "مستعدّة لقصّ", ctaTitleHi: "قطعتك الأولى", ctaSub: "انضمّي إلى الخيّاطات اللواتي يتعلّمن حرفة، غرزة بعد غرزة، من بيوتهنّ.",
    ctaPrimary: "إنشاء حسابي", ctaSecondary: "زيارة المتجر",
  },
  shop: {
    heroEyebrow: "متجر أرازو",
    heroTitle1: "كل ما يلزم للخياطة والإبداع", heroTitleHi: "والتطوّر", heroTitle2: "",
    heroSub: "دورات عبر الإنترنت، باترونات PDF جاهزة للطباعة وملفات رقمية — من اختيار مدرّباتنا.",
    heroCta: "اكتشفي الدورات",
    filters: { all: "الكل", course: "الدورات", digital_file: "الملفات", patron_pdf: "باترونات PDF", bundle: "الحزم" },
    nbProducts: (n) => `${n} منتج`,
    empty: "لا توجد منتجات في هذه الفئة حاليًا.",
    seeAll: "عرض كل المنتجات",
    add: "أضف إلى السلة", adding: "جارٍ الإضافة…", inCart: "عرض السلة", soldOut: "نفد", reserve: "احجزي مكانك",
    types: { course: "دورة", digital_file: "ملف رقمي", patron_pdf: "باترون PDF", bundle: "حزمة" },
    backToShop: "العودة إلى المتجر",
    inStock: (n) => `متوفّر (${n})`, available: "متوفّر فورًا",
    addToCart: "أضف إلى السلة", viewCart: "عرض السلة",
    reassure: { t1: "دفع آمن", s1: "CCP · بريدي موب", t2: "وصول سريع", s2: "بعد المصادقة", t3: "جودة أرازو", s3: "مدرّبون خبراء" },
    related: "قد يعجبك أيضًا",
    navShop: "المتجر", navFormations: "الدورات", navSpace: "فضائي", navLogin: "تسجيل الدخول",
  },
};

const EN: StoreDict = {
  formations: {
    crumbRoot: "Courses",
    allTitle: "Our courses",
    nbFormations: (n) => `${n} course${n > 1 ? "s" : ""}`,
    nbCategories: (n) => `${n} categor${n > 1 ? "ies" : "y"}`,
    back: "Back",
    noCategory: "No categories.",
    nbSub: (n) => `${n} subcategor${n > 1 ? "ies" : "y"}`,
    nbCourses: (n) => `${n} course${n > 1 ? "s" : ""}`,
    emptyLeaf: "No courses in this category yet.",
    seeAll: "See all categories",
  },
  guide: {
    enrollEyebrow: "Enroll",
    enrollTitle: "Four stitches,", enrollTitleHi: "one seam",
    enrollSub: "From picking a course to your first lesson, the path is as simple as a straight stitch.",
    steps: [
      { title: "Choose", desc: "Browse the categories and find the course that fits your level." },
      { title: "Pay", desc: "Pay securely via CCP, BaridiMob or bank transfer." },
      { title: "Send proof", desc: "Attach the receipt from “My orders”. Validated within 24h." },
      { title: "Learn", desc: "Access unlocked: your courses open in your student space." },
    ],
    useEyebrow: "Your online atelier",
    useTitle1: "Everything happens", useTitle2: "in your space",
    useText: "Once enrolled, your dashboard brings together your courses, your graded exercises and your exchanges with the instructor. You progress at your own pace, from thread and needle to the finished piece.",
    useCta: "Go to my space",
    features: [
      { title: "HD video lessons", desc: "Lessons filmed in the atelier, to follow at your own pace, wherever you are." },
      { title: "Practical work", desc: "Send photos & video of your work and get the instructor's feedback." },
      { title: "Q & A", desc: "Ask your questions under each lesson — the instructor replies." },
      { title: "Tracking & progress", desc: "See how far you've come, from first cut to finished piece." },
    ],
    ctaTitle: "Ready to cut your", ctaTitleHi: "first piece", ctaSub: "Join the sewers learning a craft, stitch after stitch, from home.",
    ctaPrimary: "Create my account", ctaSecondary: "Visit the shop",
  },
  shop: {
    heroEyebrow: "Arazzo Shop",
    heroTitle1: "Everything to sew, create", heroTitleHi: "grow", heroTitle2: "&",
    heroSub: "Online courses, print-ready PDF patterns and digital files — handpicked by our instructors.",
    heroCta: "Discover the courses",
    filters: { all: "All", course: "Courses", digital_file: "Files", patron_pdf: "PDF Patterns", bundle: "Bundles" },
    nbProducts: (n) => `${n} product${n > 1 ? "s" : ""}`,
    empty: "No products in this category yet.",
    seeAll: "See all products",
    add: "Add to cart", adding: "Adding…", inCart: "View cart", soldOut: "Sold out", reserve: "Reserve your spot",
    types: { course: "Course", digital_file: "Digital file", patron_pdf: "PDF Pattern", bundle: "Bundle" },
    backToShop: "Back to shop",
    inStock: (n) => `In stock (${n} available)`, available: "Available now",
    addToCart: "Add to cart", viewCart: "View cart",
    reassure: { t1: "Secure payment", s1: "CCP · BaridiMob", t2: "Fast access", s2: "after validation", t3: "Arazzo quality", s3: "expert instructors" },
    related: "You may also like",
    navShop: "Shop", navFormations: "Courses", navSpace: "My space", navLogin: "Sign in",
  },
};

export const STORE: Record<Lang, StoreDict> = { fr: FR, ar: AR, en: EN };
