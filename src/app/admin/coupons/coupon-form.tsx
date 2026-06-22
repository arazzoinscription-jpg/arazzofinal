"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCoupon, toggleCoupon } from "./actions";

export function CouponForm() {
  const router = useRouter();
  const [form, setForm] = useState({ code: "", type: "percent" as "percent" | "fixed", value: "", max_uses: "", expires_at: "" });
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await createCoupon({
        code: form.code, type: form.type, value: Number(form.value),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
      });
      if (res.ok) { setMsg({ ok: true, text: "Coupon créé ✓" }); setForm({ code: "", type: "percent", value: "", max_uses: "", expires_at: "" }); router.refresh(); }
      else setMsg({ ok: false, text: res.error ?? "Erreur" });
    });
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 space-y-4">
      <h2 className="font-playfair text-xl font-bold text-gray-900">Nouveau coupon</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Code *</label>
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required placeholder="RAMADAN25"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 uppercase focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white">
              <option value="percent">% remise</option><option value="fixed">Montant fixe</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Valeur *</label>
            <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required placeholder={form.type === "percent" ? "25" : "1000"}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Utilisations max (optionnel)</label>
          <input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="illimité"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiration (optionnel)</label>
          <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5" />
        </div>
      </div>
      {msg && <p className={`text-sm px-4 py-2.5 rounded-xl ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{msg.text}</p>}
      <button type="submit" disabled={isPending} className="bg-orange-DEFAULT text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50">
        {isPending ? "Création…" : "Créer le coupon"}
      </button>
    </form>
  );
}

export function ToggleCoupon({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(active);
  const [isPending, startTransition] = useTransition();
  return (
    <button onClick={() => { const n = !on; setOn(n); startTransition(async () => { const r = await toggleCoupon(id, n); if (!r.ok) setOn(!n); else router.refresh(); }); }}
      disabled={isPending}
      className={`text-xs font-semibold px-3 py-1 rounded-lg ${on ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
      {on ? "Actif" : "Inactif"}
    </button>
  );
}
