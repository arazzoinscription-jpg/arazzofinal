"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mergeCartOnLogin } from "@/app/actions/cart";
import { requestPasswordReset } from "@/app/actions/forgot-password";
import { requestMagicLink } from "@/app/actions/magic-link";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { isRtl, type Lang } from "@/lib/store-i18n";

const T = {
  fr: {
    home: "Accueil Arazzo", title: "Bon retour parmi nous", subtitle: "Connectez-vous à votre espace de couture.",
    emailPh: "vous@exemple.com", pwdPh: "Mot de passe", forgot: "Mot de passe oublié ?",
    signIn: "Se connecter", signingIn: "Connexion…", or: "ou", magic: "Recevoir un lien magique",
    noAccount: "Pas encore de compte ?", register: "S'inscrire",
    errCreds: "Email ou mot de passe incorrect.", errEmail: "Veuillez saisir votre email.",
    otherDevice: "Votre compte vient d'être utilisé sur un autre appareil. Pour votre sécurité, reconnectez-vous ici.",
    sentTitle: "Lien envoyé !", sentBody: "Vérifiez votre boîte mail et cliquez sur le lien pour vous connecter.",
    back: "← Revenir à la connexion", show: "Afficher le mot de passe", hide: "Masquer le mot de passe",
  },
  ar: {
    home: "الصفحة الرئيسية", title: "مرحبًا بعودتك", subtitle: "سجّلي الدخول إلى مساحتك للخياطة.",
    emailPh: "you@example.com", pwdPh: "كلمة المرور", forgot: "هل نسيت كلمة المرور؟",
    signIn: "تسجيل الدخول", signingIn: "جارٍ الدخول…", or: "أو", magic: "استلام رابط سحري",
    noAccount: "ليس لديك حساب؟", register: "إنشاء حساب",
    errCreds: "البريد الإلكتروني أو كلمة المرور غير صحيحة.", errEmail: "يرجى إدخال بريدك الإلكتروني.",
    otherDevice: "تم استخدام حسابك على جهاز آخر. لأمانك، يرجى تسجيل الدخول من جديد هنا.",
    sentTitle: "تم إرسال الرابط!", sentBody: "تحقّقي من بريدك واضغطي على الرابط لتسجيل الدخول.",
    back: "← العودة لتسجيل الدخول", show: "إظهار كلمة المرور", hide: "إخفاء كلمة المرور",
  },
  en: {
    home: "Arazzo home", title: "Welcome back", subtitle: "Sign in to your couture space.",
    emailPh: "you@example.com", pwdPh: "Password", forgot: "Forgot password?",
    signIn: "Sign in", signingIn: "Signing in…", or: "or", magic: "Get a magic link",
    noAccount: "No account yet?", register: "Sign up",
    errCreds: "Wrong email or password.", errEmail: "Please enter your email.",
    otherDevice: "Your account was just used on another device. For your security, please sign in again here.",
    sentTitle: "Link sent!", sentBody: "Check your inbox and click the link to sign in.",
    back: "← Back to sign in", show: "Show password", hide: "Hide password",
  },
} as const;

