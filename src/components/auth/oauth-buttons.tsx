"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z" />
    <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33Z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
  </svg>
);

const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" aria-hidden>
    <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
  </svg>
);

/** Boutons « Continuer avec Google / Facebook » — connexion ET inscription en un clic. */
export function OAuthButtons({ next = "/dashboard" }: { next?: string }) {
  const [loading, setLoading] = useState<"google" | "facebook" | null>(null);

  async function signIn(provider: "google" | "facebook") {
    setLoading(provider);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    // La redirection vers le provider OAuth a lieu ; setLoading reste actif jusqu'au départ de la page.
  }

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <button type="button" onClick={() => signIn("google")} disabled={loading !== null}
        className="inline-flex items-center justify-center gap-2 border-2 border-cream-200 bg-white text-violet-950/80 font-semibold py-2.5 rounded-xl hover:border-violet-300 hover:bg-cream-50 transition-colors disabled:opacity-60 text-sm">
        <GoogleIcon /> Google
      </button>
      <button type="button" onClick={() => signIn("facebook")} disabled={loading !== null}
        className="inline-flex items-center justify-center gap-2 border-2 border-cream-200 bg-white text-violet-950/80 font-semibold py-2.5 rounded-xl hover:border-violet-300 hover:bg-cream-50 transition-colors disabled:opacity-60 text-sm">
        <FacebookIcon /> Facebook
      </button>
    </div>
  );
}
