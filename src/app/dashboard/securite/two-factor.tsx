"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function TwoFactor() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null);
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.find((f) => f.status === "verified");
    setVerifiedFactorId(verified?.id ?? null);
    setLoading(false);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  async function startEnroll() {
    setBusy(true); setMsg(null);
    // Nettoyer d'éventuels facteurs non vérifiés
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.totp ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });

    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Arazzo " + Date.now() });
    setBusy(false);
    if (error || !data) { setMsg({ ok: false, text: error?.message ?? "Erreur" }); return; }
    setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verify() {
    if (!enroll) return;
    setBusy(true); setMsg(null);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
    if (chErr || !ch) { setBusy(false); setMsg({ ok: false, text: chErr?.message ?? "Erreur" }); return; }
    const { error } = await supabase.auth.mfa.verify({ factorId: enroll.factorId, challengeId: ch.id, code: code.trim() });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: "Code invalide, réessayez." }); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("users").update({ twofa_enabled: true }).eq("id", user.id);
    setEnroll(null); setCode(""); setMsg({ ok: true, text: "2FA activée ✓" });
    refresh();
  }

  async function disable() {
    if (!verifiedFactorId) return;
    setBusy(true);
    await supabase.auth.mfa.unenroll({ factorId: verifiedFactorId });
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("users").update({ twofa_enabled: false }).eq("id", user.id);
    setBusy(false); setMsg({ ok: true, text: "2FA désactivée." });
    refresh();
  }

  if (loading) return <div className="text-gray-400 text-sm font-dm">Chargement…</div>;

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-soft p-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">🔐</span>
        <div>
          <h2 className="font-playfair text-xl font-bold text-gray-900">Double authentification (2FA)</h2>
          <p className="text-sm text-gray-500 font-dm">Protégez votre compte avec une application d'authentification.</p>
        </div>
      </div>

      {verifiedFactorId ? (
        <div>
          <span className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm font-semibold mb-4">
            ✓ 2FA activée
          </span>
          <button onClick={disable} disabled={busy}
            className="block border border-red-200 text-red-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-red-50 transition-colors disabled:opacity-50">
            {busy ? "…" : "Désactiver la 2FA"}
          </button>
        </div>
      ) : enroll ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 font-dm">1. Scannez ce QR code avec Google Authenticator, Authy, etc.</p>
          {enroll.qr.includes("<svg") ? (
            <div className="bg-white inline-block p-2 rounded-xl border border-cream-200 w-44 h-44 [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: enroll.qr }} />
          ) : (
            <div className="bg-white inline-block p-2 rounded-xl border border-cream-200 w-44 h-44">
              <img src={enroll.qr} alt="QR 2FA" className="w-full h-full" />
            </div>
          )}
          <p className="text-xs text-gray-400 font-dm break-all">Clé manuelle : <span className="font-mono">{enroll.secret}</span></p>
          <p className="text-sm text-gray-600 font-dm">2. Entrez le code à 6 chiffres affiché :</p>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="123456"
              className="border border-gray-200 rounded-xl px-4 py-2.5 w-36 text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-violet-500" />
            <button onClick={verify} disabled={busy || code.length < 6}
              className="bg-violet-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-50">
              {busy ? "…" : "Vérifier"}
            </button>
            <button onClick={() => setEnroll(null)} className="px-4 py-2.5 rounded-xl border border-cream-200 text-gray-500 font-semibold">Annuler</button>
          </div>
        </div>
      ) : (
        <button onClick={startEnroll} disabled={busy}
          className="bg-violet-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50">
          {busy ? "…" : "Activer la 2FA"}
        </button>
      )}

      {msg && <p className={`text-sm mt-4 px-4 py-2.5 rounded-xl ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{msg.text}</p>}
    </div>
  );
}
