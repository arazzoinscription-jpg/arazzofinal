"use client";

import { useState } from "react";
import { requestEnrollment } from "@/app/actions/enrollment-request";
import { submitDeliveryOrder } from "@/app/actions/rejoindre";

// Le SEUL formulaire de la landing. Écrit dans enrollment_requests (base du LMS)
// via l'action native → apparaît dans /admin/demandes-enrolement + e-mail admin.
export default function InscriptionForm({ courseId }: { courseId: string }) {
  const [v, setV] = useState({ full_name: "", phone: "", email: "", wilaya: "", address: "" });
  const [method, setMethod] = useState<"contact" | "delivery">("contact");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!consent) { setErr("Merci de cocher la case pour qu’on puisse vous recontacter."); return; }
    if (method === "delivery" && v.address.trim().length < 4) { setErr("Adresse de livraison requise."); return; }
    setBusy(true);
    const r = method === "delivery"
      ? await submitDeliveryOrder({
        courseId,
        full_name: v.full_name.trim(),
        email: v.email.trim(),
        phone: v.phone.trim(),
        wilaya: v.wilaya.trim() || null,
        address: v.address.trim(),
      })
      : await requestEnrollment({
        courseId,
        full_name: v.full_name.trim(),
        email: v.email.trim(),
        phone: v.phone.trim() || null,
        wilaya: v.wilaya.trim() || null,
      });
    setBusy(false);
    if (r.ok) setOk(true);
    else setErr(r.error || "Envoi impossible. Réessayez.");
  }

  if (ok) {
    return (
      <div className="text-center py-6">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="font-serif text-2xl text-[#2A0880]">Merci ! C’est bien noté</h2>
        <p className="text-gray-600 mt-2">
          {method === "delivery"
            ? "Votre fiche d’inscription est en préparation. La société de livraison vous l’apportera (avec votre code d’accès) — vous réglez à la réception. 🌸"
            : "Votre demande est envoyée. Nous vous recontactons très vite pour finaliser votre inscription. 🌸"}
        </p>
      </div>
    );
  }

  const input = "w-full px-4 py-3 rounded-lg border border-[#e7e1f7] bg-[#faf8ff] focus:outline-none focus:border-[#5B16F9] focus:bg-white";

  return (
    <form onSubmit={submit} className="mt-2">
      <h2 className="font-serif text-2xl text-[#2A0880] mb-3">Je veux m’inscrire</h2>
      {/* #7 — Choix de la méthode. « Fiche + livraison » appelle le service COD/fiche du LMS. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <button type="button" onClick={() => setMethod("contact")}
          className={`px-3 py-2.5 rounded-xl border-2 text-sm font-semibold ${method === "contact" ? "border-[#5B16F9] bg-[#5B16F9]/5 text-[#2A0880]" : "border-gray-200 text-gray-500"}`}>
          ☎️ On me recontacte
        </button>
        <button type="button" onClick={() => setMethod("delivery")}
          className={`px-3 py-2.5 rounded-xl border-2 text-sm font-semibold ${method === "delivery" ? "border-[#FE7223] bg-[#FE7223]/5 text-[#c2510a]" : "border-gray-200 text-gray-500"}`}>
          📦 Fiche d’inscription + livraison
        </button>
      </div>
      <div className="grid gap-3">
        <input className={input} placeholder="Prénom et nom" required value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
        <input className={input} type="tel" placeholder="WhatsApp (0X XX XX XX XX)" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
        <input className={input} type="email" placeholder="E-mail" required value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
        <input className={input} placeholder={method === "delivery" ? "Wilaya" : "Wilaya (optionnel)"} value={v.wilaya} onChange={(e) => setV({ ...v, wilaya: e.target.value })} />
        {method === "delivery" ? (
          <input className={input} placeholder="Adresse de livraison complète" required value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} />
        ) : null}
      </div>
      {method === "delivery" ? (
        <p className="text-xs text-gray-500 mt-2">📦 Vous recevrez votre fiche d’inscription (avec votre code d’accès) par la société de livraison, à régler à la réception.</p>
      ) : null}
      <label className="flex items-start gap-2 mt-3 text-sm text-gray-600 cursor-pointer">
        <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>J’accepte d’être recontactée par Arazzo Formation au sujet de mon inscription.</span>
      </label>
      {err ? <div className="mt-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-semibold px-4 py-3">{err}</div> : null}
      <button type="submit" disabled={busy} className="w-full mt-4 py-4 rounded-xl font-bold text-white text-lg bg-gradient-to-br from-[#FE7223] to-[#f2520a] disabled:opacity-60">
        {busy ? "Envoi…" : "Je veux m’inscrire"}
      </button>
      <p className="text-center text-xs text-gray-400 mt-3">Vos informations restent privées et servent à vous inscrire.</p>
    </form>
  );
}
