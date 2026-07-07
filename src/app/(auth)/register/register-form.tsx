"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GraduationCap, Scissors, ArrowRight, ArrowLeft, Check, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mergeCartOnLogin } from "@/app/actions/cart";
import { notifyAdminSignup } from "@/app/actions/admin-notify";
import { onProspectSignup } from "@/app/actions/prospect";
import { DotMap } from "@/components/ui/dot-map";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { isRtl, type Lang } from "@/lib/store-i18n";

type AccountType = "formations" | "patrons";

const T = {
  fr: {
    heroT1: "La couture,", heroT2: "sans frontières.", heroSub: "Rejoignez +12 000 couturières — d'Alger à Casablanca, de Tunis à Paris et Montréal.",
    welcome: "Bienvenue", whatDo: "Que souhaitez-vous faire ?",
    learn: "Apprendre la couture", learnSub: "Formations + certificat.", buy: "Acheter des patrons", buySub: "Patrons PDF prêts à imprimer.",
    haveAccount: "Déjà un compte ?", signIn: "Se connecter", changeChoice: "Changer de choix",
    badgePatron: "Acheteur de patrons", badgeEleve: "Élève (formations)", createTitle: "Créer un compte",
    subPatron: "Accédez à la bibliothèque de patrons.", subEleve: "Rejoignez +12 000 élèves du Maghreb.",
    name: "Prénom et nom", namePh: "Amina Benali", email: "Email", password: "Mot de passe", pwdPh: "Minimum 8 caractères",
    city: "Ville", cityPh: "Alger", country: "Pays", creating: "Création…", createBtn: "Créer mon compte gratuit",
    show: "Afficher le mot de passe", hide: "Masquer le mot de passe",
  },
  ar: {
    heroT1: "الخياطة", heroT2: "بلا حدود.", heroSub: "انضمّي إلى أكثر من 12000 خيّاطة — من الجزائر إلى الدار البيضاء، ومن تونس إلى باريس ومونتريال.",
    welcome: "مرحبًا", whatDo: "ماذا تودّين أن تفعلي؟",
    learn: "تعلّم الخياطة", learnSub: "دورات + شهادة.", buy: "شراء الباترونات", buySub: "باترونات PDF جاهزة للطباعة.",
    haveAccount: "لديك حساب؟", signIn: "تسجيل الدخول", changeChoice: "تغيير الاختيار",
    badgePatron: "مشترٍ للباترونات", badgeEleve: "طالبة (دورات)", createTitle: "إنشاء حساب",
    subPatron: "ادخلي إلى مكتبة الباترونات.", subEleve: "انضمّي إلى أكثر من 12000 طالبة في المغرب العربي.",
    name: "الاسم الكامل", namePh: "أمينة بن علي", email: "البريد الإلكتروني", password: "كلمة المرور", pwdPh: "8 أحرف على الأقل",
    city: "المدينة", cityPh: "الجزائر", country: "البلد", creating: "جارٍ الإنشاء…", createBtn: "إنشاء حسابي المجاني",
    show: "إظهار كلمة المرور", hide: "إخفاء كلمة المرور",
  },
  en: {
    heroT1: "Couture,", heroT2: "without borders.", heroSub: "Join 12,000+ sewists — from Algiers to Casablanca, Tunis to Paris and Montréal.",
    welcome: "Welcome", whatDo: "What would you like to do?",
    learn: "Learn sewing", learnSub: "Courses + certificate.", buy: "Buy patterns", buySub: "Print-ready PDF patterns.",
    haveAccount: "Already have an account?", signIn: "Sign in", changeChoice: "Change choice",
    badgePatron: "Pattern buyer", badgeEleve: "Student (courses)", createTitle: "Create an account",
    subPatron: "Access the pattern library.", subEleve: "Join 12,000+ students across the Maghreb.",
    name: "Full name", namePh: "Amina Benali", email: "Email", password: "Password", pwdPh: "Minimum 8 characters",
    city: "City", cityPh: "Algiers", country: "Country", creating: "Creating…", createBtn: "Create my free account",
    show: "Show password", hide: "Hide password",
  },
} as const;

const PAYS = [
  { code: "DZ", label: "🇩🇿 Algérie" }, { code: "MA", label: "🇲🇦 Maroc" }, { code: "TN", label: "🇹🇳 Tunisie" },
  { code: "FR", label: "🇫🇷 France" }, { code: "BE", label: "🇧🇪 Belgique" }, { code: "CA", label: "🇨🇦 Canada" },
  { code: "OTHER", label: "🌍 Autre" },
];

