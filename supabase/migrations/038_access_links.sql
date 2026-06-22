-- 038 — Liens d'accès « maison » (domaine formation-arazzo.store, validité 48h)
-- Évite d'exposer l'URL/le token Supabase dans les emails et QR codes : on stocke
-- un token court côté Arazzo, et la route /acces/<token> mint un lien Supabase frais
-- à l'instant du clic (donc jamais expiré au clic) tant que le token maison est valide.
CREATE TABLE IF NOT EXISTS public.access_links (
  token       TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_to TEXT NOT NULL DEFAULT '/dashboard',
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_access_links_user ON public.access_links(user_id);
-- RLS activée sans policy → table accessible uniquement via la clé service role
-- (route serveur). Aucune lecture/écriture publique.
ALTER TABLE public.access_links ENABLE ROW LEVEL SECURITY;
