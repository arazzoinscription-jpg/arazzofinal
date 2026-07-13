"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setCommunityUsername } from "@/app/actions/profile";

type Initial = {
  nom: string;
  email: string;
  ville: string;
  pays: string;
  avatar_url: string;
  role: string;
  whatsapp: string;
  username: string;
};

const PAYS = [
  { code: "DZ", label: "🇩🇿 Algérie" },
  { code: "MA", label: "🇲🇦 Maroc" },
  { code: "TN", label: "🇹🇳 Tunisie" },
  { code: "FR", label: "🇫🇷 France" },
  { code: "BE", label: "🇧🇪 Belgique" },
  { code: "CA", label: "🇨🇦 Canada" },
  { code: "OTHER", label: "🌍 Autre" },
];

export function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const supabase = createClient();

  // ── Profil ──
  const [form, setForm] = useState(initial);
  const [savingP, setSavingP] = useState(false);
  const [msgP, setMsgP] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Mot de passe ──
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [msgPwd, setMsgPwd] = useState<{ ok: boolean; text: string } | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingP(true);
    setMsgP(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // ── Pseudo (username) : via l'action serveur (validation + unicité) ──
    const wantUsername = form.username.trim().replace(/^@/, "");
    if (wantUsername !== (initial.username ?? "").trim()) {
      if (wantUsername === "") {
        await supabase.from("users").update({ username: null }).eq("id", user.id); // effacer le pseudo
      } else {
        const res = await setCommunityUsername(wantUsername);
        if (!res.ok) { setSavingP(false); setMsgP({ ok: false, text: res.error }); return; }
      }
    }

    const isStaff = form.role === "formateur" || form.role === "admin";
    const { error } = await supabase
      .from("users")
      .update({
        nom: form.nom,
        ville: form.ville || null,
        pays: form.pays,
        avatar_url: form.avatar_url || null,
        // Numéro WhatsApp : réservé au formateur/admin (contact depuis l'espace étudiant).
        ...(isStaff ? { whatsapp: form.whatsapp.trim() || null } : {}),
      })
      .eq("id", user.id);

    setSavingP(false);
    if (error) setMsgP({ ok: false, text: "Erreur : " + error.message });
    else {
      setMsgP({ ok: true, text: "Profil mis à jour ✓" });
      router.refresh();
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsgPwd(null);
    if (pwd.length < 8) {
      setMsgPwd({ ok: false, text: "Le mot de passe doit faire au moins 8 caractères." });
      return;
    }
    if (pwd !== pwd2) {
      setMsgPwd({ ok: false, text: "Les deux mots de passe ne correspondent pas." });
      return;
    }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSavingPwd(false);
    if (error) setMsgPwd({ ok: false, text: "Erreur : " + error.message });
    else {
      setMsgPwd({ ok: true, text: "Mot de passe modifié ✓" });
      setPwd("");
      setPwd2("");
    }
  }

  const roleLabel: Record<string, string> = {
    eleve: "Élève", formateur: "Formateur", admin: "Administrateur",
  };

  return (
    <div className="space-y-8">
      {/* ── Carte Profil ── */}
      <form onSubmit={saveProfile} className="bg-white rounded-2xl border border-cream-200 shadow-soft p-7">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-orange-DEFAULT flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              form.nom?.[0]?.toUpperCase() ?? "?"
            )}
          </div>
          <div>
            <h2 className="font-playfair text-xl font-bold text-gray-900">Informations</h2>
            <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600">
              {roleLabel[form.role] ?? form.role}
            </span>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet</label>
            <input
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Pseudo (nom d'utilisateur)</label>
            <div className="flex items-center border border-gray-200 rounded-xl px-4 focus-within:ring-2 focus-within:ring-orange-500">
              <span className="text-gray-400 select-none">@</span>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.replace(/^@/, "") })}
                placeholder="mon_pseudo"
                maxLength={20}
                className="flex-1 px-2 py-3 focus:outline-none bg-transparent"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Affiché dans la communauté à la place de votre nom. 3 à 20 caractères (lettres, chiffres, _). Laissez vide pour utiliser votre nom.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              value={form.email}
              disabled
              className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-cream-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié ici.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ville</label>
              <input
                value={form.ville}
                onChange={(e) => setForm({ ...form, ville: e.target.value })}
                placeholder="Alger"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Pays</label>
              <select
                value={form.pays}
                onChange={(e) => setForm({ ...form, pays: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              >
                {PAYS.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">URL de l'avatar (optionnel)</label>
            <input
              value={form.avatar_url}
              onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
              placeholder="https://…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {(form.role === "formateur" || form.role === "admin") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Numéro WhatsApp</label>
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="+213 6 12 34 56 78"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-400 mt-1">Utilisé pour vous contacter depuis l'espace étudiant (avec l'indicatif pays).</p>
            </div>
          )}
        </div>

        {msgP && (
          <p className={`text-sm mt-4 px-4 py-2.5 rounded-xl ${msgP.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {msgP.text}
          </p>
        )}

        <button
          type="submit"
          disabled={savingP}
          className="mt-6 bg-orange-DEFAULT text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {savingP ? "Enregistrement…" : "Enregistrer les modifications"}
        </button>
      </form>

      {/* ── Carte Mot de passe ── */}
      <form onSubmit={changePassword} className="bg-white rounded-2xl border border-cream-200 shadow-soft p-7">
        <h2 className="font-playfair text-xl font-bold text-gray-900 mb-1">🔒 Changer le mot de passe</h2>
        <p className="text-gray-500 text-sm mb-6 font-dm">Choisissez un nouveau mot de passe sécurisé (8 caractères minimum).</p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nouveau mot de passe</label>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le mot de passe</label>
            <input
              type="password"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {msgPwd && (
          <p className={`text-sm mt-4 px-4 py-2.5 rounded-xl ${msgPwd.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {msgPwd.text}
          </p>
        )}

        <button
          type="submit"
          disabled={savingPwd}
          className="mt-6 bg-orange-DEFAULT text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {savingPwd ? "Modification…" : "Modifier le mot de passe"}
        </button>
      </form>
    </div>
  );
}
