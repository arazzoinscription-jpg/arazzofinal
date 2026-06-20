// i18n de la page Offre (landing de vente) — FR / AR / EN. Contenu calqué sur le mockup v0.
export type Lang = "fr" | "ar" | "en";
export const isRtl = (l: Lang) => l === "ar";
export const normLang = (v?: string | null): Lang =>
  v === "ar" || v === "en" || v === "fr" ? v : "fr";

export interface OffreDict {
  nav: { courses: string; register: string; uploadProof: string; confirmReg: string; testLevel: string };
  hero: {
    eyebrow: string; title1: string; titleHi: string; sub: string; desc: string;
    ctaPrimary: string; ctaSecondary: string;
    chips: string[]; instructorName: string; instructorRole: string;
  };
  why: { title: string; sub: string; cards: { t: string; d: string }[] };
  paths: {
    eyebrow: string; title: string; sub: string;
    popular: string; details: string; moreInfo: string; enroll: string; lessons: (n: number) => string;
    levels: string[];
    cards: { name: string; sub: string; level: number }[];
  };
  testBand: { title: string; sub: string; cta: string };
  testi: {
    eyebrow: string; title: string; sub: string;
    stats: { value: string; label: string }[];
    featured: { badge: string; transformTitle: string; role: string; followersLabel: string; program: string; instagramCta: string };
    itemRoles: string[];
    followUs: string;
  };
  gallery: { title: string; sub: string };
  quiz: {
    title: string; sub: string; q: (i: number, n: number) => string;
    next: string; prev: string; seeResult: string; restart: string;
    questions: { q: string; options: string[] }[];
    resultTitle: string; resultText: string; resultCta: string;
  };
  inscription: {
    eyebrow: string; title: string; sub: string;
    yourLevel: string; recommendBelow: string; recommendOther: string;
    chooseCourse: string; coursePlaceholder: string;
    fullName: string; fullNamePlaceholder: string;
    email: string; emailPlaceholder: string;
    phone: string; phonePlaceholder: string;
    wilaya: string;
    submit: string; noCommitment: string; genericError: string;
    doneTitle: string; doneSub: string;
    payTitle: string; beneficiary: string; account: string; key: string; rip: string;
    proofSteps: (amount: string | null) => string[];
    proofEmailLabel: string; attach: string;
    sendProof: string; errProofEmail: string; errProofFile: string; uploadFail: string; proofSuccess: string;
    alreadyTitle: string;
    currency: string;
    levelLabels: { debutant: string; intermediaire: string; avance: string };
  };
  finalCta: { title: string; titleHi: string; sub: string; primary: string; secondary: string };
}

