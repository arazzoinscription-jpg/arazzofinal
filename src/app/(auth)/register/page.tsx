"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mergeCartOnLogin } from "@/app/actions/cart";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nom: "",
    email: "",
    password: "",
    ville: "",
    pays: "DZ",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { nom: form.nom, ville: form.ville, pays: form.pays },
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
        id: data.user.id,
        nom: form.nom,
        email: form.email,
        ville: form.ville,
        pays: form.pays,
        role: "eleve",
      });
    }

    // Fusionne le panier invité (cookie) si une session est active
    await mergeCartOnLogin().catch(() => {});

    const redirect = new URLSearchParams(window.location.search).get("redirect");
    router.push(redirect && redirect.startsWith("/") ? redirect : "/dashboard");
  }

  const pays = [
    { code: "DZ", label: "🇩🇿 Algérie" },
    { code: "MA", label: "🇲🇦 Maroc" },
    { code: "TN", label: "🇹🇳 Tunisie" },
    { code: "FR", label: "🇫🇷 France" },
    { code: "BE", label: "🇧🇪 Belgique" },
    { code: "CA", label: "🇨🇦 Canada" },
    { code: "OTHER", label: "🌍 Autre" },
  ];

  return (
    <div className="min-h-screen bg-cream-DEFAULT flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
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
            Créer un compte
          </h1>
          <p className="text-gray-500 mb-8">
            Rejoignez +12 000 élèves du Maghreb
          </p>

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Prénom et nom
              </label>
              <input
                type="text"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                required
                placeholder="Amina Benali"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                placeholder="vous@exemple.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mot de passe
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
                placeholder="Minimum 8 caractères"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Ville
                </label>
                <input
                  type="text"
                  value={form.ville}
                  onChange={(e) => setForm({ ...form, ville: e.target.value })}
                  placeholder="Alger"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Pays
                </label>
                <select
                  value={form.pays}
                  onChange={(e) => setForm({ ...form, pays: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all bg-white"
                >
                  {pays.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-DEFAULT text-white py-3.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 text-lg"
            >
              {loading ? "Création…" : "Créer mon compte gratuit"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-violet-DEFAULT font-semibold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
