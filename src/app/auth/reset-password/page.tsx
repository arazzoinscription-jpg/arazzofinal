"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Lock, ShieldCheck, AlertTriangle } from "lucide-react";

/**
 * Page affichée après un lien d'activation / réinitialisation (recovery).
 * Le lien Supabase délivre la session via le FRAGMENT d'URL (#access_token=...&refresh_token=...).
 * Or le client navigateur (@supabase/ssr) est en flux PKCE → il ne lit QUE `?code=`, pas le hash.
 * On lit donc le fragment manuellement et on pose la session via setSession().
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState<boolean | null>(null); // null = vérification en cours

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
      const hp = new URLSearchParams(hash);
      const qp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");

      // 1) Erreur transmise par Supabase (lien déjà consommé / expiré)
      if (hp.get("error") || qp.get("error")) {
        setReady(false);
        return;
      }
      // 2) Tokens dans le fragment (cas recovery via generateLink)
      const access_token = hp.get("access_token");
      const refresh_token = hp.get("refresh_token");
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        // Nettoie l'URL (retire le fragment sensible)
        if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname);
        setReady(!error);
        return;
      }
      // 3) Code PKCE dans la query (?code=) — flux callback classique
      const code = qp.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        setReady(!error);
        return;
      }
      // 4) Sinon : session déjà active ?
      const { data } = await supabase.auth.getSession();
      setReady(!!data.session);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) { setErr("Le mot de passe doit faire au moins 8 caractères."); return; }
    if (password !== confirm) { setErr("Les mots de passe ne correspondent pas."); return; }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-DEFAULT dark:bg-[#0d0a1c] px-4">
      <div className="w-full max-w-sm bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10 p-7 shadow-lg">
        <div className="flex items-center gap-2.5 mb-5">
          <span className="w-10 h-10 rounded-xl bg-violet-600/15 text-violet-600 flex items-center justify-center"><ShieldCheck size={20} /></span>
          <div>
            <h1 className="font-playfair text-xl font-bold text-gray-900 dark:text-white">Créez votre mot de passe</h1>
            <p className="text-xs text-gray-500 dark:text-white/50">Dernière étape pour accéder à vos cours</p>
          </div>
        </div>

        {ready === null && (
          <p className="text-sm text-gray-500 dark:text-white/50 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Vérification du lien…</p>
        )}

        {ready === false && (
          <div className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <span>Ce lien est invalide ou a expiré. Demandez un nouveau lien d'activation, ou utilisez « Mot de passe oublié » sur la page de connexion.</span>
          </div>
        )}

        {ready && (
          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-1.5">
                <Lock size={14} className="inline -mt-0.5 me-1" /> Nouveau mot de passe
              </label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required
                className="w-full rounded-xl border border-cream-200 dark:border-white/15 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="8 caractères minimum" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-1.5">Confirmer le mot de passe</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required
                className="w-full rounded-xl border border-cream-200 dark:border-white/15 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            {err && <p className="text-xs text-red-500">{err}</p>}
            <button type="submit" disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 bg-orange-DEFAULT hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl disabled:opacity-60 transition-colors">
              {busy ? <Loader2 size={16} className="animate-spin" /> : null} Valider et accéder à mes cours
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