const FR: OffreDict = {
  nav: { courses: "Formations", register: "S'inscrire", uploadProof: "Envoyer ma preuve", confirmReg: "Confirmer mon inscription", testLevel: "Teste ton niveau" },
  hero: {
    eyebrow: "La 1ʳᵉ académie de couture en ligne",
    title1: "Transforme ta passion", titleHi: "en projet rentable",
    sub: "Couture professionnelle · revenu stable · liberté de ton temps",
    desc: "Apprends la couture de zéro et commence à gagner +50 000 DA dès le premier mois.",
    ctaPrimary: "M'inscrire gratuitement", ctaSecondary: "Voir les formations",
    chips: ["Sans expérience requise", "1er mois offert", "Depuis chez toi"],
    instructorName: "Formatrice Noudjoud", instructorRole: "Experte en stylisme & couture",
  },
  why: {
    title: "Tout pour devenir une couturière professionnelle",
    sub: "Du zéro à un vrai revenu — tout est simple et efficace.",
    cards: [
      { t: "100% pratique", d: "Pas de théorie ennuyeuse : tu couds des modèles dès le premier jour." },
      { t: "Depuis zéro", d: "Même si tu n'as jamais cousu — en un an tu deviens experte." },
      { t: "Depuis la maison", d: "Couds et gagne ta vie depuis ta chambre, sans quitter ta famille." },
      { t: "Revenu réel", d: "Commence à gagner dès la première semaine : +50 000 DA / mois." },
      { t: "Communauté forte", d: "Des filles algériennes avec toi — conseils et encouragements au quotidien." },
      { t: "Accompagnement perso", d: "Un suivi pas à pas avec la formatrice jusqu'à ta pièce finie." },
    ],
  },
  paths: {
    eyebrow: "Trois parcours clairs",
    title: "Choisis ton parcours et commence aujourd'hui",
    sub: "De la débutante à l'experte — chaque niveau est conçu pour réaliser tes rêves.",
    popular: "Le + demandé", details: "Détails", moreInfo: "Plus d'info", enroll: "S'inscrire", lessons: (n) => `${n} leçons`,
    levels: ["Débutant", "Intermédiaire", "Avancé"],
    cards: [
      { name: "Niveau 1 — De zéro à pro", sub: "Vêtements du quotidien", level: 0 },
      { name: "Niveau 2 — Design & confection pro", sub: "Vêtements classiques & de soirée", level: 1 },
      { name: "Niveau 3 — Modélisme", sub: "Patronage & pièces complexes", level: 2 },
    ],
  },
  testBand: {
    title: "Pas sûre de savoir par où commencer ?",
    sub: "Teste ton niveau en 2 minutes et on te conseille la formation qui te correspond.",
    cta: "Faire le test de niveau",
  },
  testi: {
    eyebrow: "Elles ont commencé de zéro",
    title: "Histoires de réussite inspirantes",
    sub: "Des élèves parties de zéro qui ont aujourd'hui leurs propres créations, pages et clientes.",
    stats: [
      { value: "+500", label: "élèves satisfaites" },
      { value: "4.9/5", label: "note moyenne" },
      { value: "3", label: "niveaux de formation" },
      { value: "100%", label: "pratique & résultats" },
    ],
    featured: {
      badge: "Histoire de réussite",
      transformTitle: "Du zéro → couturière professionnelle",
      role: "Couture de luxe",
      followersLabel: "abonnés",
      program: "Programme : Niveau 1 & 2",
      instagramCta: "Voir son Instagram",
    },
    itemRoles: ["Élève Arazzo", "Couturière confirmée", "Élève Arazzo"],
    followUs: "Suivre Arazzo sur Instagram",
  },
  gallery: {
    title: "Vois les transformations",
    sub: "De débutantes qui ne savaient pas tenir des ciseaux… à des couturières qui créent de superbes modèles.",
  },
  quiz: {
    title: "Teste ton niveau",
    sub: "4 questions, 1 minute — on te recommande la formation idéale.",
    q: (i, n) => `Question ${i} sur ${n}`,
    next: "Suivant", prev: "Précédent", seeResult: "Voir le résultat", restart: "Recommencer",
    questions: [
      { q: "As-tu déjà utilisé une machine à coudre ?", options: ["Non, jamais", "Quelques fois", "Oui, régulièrement"] },
      { q: "Sais-tu lire et tracer un patron ?", options: ["Pas du tout", "Un peu", "Oui, sans problème"] },
      { q: "Quel est ton objectif ?", options: ["Coudre pour moi & ma famille", "Lancer une activité", "Devenir styliste / modéliste"] },
      { q: "Combien de temps peux-tu y consacrer par semaine ?", options: ["1 à 2 heures", "3 à 5 heures", "Plus de 5 heures"] },
    ],
    resultTitle: "Ton parcours recommandé",
    resultText: "D'après tes réponses, voici par où commencer pour progresser le plus vite.",
    resultCta: "M'inscrire à cette formation",
  },
  inscription: {
    eyebrow: "Inscription",
    title: "Réserve ta place",
    sub: "Choisis ta formation et inscris-toi — sans engagement.",
    yourLevel: "Ton niveau",
    recommendBelow: "Nous te recommandons la formation ci-dessous. Tu peux aussi en choisir une autre.",
    recommendOther: "Nous te recommandons une de nos formations. Tu peux en choisir une autre.",
    chooseCourse: "Formation choisie",
    coursePlaceholder: "— Choisir une formation —",
    fullName: "Nom complet", fullNamePlaceholder: "Amina Benali",
    email: "Email", emailPlaceholder: "vous@exemple.com",
    phone: "Téléphone", phonePlaceholder: "06 …",
    wilaya: "Wilaya",
    submit: "Je m'inscris",
    noCommitment: "Inscription sans engagement — tu paies ensuite par virement et ton accès est ouvert après validation.",
    genericError: "Erreur",
    doneTitle: "Inscription enregistrée !",
    doneSub: "Dernière étape : paie par virement puis dépose ton reçu ci-dessous.",
    payTitle: "Coordonnées de paiement",
    beneficiary: "Bénéficiaire", account: "N° / CCP", key: "Clé", rip: "BaridiMob (RIP)",
    proofSteps: (amount) => [
      `Effectue le virement / versement CCP${amount ? ` de ${amount}` : ""}.`,
      "Prends une photo / capture de ton reçu.",
      "Saisis ton email d'inscription + dépose le reçu ci-dessous.",
      "L'équipe valide (24–48 h) → ta formation s'ouvre + email de confirmation. ✅",
    ],
    proofEmailLabel: "Email d'inscription",
    attach: "Cliquez pour joindre votre reçu (JPG, PNG, PDF · max 10 Mo)",
    sendProof: "Envoyer ma preuve",
    errProofEmail: "Saisissez l'email utilisé à l'inscription.",
    errProofFile: "Choisissez la photo de votre reçu.",
    uploadFail: "Envoi échoué : ",
    proofSuccess: "Preuve reçue ✅ — vous recevez un email de confirmation avec le lien vers votre espace. Accès débloqué dès validation.",
    alreadyTitle: "Déjà inscrite ? Déposez votre preuve de paiement →",
    currency: "DA",
    levelLabels: { debutant: "Débutante", intermediaire: "Intermédiaire", avance: "Avancée" },
  },
  finalCta: {
    title: "Prête à coudre ta", titleHi: "première pièce ?",
    sub: "Rejoins les couturières qui apprennent un métier, point après point, depuis chez elles.",
    primary: "M'inscrire maintenant", secondary: "Voir les formations",
  },
};