export function LoginForm({ lang = "fr" }: { lang?: Lang }) {
  const t = T[lang];
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [notice, setNotice] = useState("");

  // Message si l'élève a été déconnecté parce que son compte a été utilisé ailleurs.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "autre_appareil") {
      setNotice(t.otherDevice);
    }
  }, [t.otherDevice]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(t.errCreds);
      setLoading(false);
      return;
    }

    fetch("/api/auth/log-login", { method: "POST" }).catch(() => {});
    await mergeCartOnLogin().catch(() => {});

    const redirect = new URLSearchParams(window.location.search).get("redirect");
    router.push(redirect && redirect.startsWith("/") ? redirect : "/dashboard");
  }

  async function handleMagicLink() {
    if (!email) {
      setError(t.errEmail);
      return;
    }
    setLoading(true);
    setError("");
    // Envoi via Resend (email personnalisé du site), pas le système Supabase.
    await requestMagicLink(email);
    setMagicSent(true);
    setLoading(false);
  }

  /** Mot de passe oublié : envoi via Resend (pas le système email Supabase, non configuré). */
  async function handleForgotPassword() {
    if (!email) {
      setError(t.errEmail);
      return;
    }
    setLoading(true);
    setError("");
    await requestPasswordReset(email);
    setMagicSent(true);
    setLoading(false);
  }

  const inputCls =
    "w-full ps-10 pe-3 py-2.5 rounded-xl border border-cream-200 bg-cream-50/60 text-sm text-violet-950 placeholder:text-violet-950/35 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-400 transition-all";

  return (
    <div dir={isRtl(lang) ? "rtl" : "ltr"} className="min-h-screen w-full flex items-center justify-center bg-cream-DEFAULT px-4">
      <div aria-hidden className="pointer-events-none fixed inset-0"
        style={{ backgroundImage: "linear-gradient(to right, rgba(91,22,249,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(91,22,249,0.035) 1px, transparent 1px)", backgroundSize: "27px 27px" }} />

      <div className="relative w-full max-w-sm bg-white rounded-3xl ring-1 ring-violet-950/10 shadow-[0_34px_80px_-40px_rgba(43,18,69,0.55)] p-8 flex flex-col items-center text-violet-950">
        <Link href="/" aria-label={t.home}
          className="flex items-center justify-center w-14 h-14 rounded-2xl bg-cream-50 ring-1 ring-violet-950/10 shadow-sm mb-5">
          <img src="/images/arazzo-icon.png" alt="Arazzo" className="w-10 h-10 rounded-xl" />
        </Link>

        <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-orange-600 mb-2">N° 01 · Atelier</span>
        <h1 className="font-playfair text-2xl font-bold mb-1 text-center">{t.title}</h1>
        <p className="text-violet-950/55 text-sm mb-7 text-center font-dm">{t.subtitle}</p>

        {notice && (
          <div className="w-full mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 font-dm text-center">
            {notice}
          </div>
        )}

        {magicSent ? (
          <div className="w-full text-center py-6">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 mb-4">
              <MailCheck size={26} />
            </span>
            <h2 className="font-playfair text-lg font-bold mb-2">{t.sentTitle}</h2>
            <p className="text-violet-950/55 text-sm font-dm">{t.sentBody}</p>
            <button onClick={() => setMagicSent(false)} className="mt-5 text-sm text-orange-600 font-semibold hover:underline">
              {t.back}
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
            <div className="relative">
              <span className="absolute start-3 top-1/2 -translate-y-1/2 text-violet-950/35"><Mail className="w-4 h-4" /></span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder={t.emailPh} autoComplete="email" className={inputCls} />
            </div>

            <div className="relative">
              <span className="absolute start-3 top-1/2 -translate-y-1/2 text-violet-950/35"><Lock className="w-4 h-4" /></span>
              <input type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                required placeholder={t.pwdPh} autoComplete="current-password" className={`${inputCls} pe-10`} />
              <button type="button" onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? t.hide : t.show}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-violet-950/40 hover:text-violet-950/70">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between min-h-[1.25rem]">
              {error ? <span className="text-sm text-red-500">{error}</span> : <span />}
              <button type="button" onClick={handleForgotPassword} disabled={loading}
                className="text-xs text-violet-950/50 hover:text-orange-600 hover:underline font-medium disabled:opacity-50">
                {t.forgot}
              </button>
            </div>

            <button type="submit" disabled={loading}
              className="group w-full mt-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-DEFAULT to-orange-500 text-white font-bold py-2.5 rounded-xl shadow-glow hover:brightness-105 disabled:opacity-60 transition-all">
              {loading ? t.signingIn : <>{t.signIn} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform rtl:rotate-180" /></>}
            </button>

            <div className="flex items-center w-full my-2">
              <div className="flex-grow border-t border-dashed border-cream-300" />
              <span className="mx-3 text-xs text-violet-950/40 font-dm">{t.or}</span>
              <div className="flex-grow border-t border-dashed border-cream-300" />
            </div>

            <OAuthButtons next="/dashboard" />

            <button type="button" onClick={handleMagicLink} disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 border-2 border-cream-200 text-violet-950/80 font-semibold py-2.5 rounded-xl hover:border-violet-400 hover:text-violet-700 transition-colors disabled:opacity-50">
              <Sparkles className="w-4 h-4 text-orange-500" /> {t.magic}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-violet-950/50 mt-6">
          {t.noAccount}{" "}
          <Link href="/register" className="text-orange-600 font-semibold hover:underline">{t.register}</Link>
        </p>
      </div>
    </div>
  );
}
