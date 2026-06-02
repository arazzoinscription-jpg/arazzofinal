"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    // Journaliser la connexion (IP, appareil) — best effort
    fetch("/api/auth/log-login", { method: "POST" }).catch(() => {});

    router.push("/dashboard");
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Veuillez saisir votre email.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/dashboard` },
    });
    setMagicSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-cream-DEFAULT flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-orange-DEFAULT text-3xl">✂️</span>
            <div>
              <div className="font-playfair font-bold text-violet-DEFAULT text-2xl">ARAZZO</div>
              <div className="font-playfair italic text-orange-DEFAULT text-sm -mt-1">Formation</div>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-cream-200">
          <h1 className="font-playfair text-2xl font-bold text-gray-900 mb-2">
            Connexion
          </h1>
          <p className="text-gray-500 mb-8">Accédez à votre espace formation</p>

          {magicSent ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="font-semibold text-gray-900 mb-2">Lien envoyé !</h2>
              <p className="text-gray-500">
                Vérifiez votre boîte mail et cliquez sur le lien pour vous
                connecter.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="vous@exemple.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-DEFAULT text-white py-3.5 rounded-xl font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Connexion…" : "Se connecter"}
              </button>

              <div className="relative flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-sm text-gray-400">ou</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                type="button"
                onClick={handleMagicLink}
                disabled={loading}
                className="w-full border-2 border-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold hover:border-violet-DEFAULT hover:text-violet-DEFAULT transition-colors disabled:opacity-50"
              >
                🔗 Connexion par lien magique
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Pas encore de compte ?{" "}
            <Link href="/register" className="text-violet-DEFAULT font-semibold hover:underline">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