const AR: OffreDict = {
  nav: { courses: "الدورات", register: "سجّلي الآن", uploadProof: "تحميل الإثبات", confirmReg: "أكّدي تسجيلك", testLevel: "اختبري مستواك" },
  hero: {
    eyebrow: "أكاديمية الخياطة الأونلاين الأولى",
    title1: "حوّلي شغفك", titleHi: "لمشروع ناجح",
    sub: "خياطة احترافية · دخل ثابت · حرية وقتك",
    desc: "تعلّمي الخياطة من الصفر وابدئي تكسبي +50 ألف دج من الشهر الأول.",
    ctaPrimary: "سجّلي الآن مجاناً", ctaSecondary: "أهمّ الدورات",
    chips: ["بدون خبرة سابقة", "الشهر الأول مجاني", "تعلّمي من البيت"],
    instructorName: "المدرّبة نجود", instructorRole: "خبيرة في تصميم الأزياء والخياطة",
  },
  why: {
    title: "كل ما تحتاجينه لتصبحي خياطة محترفة",
    sub: "من الصفر إلى دخل حقيقي… كل شيء بسيط وفعّال.",
    cards: [
      { t: "عملي 100%", d: "بدون نظري ممل — تخيطي موديلات من اليوم الأول." },
      { t: "من الصفر", d: "حتى لو ما خطيتيش قبل — في عام تولّي expert." },
      { t: "من البيت", d: "تخيطي وتربحي من غرفتك، بلا ما تتركي الأسرة." },
      { t: "دخل حقيقي", d: "ابدئي تكسبي من الأسبوع الأول: +50 ألف دج شهرياً." },
      { t: "عيلة قوية", d: "بنات جزائريات معاك — نصائح وتشجيع يومي." },
      { t: "مرافقة شخصية", d: "متابعة مع المدرّبة خطوة بخطوة حتى القطعة المكتملة." },
    ],
  },
  paths: {
    eyebrow: "ثلاث مسارات واضحة",
    title: "اختاري مسارك وابدئي اليوم",
    sub: "من المبتدئة إلى الخبيرة — كل مستوى مصمّم لتحقيق أحلامك.",
    popular: "الأكثر طلباً", details: "التفاصيل", moreInfo: "معلومات أكثر", enroll: "سجّلي", lessons: (n) => `${n} درس`,
    levels: ["مبتدئ", "متوسط", "متقدم"],
    cards: [
      { name: "المستوى الأول — من الصفر للاحتراف", sub: "الملابس اليومية", level: 0 },
      { name: "المستوى الثاني — تصميم احتراف", sub: "الملابس الكلاسيكية والسواري", level: 1 },
      { name: "المستوى الثالث — الموديلِزم", sub: "الباترون والقطع المعقّدة", level: 2 },
    ],
  },
  testBand: {
    title: "مش متأكدة وين تبدئي؟",
    sub: "اختبري مستواك في دقيقتين ونقترحو عليك أفضل دورة تناسبك.",
    cta: "اختبري المستوى",
  },
  testi: {
    eyebrow: "بدأن من الصفر",
    title: "قصص نجاح ملهمة",
    sub: "متدربات بدؤوا من الصفر واليوم عندهم أعمال وصفحات وموديلات خاصة بهم.",
    stats: [
      { value: "+500", label: "متدربة سعيدة" },
      { value: "4.9/5", label: "تقييم الدورات" },
      { value: "3", label: "مستويات تدريبية" },
      { value: "100%", label: "تطبيق عملي" },
    ],
    featured: {
      badge: "قصة نجاح",
      transformTitle: "من الصفر → خياطة محترفة",
      role: "خياطة فاخرة",
      followersLabel: "متابع",
      program: "برنامج: المستوى الأول والثاني",
      instagramCta: "زوري صفحتها على Instagram",
    },
    itemRoles: ["متدربة Arazzo", "خياطة محترفة", "متدربة Arazzo"],
    followUs: "تابعينا على Instagram",
  },
  gallery: {
    title: "شوفي التحوّلات اللي صارت",
    sub: "من مبتدئات ما يعرفوش يمسكو المقص… لخياطات يصنعو موديلات رائعة.",
  },
  quiz: {
    title: "اختبري مستواك",
    sub: "4 أسئلة، دقيقة وحدة — ونرشّحو لك الدورة المناسبة.",
    q: (i, n) => `السؤال ${i} من ${n}`,
    next: "التالي", prev: "السابق", seeResult: "شوفي النتيجة", restart: "إعادة",
    questions: [
      { q: "هل سبق لك استخدام ماكينة الخياطة؟", options: ["لا، أبداً", "مرات قليلة", "نعم، بشكل متكرر"] },
      { q: "تعرفي تقري وترسمي الباترون؟", options: ["لا أبداً", "شوية", "نعم، بلا مشكل"] },
      { q: "واش هو هدفك؟", options: ["نخيط لروحي وللعائلة", "نطلق نشاط", "نولّي ستيليست / موديليست"] },
      { q: "قداش من وقت تقدري تخصّصي في الأسبوع؟", options: ["ساعة لساعتين", "3 لـ5 ساعات", "أكثر من 5 ساعات"] },
    ],
    resultTitle: "المسار المنصوح به",
    resultText: "حسب إجاباتك، هذا من وين تبدئي باش تتقدّمي بسرعة.",
    resultCta: "سجّلي في هذه الدورة",
  },
  inscription: {
    eyebrow: "التسجيل",
    title: "احجزي مكانك",
    sub: "اختاري دورتك وسجّلي — بلا أي التزام.",
    yourLevel: "مستواك",
    recommendBelow: "ننصحوك بالدورة أسفله. تقدري تختاري وحدة أخرى.",
    recommendOther: "ننصحوك بوحدة من دوراتنا. تقدري تختاري وحدة أخرى.",
    chooseCourse: "الدورة المختارة",
    coursePlaceholder: "— اختاري دورة —",
    fullName: "الاسم الكامل", fullNamePlaceholder: "أمينة بن علي",
    email: "البريد الإلكتروني", emailPlaceholder: "vous@exemple.com",
    phone: "الهاتف", phonePlaceholder: "06 …",
    wilaya: "الولاية",
    submit: "أسجّل",
    noCommitment: "تسجيل بلا التزام — تخلّصي بعدها بالتحويل ويتفتح لك الوصول بعد التأكيد.",
    genericError: "خطأ",
    doneTitle: "تم تسجيلك!",
    doneSub: "الخطوة الأخيرة: خلّصي بالتحويل وحمّلي الوصل أسفله.",
    payTitle: "معلومات الدفع",
    beneficiary: "المستفيد", account: "رقم / CCP", key: "المفتاح", rip: "بريدي موب (RIP)",
    proofSteps: (amount) => [
      `قومي بالتحويل / الدفع عبر CCP${amount ? ` بمبلغ ${amount}` : ""}.`,
      "صوّري / خذي لقطة لوصل الدفع.",
      "أدخلي بريد تسجيلك + حمّلي الوصل أسفله.",
      "الفريق يأكّد (24–48 سا) → تتفتح دورتك + إيميل تأكيد. ✅",
    ],
    proofEmailLabel: "بريد التسجيل",
    attach: "اضغطي لإرفاق وصلك (JPG، PNG، PDF · 10 ميغا كحد أقصى)",
    sendProof: "إرسال الإثبات",
    errProofEmail: "أدخلي البريد المستعمل في التسجيل.",
    errProofFile: "اختاري صورة وصل الدفع.",
    uploadFail: "فشل الإرسال: ",
    proofSuccess: "تم استلام الإثبات ✅ — يوصلك إيميل تأكيد فيه رابط فضائك. يتفتح الوصول بعد التحقّق.",
    alreadyTitle: "مسجّلة من قبل؟ حمّلي إثبات الدفع ←",
    currency: "دج",
    levelLabels: { debutant: "مبتدئة", intermediaire: "متوسّطة", avance: "متقدّمة" },
  },
  finalCta: {
    title: "مستعدّة تخيطي", titleHi: "أول قطعة ليك؟",
    sub: "انضمّي للخياطات اللي يتعلّمو حرفة، غرزة بعد غرزة، من ديارهم.",
    primary: "سجّلي الآن", secondary: "شوفي الدورات",
  },
};

