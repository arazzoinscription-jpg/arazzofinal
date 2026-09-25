"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Point d'entrée des liens d'accès /acces (réinitialisation de mot de passe,
 * accès « paiement à la livraison », etc.).
 *
 * Le lien magique Supabase produit par `admin.generateLink` délivre la session
 * dans le FRAGMENT d'URL (#access_token=…&refresh_token=…) — flux « implicite ».
 * Or le client @supabase/ssr est en flux PKCE : il ne lit QUE `?code=`, jamais
 * le hash. Une route SERVEUR (comme /auth/callback) ne peut donc pas récupérer
 * ces jetons — le `#` n'atteint jamais le serveur — et renvoyait l'élève vers
 * /login. Cette page CLIENT lit le fragment, ouvre la session (cookies sb-*),
 * puis redirige vers `next`.
 */
export default function EntrerPage() {
  useEffect(() => {
    // On capture le fragment et la query AVANT de créer le client : selon la
    // config, `detectSessionInUrl` peut consommer/effacer le hash de façon
    // asynchrone, ce qui nous ferait rater les jetons.
    const rawHash = window.location.hash.replace(/^#/, "");
    const rawSearch = window.location.search;
    const supabase = createClient();
    const fail = () => window.location.replace("/login?error=lien_expire");

    (async () => {
      const qp = new URLSearchParams(rawSearch);
      const nextParam = qp.get("next");
      const next = nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";
      const hp = new URLSearchParams(rawHash);

      // 1) Erreur transmise par Supabase (lien consommé / expiré)
      if (hp.get("error") || qp.get("error")) return fail();

      // 2) Jetons dans le fragment (flux implicite — cas des liens /acces)
      const access_token = hp.get("access_token");
      const refresh_token = hp.get("refresh_token");
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        return error ? fail() : window.location.replace(next);
      }

      // 3) Code PKCE dans la query (?code=) — filet de sécurité
      const code = qp.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        return error ? fail() : window.location.replace(next);
      }

      // 4) Session déjà active (ou posée par l'auto-détection) ?
      const { data } = await supabase.auth.getSession();
      if (data.session) return window.location.replace(next);

      // 5) Dernier recours : l'auto-détection peut être asynchrone → on réessaie.
      setTimeout(async () => {
        const { data: d2 } = await supabase.auth.getSession();
        return d2.session ? window.location.replace(next) : fail();
      }, 500);
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-DEFAULT px-4">
      <p className="text-sm text-gray-500 flex items-center gap-2">
        <Loader2 size={16} className="animate-spin" /> Connexion en cours…
      </p>
    </div>
  );
}
