-- ═══════════════════════════════════════════════════════════════════════════
-- 102 — STORIES CRÉATIVES (comme Instagram) : calques, vues, interactions
-- ───────────────────────────────────────────────────────────────────────────
-- • stories.calques : ce qui est posé SUR la story (JSON) — texte, dessin,
--   autocollants, question, sondage, compte à rebours, lien. Affiché par-dessus
--   la photo / la vidéo (jamais « incrusté » : la vidéo reste lisible).
-- • stories « texte seul » : media_kind 'texte' + couleur de fond (stories.fond).
-- • story_vues : qui a vu (visible de l'autrice uniquement).
-- • story_interactions : réponses aux questions, votes aux sondages, réactions.
-- Aucune donnée existante n'est modifiée. Se rejoue sans dommage.
-- Prérequis : migration 099 (table stories).
--
-- Retour arrière :
--   DROP TABLE IF EXISTS public.story_interactions; DROP TABLE IF EXISTS public.story_vues;
--   ALTER TABLE public.stories DROP COLUMN IF EXISTS calques, DROP COLUMN IF EXISTS fond;
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS calques JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS fond TEXT;

-- Stories « texte seul » (sans photo ni vidéo) : on élargit les deux règles.
ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_media_kind_check;
ALTER TABLE public.stories ADD CONSTRAINT stories_media_kind_check CHECK (media_kind IN ('image', 'video', 'texte'));
ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_media;
ALTER TABLE public.stories ADD CONSTRAINT stories_media
  CHECK (media_url IS NOT NULL OR bunny_video_id IS NOT NULL OR media_kind = 'texte');

CREATE TABLE IF NOT EXISTS public.story_vues (
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vue_le   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (story_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.story_interactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  -- Le calque visé (question / sondage) ; '' pour une réaction à la story entière.
  calque_id  TEXT NOT NULL DEFAULT '',
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('reponse', 'vote', 'reaction')),
  valeur     TEXT NOT NULL CHECK (char_length(valeur) BETWEEN 1 AND 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Une réponse, un vote ou une réaction par personne et par calque (la dernière remplace).
  CONSTRAINT story_interactions_unique UNIQUE (story_id, calque_id, user_id, kind)
);
CREATE INDEX IF NOT EXISTS story_interactions_story_idx ON public.story_interactions (story_id, kind);

-- Lecture / écriture par le serveur uniquement (clé de service).
ALTER TABLE public.story_vues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_interactions ENABLE ROW LEVEL SECURITY;
