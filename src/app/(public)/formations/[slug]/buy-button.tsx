"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function BuyButton({
  courseId, courseTitre, prixDzd, prixEur, firstLessonId,
}: {
  courseId: string;
  courseTitre: string;
  prixDzd: number;
  prixEur: number;
  firstLessonId?: string;
}) {
  const supabase = createClient();
  const [state, setState] = useState<{ loading: boolean; isLoggedIn: boolean; isEnrolled: boolean }>({
    loading: true, isLoggedIn: false, isEnrolled: false,
  });
  const [pay, setPay] = useState<"dzd" | "eur" | null>(null);

  // Coupon
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<{ code: string; dzd: number; eur: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState("");

  // Vérifier connexion + inscription côté client (page en cache ISR)
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) setState({ loading: false, isLoggedIn: false, isEnrolled: false }); return; }
      const { data: enroll } = await supabase
        .from("enrollments").select("id").eq("user_id", user.id).eq("course_id", courseId).maybeSingle();
      if (active) setState({ loading: false, isLoggedIn: true, isEnrolled: !!enroll });
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function applyCoupon() {
    setCouponMsg("");
    if (!coupon.trim()) return;
    const res = await fetch("/api/coupons/validate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: coupon, amount: prixDzd }),
    });
    const d = await res.json();
    if (!d.valid) { setApplied(null); setCouponMsg(d.reason ?? "Coupon invalide"); return; }
    const dzdFinal = d.final as number;
    const eurDiscount = d.type === "percent" ? Math.round((prixEur * d.value) / 100) : Math.min(d.value, prixEur);
    setApplied({ code: d.code, dzd: dzdFinal, eur: Math.max(0, prixEur - eurDiscount) });
    setCouponMsg(`Coupon « ${d.code} » appliqué ✓`);
  }

  async function handleBuy(currency: "dzd" | "eur") {
    setPay(currency);
    try {
      const res = await fetch("/api/enroll", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, currency, couponCode: applied?.code }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setPay(null);
    } catch { setPay(null); }
  }

  if (state.loading) {
    return <div className="w-full py-3.5 rounded-xl bg-cream-100 animate-pulse" />;
  }

  if (state.isEnrolled) {
    return (
      <a href={firstLessonId ? `/dashboard/cours/${firstLessonId}` : "/dashboard"}
        className="block w-full bg-violet-DEFAULT text-white py-3.5 rounded-xl font-bold text-center hover:bg-violet-700 transition-colors">
        ▶ Accéder au cours
      </a>
    );
  }

  if (!state.isLoggedIn) {
    return (
      <a href="/register"
        className="block w-full bg-orange-DEFAULT text-white py-3.5 rounded-xl font-bold text-center hover:bg-orange-600 transition-colors">
        S'inscrire pour acheter
      </a>
    );
  }

  const dzd = applied?.dzd ?? prixDzd;
  const eur = applied?.eur ?? prixEur;

  return (
    <div className="space-y-3">
      {/* Coupon */}
      <div className="flex gap-2">
        <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Code promo"
          className="flex-1 border border-cream-200 rounded-xl px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-violet-500" />
        <button onClick={applyCoupon} className="text-sm font-semibold text-violet-DEFAULT border border-violet-200 px-3 rounded-xl hover:bg-violet-50">Appliquer</button>
      </div>
      {couponMsg && <p className={`text-xs ${applied ? "text-green-600" : "text-red-500"}`}>{couponMsg}</p>}

      <button onClick={() => handleBuy("dzd")} disabled={!!pay}
        className="w-full bg-orange-DEFAULT text-white py-3.5 rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
        {pay === "dzd" && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
        🇩🇿 Payer {dzd.toLocaleString("fr-DZ")} DA
        {applied && <span className="line-through opacity-70 text-sm">{prixDzd.toLocaleString("fr-DZ")}</span>}
      </button>
      <button onClick={() => handleBuy("eur")} disabled={!!pay}
        className="w-full border-2 border-violet-DEFAULT text-violet-DEFAULT py-3.5 rounded-xl font-bold hover:bg-violet-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
        {pay === "eur" && <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-DEFAULT border-t-transparent" />}
        🌍 Payer {eur}€ (Stripe)
      </button>
    </div>
  );
}
