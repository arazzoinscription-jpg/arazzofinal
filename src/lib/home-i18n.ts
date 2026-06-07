// i18n de la page d'accueil publique — FR / AR / EN (cookie "lang").
export type Lang = "fr" | "ar" | "en";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "fr", label: "FR" },
  { code: "ar", label: "ع" },
  { code: "en", label: "EN" },
];
export const isRtl = (l: Lang) => l === "ar";
export const normLang = (v?: string | null): Lang =>
  v === "ar" || v === "en" || v === "fr" ? v : "fr";

export interface HomeDict {
  nav: { formations: string; boutique: string; patrons: string; offre: string; apropos: string; space: string; login: string; register: string };
  hero: {
    badge: string; t1: string; hi: string; t2: string; subtitle: string;
    statActives: string; statCourses: string; statRating: string;
    ctaPrimary: string; ctaSecondary: string; trust: [string, string, string];
  };
  approach: { eyebrow: string; title: string; hi: string; items: { title: string; desc: string }[] };
  categories: {
    eyebrow: string; title: string; hi: string; names: string[];
    b1t: string; b1d: string; b2t: string; b2d: string;
  };
  atelier: {
    eyebrow: string; title: string; hi: string; p: string;
    features: { title: string; desc: string }[]; btn: string;
    cardNum: string; cardSub: string; gallery: { label: string; tag: string }[];
  };
  courses: { eyebrow: string; title: string; hi: string; subtitle: string; catalog: string; catalogMobile: string; see: string };
  testimonials: {
    eyebrow: string; title: string; hi: string; sub: string;
    founderQuote: string; founderName: string;
    items: { text: string; course: string }[];
  };
  trainer: { badge: string; title: string; p: string; items: string[]; btn: string; stat1: string; stat2: string; tagline: string };
  cta: { title: string; g1: string; g2: string; primary: string; secondary: string };
  footer: {
    tagline: string;
    colPlatform: string; colHelp: string; colLegal: string;
    platform: string[]; help: string[]; legal: string[];
    copyright: string;
  };
}