export function RegisterForm({ lang = "fr" }: { lang?: Lang }) {
  const t = T[lang];

  const initialType = ((): AccountType | null => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search).get("type");
    return p === "patrons" || p === "formations" ? p : null;
  })();

  const [step, setStep] = useState<"choose" | "form">(initialType ? "form" : "choose");
  const [accountType, setAccountType] = useState<AccountType>(initialType ?? "formations");
  const [form, setForm] = useState({ nom: "", email: "", password: "", ville: "", pays: "DZ" });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function pick(type: AccountType) {
    setAccountType(type);
    setStep("form");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { nom: form.nom, ville: form.ville, pays: form.pays, account_type: accountType },
        emailRedirectTo: `${location.origin}/dashboard`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("users").upsert({
        id: data.user.id, nom: form.nom, email: form.email, ville: form.ville, pays: form.pays, role: "eleve",
      });
    }

    // Notifie l'admin par email (best-effort, ne bloque pas l'inscription).
    await notifyAdminSignup({ nom: form.nom, email: form.email, ville: form.ville, pays: form.pays, accountType }).catch(() => {});

    // Démarre le suivi prospect + email de bienvenue (best-effort, non bloquant).
    if (data.user) {
      await onProspectSignup({ userId: data.user.id, nom: form.nom, email: form.email, source: "direct" }).catch(() => {});
    }

    await mergeCartOnLogin().catch(() => {});
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    const target = redirect && redirect.startsWith("/") ? redirect : "/dashboard";
    // Navigation « dure » (rechargement) : garantit que le serveur reçoit la
    // session fraîche → évite le gel en PWA après router.push().
    window.location.assign(target);
  }

  const inputCls =
    "w-full rounded-xl border border-cream-200 bg-cream-50/60 px-4 py-3 text-sm text-violet-950 placeholder:text-violet-950/35 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-400 transition-all";

  return (
    <div dir={isRtl(lang) ? "rtl" : "ltr"} className="min-h-screen w-full flex items-center justify-center bg-cream-DEFAULT p-4">
      <div aria-hidden className="pointer-events-none fixed inset-0"
        style={{ backgroundImage: "linear-gradient(to right, rgba(91,22,249,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(91,22,249,0.035) 1px, transparent 1px)", backgroundSize: "27px 27px" }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-4xl flex overflow-hidden rounded-3xl bg-white ring-1 ring-violet-950/10 shadow-[0_40px_90px_-40px_rgba(43,18,69,0.55)]"
      >
        {/* ── Panneau gauche : carte animée + marque ── */}
        <div className="hidden md:block w-1/2 relative overflow-hidden bg-gradient-to-br from-[#1b0c3c] via-violet-900 to-[#2a1245]">
          <DotMap dotRgb="255,255,255" routeColor="#FE7223" />
          <span aria-hidden className="absolute top-5 start-5 w-4 h-4 border-t-2 border-s-2 border-white/25" />
          <span aria-hidden className="absolute bottom-5 end-5 w-4 h-4 border-b-2 border-e-2 border-white/25" />

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10 z-10">
            <motion.img
              initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
              src="/images/arazzo-icon.png" alt="Arazzo" className="w-14 h-14 rounded-2xl shadow-lg shadow-black/30 mb-6"
            />
            <motion.span
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}
              className="font-mono text-[11px] tracking-[0.3em] uppercase text-orange-300 mb-3"
            >
              N° 01 · Atelier
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.5 }}
              className="font-playfair text-3xl font-bold text-white leading-tight"
            >
              {t.heroT1} <span className="italic text-orange-300">{t.heroT2}</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.5 }}
              className="text-violet-200/80 text-sm font-dm mt-4 max-w-xs"
            >
              {t.heroSub}
            </motion.p>
          </div>
        </div>

        {/* ── Panneau droit : choix + formulaire ── */}
        <div className="w-full md:w-1/2 p-8 sm:p-10 flex flex-col justify-center">
          {step === "choose" ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-violet-950 mb-1">{t.welcome} 👋</h1>
              <p className="text-violet-950/55 font-dm mb-7">{t.whatDo}</p>

              <div className="space-y-3.5">
                <button onClick={() => pick("formations")}
                  className="group w-full text-start rounded-2xl border-2 border-cream-200 hover:border-orange-400 hover:bg-orange-50/40 p-4 transition-all flex items-center gap-3.5">
                  <span className="w-11 h-11 rounded-xl bg-orange-DEFAULT/10 text-orange-600 flex items-center justify-center flex-shrink-0"><GraduationCap size={22} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-violet-950">{t.learn}</span>
                    <span className="block text-sm text-violet-950/50">{t.learnSub}</span>
                  </span>
                  <ArrowRight size={18} className="text-violet-950/20 group-hover:text-orange-500 transition-colors flex-shrink-0 rtl:rotate-180" />
                </button>
                <button onClick={() => pick("patrons")}
                  className="group w-full text-start rounded-2xl border-2 border-cream-200 hover:border-violet-400 hover:bg-violet-50/40 p-4 transition-all flex items-center gap-3.5">
                  <span className="w-11 h-11 rounded-xl bg-violet-DEFAULT/10 text-violet-700 flex items-center justify-center flex-shrink-0"><Scissors size={22} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-violet-950">{t.buy}</span>
                    <span className="block text-sm text-violet-950/50">{t.buySub}</span>
                  </span>
                  <ArrowRight size={18} className="text-violet-950/20 group-hover:text-violet-500 transition-colors flex-shrink-0 rtl:rotate-180" />
                </button>
              </div>

              <p className="text-center text-sm text-violet-950/50 mt-7">
                {t.haveAccount} <Link href="/login" className="text-orange-600 font-semibold hover:underline">{t.signIn}</Link>
              </p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <button onClick={() => setStep("choose")}
                className="inline-flex items-center gap-1.5 text-sm text-violet-950/40 hover:text-violet-950 mb-4 transition-colors">
                <ArrowLeft size={15} className="rtl:rotate-180" /> {t.changeChoice}
              </button>

              <div className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-3 ${
                accountType === "patrons" ? "bg-violet-50 text-violet-700" : "bg-orange-50 text-orange-700"
              }`}>
                {accountType === "patrons" ? <Scissors size={14} /> : <GraduationCap size={14} />}
                <Check size={13} />
                {accountType === "patrons" ? t.badgePatron : t.badgeEleve}
              </div>

              <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-violet-950 mb-1">{t.createTitle}</h1>
              <p className="text-violet-950/55 font-dm mb-6 text-sm">
                {accountType === "patrons" ? t.subPatron : t.subEleve}
              </p>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-violet-950/70 mb-1.5">{t.name}</label>
                  <input type="text" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    required placeholder={t.namePh} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-violet-950/70 mb-1.5">
                    {t.email} <span className="text-orange-500">*</span>
                  </label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required placeholder="vous@exemple.com" autoComplete="email" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-violet-950/70 mb-1.5">
                    {t.password} <span className="text-orange-500">*</span>
                  </label>
                  <div className="relative">
                    <input type={showPwd ? "text" : "password"} value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required minLength={8} placeholder={t.pwdPh} autoComplete="new-password"
                      className={`${inputCls} pe-10`} />
                    <button type="button" onClick={() => setShowPwd((v) => !v)}
                      aria-label={showPwd ? t.hide : t.show}
                      className="absolute inset-y-0 end-0 flex items-center pe-3 text-violet-950/40 hover:text-violet-950/70">
                      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-violet-950/70 mb-1.5">{t.city}</label>
                    <input type="text" value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })}
                      placeholder={t.cityPh} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-violet-950/70 mb-1.5">{t.country}</label>
                    <select value={form.pays} onChange={(e) => setForm({ ...form, pays: e.target.value })}
                      className={`${inputCls} bg-cream-50/60`}>
                      {PAYS.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
                    </select>
                  </div>
                </div>

                {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-xl">{error}</p>}

                <motion.button
                  type="submit" disabled={loading}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  className="group relative w-full overflow-hidden bg-gradient-to-r from-orange-DEFAULT to-orange-500 text-white py-3 rounded-xl font-bold shadow-glow disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? t.creating : <>{t.createBtn} <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform rtl:rotate-180" /></>}
                  <span className="absolute top-0 bottom-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent blur-md opacity-0 group-hover:opacity-100 group-hover:left-[110%] transition-all duration-700" />
                </motion.button>
              </form>

              <div className="flex items-center w-full my-4">
                <div className="flex-grow border-t border-dashed border-cream-300" />
                <span className="mx-3 text-xs text-violet-950/40 font-dm">ou</span>
                <div className="flex-grow border-t border-dashed border-cream-300" />
              </div>
              <OAuthButtons next="/dashboard" />

              <p className="text-center text-sm text-violet-950/50 mt-5">
                {t.haveAccount} <Link href="/login" className="text-orange-600 font-semibold hover:underline">{t.signIn}</Link>
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
