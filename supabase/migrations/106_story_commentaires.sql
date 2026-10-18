-- ═══════════════════════════════════════════════════════════════════════════
-- 106 — COMMENTAIRES SUR LES STORIES
-- ───────────────────────────────────────────────────────────────────────────
-- • story_commentaires : les commentaires laissés sur une story (pendant ses
--   24 h, puis dans l'« Historique stories » du profil). Plusieurs par personne.
-- • Lus et écrits par le serveur uniquement (clé de service) : RLS activée,
--   aucune politique — personne ne lit la table directement depuis le navigateur.
-- • Une story supprimée emporte ses commentaires (ON DELETE CASCADE).
-- Aucune donnée existante n'est modifiée. Se rejoue sans dommage.
-- Prérequis : migration 099 (table stories).
--
-- Retour arrière :
--   DROP TABLE IF EXISTS public.story_commentaires;
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.story_commentaires (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  texte      TEXT NOT NULL CHECK (char_length(texte) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS story_commentaires_story_idx ON public.story_commentaires (story_id, created_at);

ALTER TABLE public.story_commentaires ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
