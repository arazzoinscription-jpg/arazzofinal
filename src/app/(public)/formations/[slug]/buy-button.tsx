"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BuyButton({
  courseId,
  courseTitre,
  prixDzd,
  prixEur,
  isEnrolled,
  isLoggedIn,
  firstLessonId,
}: {
  courseId: string;
  courseTitre: string;
  prixDzd: number;
  prixEur: number;
  isEnrolled: boolean;
  isLoggedIn: boolean;
  firstLessonId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"dzd" | "eur" | null>(null);

  if (isEnrolled) {
    return (
      <a
        href={firstLessonId ? `/dashboard/cours/${firstLessonId}` : "/dashboard"}
        className="block w-full bg-violet-DEFAULT text-white py-3.5 rounded-xl font-bold text-center hover:bg-violet-700 transition-colors"
      >
        ▶ Accéder au cours
      </a>
    );
  }

  if (!isLoggedIn) {
    return (
      <a
        href="/register"
        className="block w-full bg-orange-DEFAULT text-white py-3.5 rounded-xl font-bold text-center hover:bg-orange-600 transition-colors"
      >
        S'inscrire pour acheter
      </a>
    );
  }

  async function handleBuy(currency: "dzd" | "eur") {
    setLoading(currency);
    try {
      const res = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, currency }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => handleBuy("dzd")}
        disabled={!!loading}
        className="w-full bg-orange-DEFAULT text-white py-3.5 rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading === "dzd" ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : null}
        🇩🇿 Payer {prixDzd.toLocaleString("fr-DZ")} DA
      </button>
      <button
        onClick={() => handleBuy("eur")}
        disabled={!!loading}
        className="w-full border-2 border-violet-DEFAULT text-violet-DEFAULT py-3.5 rounded-xl font-bold hover:bg-violet-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading === "eur" ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-DEFAULT border-t-transparent" />
        ) : null}
        🌍 Payer {prixEur}€ (Stripe)
      </button>
    </div>
  );
}