export const HOME: Record<Lang, HomeDict> = {
  fr: {
    nav: { formations: "Formations", boutique: "Boutique", patrons: "Patrons", offre: "Offre", apropos: "À propos", space: "Mon espace", login: "Connexion", register: "S'inscrire" },
    hero: {
      badge: "L'académie en ligne de couture du Maghreb",
      t1: "Le fil de", hi: "votre talent", t2: "du patron au métier.",
      subtitle: "Apprenez la couture, le modélisme et le patronage avec des formatrices d'Alger, Casablanca et Tunis. Patrons numériques inclus, certifié par Arazzo.",
      statActives: "Étudiantes actives", statCourses: "Cours publiés", statRating: "Note moyenne",
      ctaPrimary: "Découvrir les formations", ctaSecondary: "Explorer la boutique",
      trust: ["Paiement en DA", "Accès à vie", "Certificat PDF"],
    },
    approach: {
      eyebrow: "Notre approche", title: "Tout pour passer du", hi: "fil au design",
      items: [
        { title: "Formations vidéo", desc: "Du débutant à l'expert — pas-à-pas filmés en atelier, avec patrons à télécharger." },
        { title: "Patrons numériques", desc: "PDF A4 · A0 · DXF · projecteur. Marges de couture incluses, mesures FR + EU + DZ." },
        { title: "Espace formateur", desc: "Vendez vos cours et vos patrons. Commission claire, paiement en DZD ou en EUR." },
      ],
    },
    categories: {
      eyebrow: "Nos univers", title: "Explorez toutes les", hi: "spécialités couture",
      names: ["Couture & Modélisme", "Dessin & Stylisme", "Patronage industriel", "Accessoires", "Artisanat", "Logiciels de confection", "Marketing couture", "Parcours structurés"],
      b1t: "Ateliers indépendants", b1d: "Apprenez une technique précise, à votre rythme, sans engagement.",
      b2t: "Parcours structurés", b2d: "Progressez étape par étape, du débutant à la création de votre marque.",
    },
    atelier: {
      eyebrow: "L'ATELIER ARAZZO", title: "Apprenez en regardant,", hi: "progressez en cousant",
      p: "Des formatrices passionnées d'Alger, Casablanca et Tunis vous accompagnent, pas à pas, de votre première couture jusqu'à la création de votre propre marque.",
      features: [
        { title: "Cours filmés en atelier", desc: "Chaque geste expliqué, du fil à l'aiguille, en pas-à-pas." },
        { title: "Patrons numériques inclus", desc: "PDF A4 · A0 · projecteur, tailles FR · EU · DZ, marges incluses." },
        { title: "Certificat reconnu", desc: "Validez vos acquis et lancez votre activité couture." },
      ],
      btn: "Voir les formations", cardNum: "127 cours", cardSub: "filmés en atelier",
      gallery: [
        { label: "Couture machine", tag: "Niveau 1" },
        { label: "Modélisme & croquis", tag: "Niveau 2" },
        { label: "Création de mode", tag: "Niveau 3" },
      ],
    },
    courses: {
      eyebrow: "✂ Sélection de la semaine", title: "Les cours", hi: "à ne pas manquer",
      subtitle: "Vidéos HD · Patrons PDF · Certificat · Paiement en DA",
      catalog: "Tout le catalogue →", catalogMobile: "Voir tout le catalogue →", see: "Voir →",
    },
    testimonials: {
      eyebrow: "Témoignages", title: "Elles nous font", hi: "confiance",
      sub: "+12 000 élèves formées au Maghreb et dans la diaspora",
      founderQuote: "J'ai créé Arazzo Formation pour permettre à chaque femme du Maghreb d'accéder à une formation professionnelle de qualité, depuis chez elle, à son rythme. Le modélisme et la couture sont des arts qui méritent d'être transmis.",
      founderName: "✂ Fondatrice — Arazzo Formation",
      items: [
        { text: "Grâce à Arazzo Formation, j'ai appris le modélisme depuis chez moi. Les vidéos sont claires, les patrons PDF sont incroyables. J'ai lancé ma boutique !", course: "Niveau 1 — Bases & Quotidien" },
        { text: "Le moulage niveau 3 est exceptionnel. Chaque technique expliquée étape par étape. Le paiement en euros depuis la France était très simple.", course: "Niveau 3 — Soirée par Moulage" },
        { text: "La plateforme est belle et facile. Le lecteur vidéo marche même avec connexion lente. Mon certificat PDF est arrivé automatiquement dès que j'ai terminé.", course: "Niveau 2 — Classique & Soirée" },
      ],
    },
    trainer: {
      badge: "Pour les expertes", title: "Partagez votre expertise, générez vos revenus",
      p: "Rejoignez notre réseau de formateurs et monétisez votre savoir-faire. Créez vos cours, vendez vos patrons et percevez vos revenus directement en DZD ou en EUR.",
      items: ["Commissions attractives sur chaque vente", "Dashboard formateur complet avec statistiques", "Paiements DZD ou EUR", "Hébergement vidéo inclus", "Accompagnement à la création de contenu"],
      btn: "Devenir formateur →", stat1: "Formations publiées", stat2: "Élèves actifs", tagline: "Votre talent mérite d'être partagé",
    },
    cta: {
      title: "Prête à passer du fil au design ?",
      g1: "30 jours satisfaite ou remboursée", g2: "Première leçon offerte",
      primary: "Créer mon compte", secondary: "Contacter l'équipe",
    },
    footer: {
      tagline: "L'académie en ligne du Maghreb pour la couture, le modélisme et le patronage. Le fil de votre talent, du modèle au métier.",
      colPlatform: "Plateforme", colHelp: "Aide", colLegal: "Légal",
      platform: ["Formations", "Patrons", "Devenir formateur", "Tarifs"],
      help: ["Centre d'aide", "Contact", "À propos"],
      legal: ["CGU", "CGV", "Politique de confidentialité"],
      copyright: "© 2026 Arazzo Formation",
    },
  },

  ar: {
    nav: { formations: "الدورات", boutique: "المتجر", patrons: "الباترونات", offre: "العرض", apropos: "من نحن", space: "مساحتي", login: "دخول", register: "تسجيل" },
    hero: {
      badge: "أكاديمية الخياطة عبر الإنترنت في المغرب العربي",
      t1: "خيط", hi: "موهبتك", t2: "من الباترون إلى الحرفة.",
      subtitle: "تعلّمي الخياطة والموديليزم والباترون مع مدرّبات من الجزائر والدار البيضاء وتونس. باترونات رقمية مُضمّنة، بشهادة من أرازو.",
      statActives: "طالبات نشِطات", statCourses: "دورات منشورة", statRating: "متوسط التقييم",
      ctaPrimary: "اكتشفي الدورات", ctaSecondary: "تصفّحي المتجر",
      trust: ["الدفع بالدينار", "وصول مدى الحياة", "شهادة PDF"],
    },
    approach: {
      eyebrow: "منهجنا", title: "كل ما يلزم للانتقال من", hi: "الخيط إلى التصميم",
      items: [
        { title: "دورات فيديو", desc: "من المبتدئة إلى الخبيرة — خطوة بخطوة مصوّرة في الورشة، مع باترونات للتحميل." },
        { title: "باترونات رقمية", desc: "PDF A4 · A0 · DXF · بروجكتور. هوامش الخياطة مُضمّنة، مقاسات FR + EU + DZ." },
        { title: "فضاء المدرّبات", desc: "بيعي دوراتك وباتروناتك. عمولة واضحة، الدفع بالدينار أو اليورو." },
      ],
    },
    categories: {
      eyebrow: "عوالمنا", title: "اكتشفي كل", hi: "تخصّصات الخياطة",
      names: ["الخياطة والموديليزم", "الرسم والتصميم", "الباترون الصناعي", "الإكسسوارات", "الحرف اليدوية", "برامج التفصيل", "تسويق الخياطة", "مسارات منظّمة"],
      b1t: "ورشات مستقلة", b1d: "تعلّمي تقنية محدّدة، بإيقاعك، دون التزام.",
      b2t: "مسارات منظّمة", b2d: "تقدّمي خطوة بخطوة، من المبتدئة إلى إطلاق علامتك.",
    },
    atelier: {
      eyebrow: "ورشة أرازو", title: "تعلّمي بالمشاهدة،", hi: "تقدّمي بالخياطة",
      p: "مدرّبات شغوفات من الجزائر والدار البيضاء وتونس يرافقنك خطوة بخطوة، من أول قطعة خياطة حتى إطلاق علامتك الخاصة.",
      features: [
        { title: "دروس مصوّرة في الورشة", desc: "كل حركة مشروحة، من الخيط إلى الإبرة، خطوة بخطوة." },
        { title: "باترونات رقمية مُضمّنة", desc: "PDF A4 · A0 · بروجكتور، مقاسات FR · EU · DZ، هوامش مُضمّنة." },
        { title: "شهادة معتمدة", desc: "أكّدي مكتسباتك وأطلقي نشاطك في الخياطة." },
      ],
      btn: "مشاهدة الدورات", cardNum: "127 دورة", cardSub: "مصوّرة في الورشة",
      gallery: [
        { label: "الخياطة بالماكينة", tag: "المستوى 1" },
        { label: "الموديليزم والرسم", tag: "المستوى 2" },
        { label: "تصميم الأزياء", tag: "المستوى 3" },
      ],
    },
    courses: {
      eyebrow: "✂ اختيار الأسبوع", title: "دورات", hi: "لا تفوّتيها",
      subtitle: "فيديو عالي الدقة · باترونات PDF · شهادة · الدفع بالدينار",
      catalog: "كل الكتالوج →", catalogMobile: "عرض كل الكتالوج →", see: "عرض →",
    },
    testimonials: {
      eyebrow: "شهادات", title: "يثقن", hi: "بنا",
      sub: "أكثر من 12 000 متدرّبة في المغرب العربي والمهجر",
      founderQuote: "أنشأتُ أرازو فورماسيون لأتيح لكل امرأة في المغرب العربي الوصول إلى تكوين مهني عالي الجودة، من بيتها وبإيقاعها. الموديليزم والخياطة فنون تستحق أن تُنقل.",
      founderName: "✂ المؤسِّسة — أرازو فورماسيون",
      items: [
        { text: "بفضل أرازو فورماسيون تعلّمتُ الموديليزم من بيتي. الفيديوهات واضحة والباترونات رائعة. أطلقتُ متجري!", course: "المستوى 1 — الأساسيات واليومي" },
        { text: "موليّاج المستوى 3 استثنائي. كل تقنية مشروحة خطوة بخطوة. الدفع باليورو من فرنسا كان سهلاً جداً.", course: "المستوى 3 — سهرة بالموليّاج" },
        { text: "المنصّة جميلة وسهلة. مشغّل الفيديو يعمل حتى مع اتصال بطيء. وصلتني شهادتي PDF تلقائياً فور الانتهاء.", course: "المستوى 2 — كلاسيكي وسهرة" },
      ],
    },
    trainer: {
      badge: "للخبيرات", title: "شاركي خبرتك، حقّقي دخلك",
      p: "انضمّي إلى شبكة مدرّباتنا واستثمري معرفتك. أنشئي دوراتك، بيعي باتروناتك، واقبضي دخلك مباشرة بالدينار أو اليورو.",
      items: ["عمولات مغرية على كل عملية بيع", "لوحة تحكّم كاملة مع إحصائيات", "الدفع بالدينار أو اليورو", "استضافة الفيديو مُضمّنة", "مرافقة في إنشاء المحتوى"],
      btn: "كوني مدرّبة →", stat1: "دورات منشورة", stat2: "طالبات نشِطات", tagline: "موهبتك تستحق أن تُشارَك",
    },
    cta: {
      title: "هل أنتِ مستعدّة للانتقال من الخيط إلى التصميم؟",
      g1: "30 يوماً مرضية أو استرداد", g2: "الدرس الأول مجاناً",
      primary: "إنشاء حسابي", secondary: "تواصلي مع الفريق",
    },
    footer: {
      tagline: "أكاديمية المغرب العربي عبر الإنترنت للخياطة والموديليزم والباترون. خيط موهبتك، من النموذج إلى الحرفة.",
      colPlatform: "المنصّة", colHelp: "المساعدة", colLegal: "قانوني",
      platform: ["الدورات", "الباترونات", "كوني مدرّبة", "الأسعار"],
      help: ["مركز المساعدة", "اتصال", "من نحن"],
      legal: ["شروط الاستخدام", "شروط البيع", "سياسة الخصوصية"],
      copyright: "© 2026 أرازو فورماسيون",
    },
  },

  en: {
    nav: { formations: "Courses", boutique: "Shop", patrons: "Patterns", offre: "Offer", apropos: "About", space: "My space", login: "Log in", register: "Sign up" },
    hero: {
      badge: "The Maghreb's online sewing academy",
      t1: "The thread of", hi: "your talent", t2: "from pattern to profession.",
      subtitle: "Learn sewing, fashion design and pattern-making with trainers from Algiers, Casablanca and Tunis. Digital patterns included, certified by Arazzo.",
      statActives: "Active students", statCourses: "Published courses", statRating: "Average rating",
      ctaPrimary: "Explore the courses", ctaSecondary: "Visit the shop",
      trust: ["Pay in DA", "Lifetime access", "PDF certificate"],
    },
    approach: {
      eyebrow: "Our approach", title: "Everything to go from", hi: "thread to design",
      items: [
        { title: "Video courses", desc: "From beginner to expert — step-by-step filmed in the studio, with downloadable patterns." },
        { title: "Digital patterns", desc: "PDF A4 · A0 · DXF · projector. Seam allowances included, FR + EU + DZ sizes." },
        { title: "Trainer space", desc: "Sell your courses and patterns. Clear commission, paid in DZD or EUR." },
      ],
    },
    categories: {
      eyebrow: "Our worlds", title: "Explore every", hi: "sewing specialty",
      names: ["Sewing & Design", "Drawing & Styling", "Industrial patterns", "Accessories", "Crafts", "Design software", "Sewing marketing", "Structured paths"],
      b1t: "Independent workshops", b1d: "Learn a specific technique, at your own pace, no commitment.",
      b2t: "Structured paths", b2d: "Progress step by step, from beginner to launching your brand.",
    },
    atelier: {
      eyebrow: "THE ARAZZO STUDIO", title: "Learn by watching,", hi: "progress by sewing",
      p: "Passionate trainers from Algiers, Casablanca and Tunis guide you, step by step, from your first stitch to launching your own brand.",
      features: [
        { title: "Studio-filmed courses", desc: "Every gesture explained, from thread to needle, step by step." },
        { title: "Digital patterns included", desc: "PDF A4 · A0 · projector, FR · EU · DZ sizes, allowances included." },
        { title: "Recognised certificate", desc: "Validate your skills and launch your sewing business." },
      ],
      btn: "See the courses", cardNum: "127 courses", cardSub: "filmed in studio",
      gallery: [
        { label: "Machine sewing", tag: "Level 1" },
        { label: "Design & sketching", tag: "Level 2" },
        { label: "Fashion creation", tag: "Level 3" },
      ],
    },
    courses: {
      eyebrow: "✂ This week's pick", title: "Courses", hi: "not to miss",
      subtitle: "HD videos · PDF patterns · Certificate · Pay in DA",
      catalog: "Full catalog →", catalogMobile: "See the full catalog →", see: "View →",
    },
    testimonials: {
      eyebrow: "Testimonials", title: "They", hi: "trust us",
      sub: "+12,000 students trained across the Maghreb and the diaspora",
      founderQuote: "I created Arazzo Formation so every woman in the Maghreb can access quality professional training, from home, at her own pace. Pattern-making and sewing are arts that deserve to be passed on.",
      founderName: "✂ Founder — Arazzo Formation",
      items: [
        { text: "Thanks to Arazzo Formation I learned pattern-making from home. The videos are clear, the PDF patterns are amazing. I launched my shop!", course: "Level 1 — Basics & Everyday" },
        { text: "The level-3 draping is exceptional. Every technique explained step by step. Paying in euros from France was very easy.", course: "Level 3 — Evening by Draping" },
        { text: "The platform is beautiful and easy. The video player works even on a slow connection. My PDF certificate arrived automatically once I finished.", course: "Level 2 — Classic & Evening" },
      ],
    },
    trainer: {
      badge: "For experts", title: "Share your expertise, earn your income",
      p: "Join our network of trainers and monetize your know-how. Create your courses, sell your patterns and receive your income directly in DZD or EUR.",
      items: ["Attractive commission on every sale", "Full trainer dashboard with analytics", "Payments in DZD or EUR", "Video hosting included", "Support to create your content"],
      btn: "Become a trainer →", stat1: "Published courses", stat2: "Active students", tagline: "Your talent deserves to be shared",
    },
    cta: {
      title: "Ready to go from thread to design?",
      g1: "30-day money-back guarantee", g2: "First lesson free",
      primary: "Create my account", secondary: "Contact the team",
    },
    footer: {
      tagline: "The Maghreb's online academy for sewing, fashion design and pattern-making. The thread of your talent, from model to profession.",
      colPlatform: "Platform", colHelp: "Help", colLegal: "Legal",
      platform: ["Courses", "Patterns", "Become a trainer", "Pricing"],
      help: ["Help center", "Contact", "About"],
      legal: ["Terms", "Sales terms", "Privacy policy"],
      copyright: "© 2026 Arazzo Formation",
    },
  },
};