const EN: OffreDict = {
  nav: { courses: "Courses", register: "Sign up", uploadProof: "Upload proof", confirmReg: "Confirm signup", testLevel: "Test your level" },
  hero: {
    eyebrow: "The #1 online sewing academy",
    title1: "Turn your passion", titleHi: "into a thriving business",
    sub: "Professional sewing · steady income · freedom of your time",
    desc: "Learn sewing from scratch and start earning 50,000+ DA from the very first month.",
    ctaPrimary: "Start for free", ctaSecondary: "See the courses",
    chips: ["No experience needed", "First month free", "From home"],
    instructorName: "Instructor Noudjoud", instructorRole: "Fashion design & sewing expert",
  },
  why: {
    title: "Everything to become a professional sewer",
    sub: "From zero to real income — simple and effective.",
    cards: [
      { t: "100% hands-on", d: "No boring theory: you sew real garments from day one." },
      { t: "From scratch", d: "Even if you've never sewn — in a year you become an expert." },
      { t: "From home", d: "Sew and earn from your room, without leaving your family." },
      { t: "Real income", d: "Start earning from week one: 50,000+ DA per month." },
      { t: "Strong community", d: "Algerian women by your side — daily tips and encouragement." },
      { t: "Personal guidance", d: "Step-by-step follow-up with the instructor to your finished piece." },
    ],
  },
  paths: {
    eyebrow: "Three clear paths",
    title: "Choose your path and start today",
    sub: "From beginner to expert — each level is built to reach your dreams.",
    popular: "Most popular", details: "Details", moreInfo: "More info", enroll: "Enroll", lessons: (n) => `${n} lessons`,
    levels: ["Beginner", "Intermediate", "Advanced"],
    cards: [
      { name: "Level 1 — From scratch to pro", sub: "Everyday garments", level: 0 },
      { name: "Level 2 — Pro design & making", sub: "Classic & evening wear", level: 1 },
      { name: "Level 3 — Patternmaking", sub: "Patterns & complex pieces", level: 2 },
    ],
  },
  testBand: {
    title: "Not sure where to start?",
    sub: "Take a 2-minute test and we'll recommend the course that fits you.",
    cta: "Take the level test",
  },
  testi: {
    eyebrow: "They started from zero",
    title: "Inspiring success stories",
    sub: "Students who started from scratch and now have their own creations, pages and clients.",
    stats: [
      { value: "+500", label: "happy students" },
      { value: "4.9/5", label: "average rating" },
      { value: "3", label: "training levels" },
      { value: "100%", label: "practice & results" },
    ],
    featured: {
      badge: "Success story",
      transformTitle: "From zero → professional sewer",
      role: "Luxury tailoring",
      followersLabel: "followers",
      program: "Program: Level 1 & 2",
      instagramCta: "View her Instagram",
    },
    itemRoles: ["Arazzo student", "Professional tailor", "Arazzo student"],
    followUs: "Follow Arazzo on Instagram",
  },
  gallery: {
    title: "See the transformations",
    sub: "From beginners who couldn't hold scissors… to sewers creating stunning pieces.",
  },
  quiz: {
    title: "Test your level",
    sub: "4 questions, 1 minute — we recommend the ideal course.",
    q: (i, n) => `Question ${i} of ${n}`,
    next: "Next", prev: "Previous", seeResult: "See result", restart: "Restart",
    questions: [
      { q: "Have you ever used a sewing machine?", options: ["No, never", "A few times", "Yes, regularly"] },
      { q: "Can you read and draw a pattern?", options: ["Not at all", "A little", "Yes, easily"] },
      { q: "What is your goal?", options: ["Sew for myself & family", "Start a business", "Become a stylist / patternmaker"] },
      { q: "How much time can you dedicate weekly?", options: ["1 to 2 hours", "3 to 5 hours", "More than 5 hours"] },
    ],
    resultTitle: "Your recommended path",
    resultText: "Based on your answers, here's where to start to progress fastest.",
    resultCta: "Enroll in this course",
  },
  inscription: {
    eyebrow: "Enrollment",
    title: "Reserve your spot",
    sub: "Pick your course and sign up — no commitment.",
    yourLevel: "Your level",
    recommendBelow: "We recommend the course below. You can also choose another one.",
    recommendOther: "We recommend one of our courses. You can choose another one.",
    chooseCourse: "Chosen course",
    coursePlaceholder: "— Choose a course —",
    fullName: "Full name", fullNamePlaceholder: "Amina Benali",
    email: "Email", emailPlaceholder: "you@example.com",
    phone: "Phone", phonePlaceholder: "06 …",
    wilaya: "Wilaya",
    submit: "Sign me up",
    noCommitment: "No-commitment signup — you then pay by transfer and your access opens after validation.",
    genericError: "Error",
    doneTitle: "Enrollment saved!",
    doneSub: "Last step: pay by transfer then upload your receipt below.",
    payTitle: "Payment details",
    beneficiary: "Beneficiary", account: "No. / CCP", key: "Key", rip: "BaridiMob (RIP)",
    proofSteps: (amount) => [
      `Make the CCP transfer / deposit${amount ? ` of ${amount}` : ""}.`,
      "Take a photo / screenshot of your receipt.",
      "Enter your signup email + upload the receipt below.",
      "The team validates (24–48 h) → your course opens + confirmation email. ✅",
    ],
    proofEmailLabel: "Signup email",
    attach: "Click to attach your receipt (JPG, PNG, PDF · max 10 MB)",
    sendProof: "Send my proof",
    errProofEmail: "Enter the email used at signup.",
    errProofFile: "Choose the photo of your receipt.",
    uploadFail: "Upload failed: ",
    proofSuccess: "Proof received ✅ — you'll get a confirmation email with the link to your space. Access unlocked once validated.",
    alreadyTitle: "Already enrolled? Upload your payment proof →",
    currency: "DA",
    levelLabels: { debutant: "Beginner", intermediaire: "Intermediate", avance: "Advanced" },
  },
  finalCta: {
    title: "Ready to sew your", titleHi: "first piece?",
    sub: "Join the women learning a craft, stitch after stitch, from home.",
    primary: "Sign up now", secondary: "See the courses",
  },
};

export const OFFRE: Record<Lang, OffreDict> = { fr: FR, ar: AR, en: EN };
