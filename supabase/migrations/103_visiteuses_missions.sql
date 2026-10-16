-- ═══════════════════════════════════════════════════════════════════════════
-- 103 — COMPTES SANS FORMATION (« visiteuses ») : validation + missions du feed
-- ───────────────────────────────────────────────────────────────────────────
-- Décision de l'école (2026-10-16) : un compte créé sur le site SANS formation
--   A. aime, commente, suit, réagit aux stories, répond aux questions et sondages ;
--   B. peut publier (vidéo, photo, story, défi) MAIS sa publication attend la
--      validation de l'équipe avant d'apparaître.
-- Et cinq missions sur le feed : bienvenue (cadeau), leçon d'essai, défi de la
-- semaine, « J'aimerais apprendre ce modèle », pastille « Visiteuse ».
--
-- • posts.a_valider / stories.a_valider : publication en attente de validation
--   (une story validée vit 24 h À PARTIR de la validation).
-- • defis : le défi couture de la semaine ; community_media.defi_id relie une
--   participation (une photo) à son défi.
-- • feed_envies : « J'aimerais apprendre ce modèle ». L'OS (rôle arazzo_reader)
--   les rapatrie dans son CRM au clic « Synchroniser » (synced_at).
-- • feed_missions : le cadeau de la mission de bienvenue, une fois débloqué,
--   reste acquis.
-- Aucune donnée existante n'est modifiée ; aucune contrainte existante n'est
-- touchée. Se rejoue sans dommage.
--
-- Retour arrière :
--   DROP TABLE IF EXISTS public.feed_missions; DROP TABLE IF EXISTS public.feed_envies;
--   ALTER TABLE public.community_media DROP COLUMN IF EXISTS defi_id; DROP TABLE IF EXISTS public.defis;
--   ALTER TABLE public.stories DROP COLUMN IF EXISTS a_valider;
--   ALTER TABLE public.posts DROP COLUMN IF EXISTS a_valider;
-- ═══════════════════════════════════════════════════════════════════════════

-- B. Publications en attente de validation.
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS a_valider BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS posts_a_valider_idx ON public.posts (created_at) WHERE a_valider;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS a_valider BOOLEAN NOT NULL DEFAULT false;

-- Mission 3 : le défi couture de la semaine.
CREATE TABLE IF NOT EXISTS public.defis (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre            TEXT NOT NULL CHECK (char_length(titre) BETWEEN 2 AND 120),
  consigne         TEXT NOT NULL DEFAULT '' CHECK (char_length(consigne) <= 1500),
  recompense       TEXT NOT NULL DEFAULT '' CHECK (char_length(recompense) <= 300),
  debut            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fin              TIMESTAMPTZ NOT NULL,
  gagnant_media_id UUID REFERENCES public.community_media(id) ON DELETE SET NULL,
  created_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT defis_dates CHECK (fin > debut)
);
CREATE INDEX IF NOT EXISTS defis_fin_idx ON public.defis (fin DESC);
ALTER TABLE public.community_media ADD COLUMN IF NOT EXISTS defi_id UUID REFERENCES public.defis(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS community_media_defi_idx ON public.community_media (defi_id) WHERE defi_id IS NOT NULL;

-- Mission 4 : « J'aimerais apprendre ce modèle » (une ligne par personne et par vidéo).
-- E-mail, nom et téléphone sont recopiés au moment du geste : l'OS relie l'envie à la bonne fiche.
CREATE TABLE IF NOT EXISTS public.feed_envies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  media_id       UUID NOT NULL REFERENCES public.community_media(id) ON DELETE CASCADE,
  email          TEXT,
  nom            TEXT,
  telephone      TEXT,
  titre          TEXT,
  niveau_suggere TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at      TIMESTAMPTZ,
  CONSTRAINT feed_envies_unique UNIQUE (user_id, media_id)
);
CREATE INDEX IF NOT EXISTS feed_envies_unsynced_idx ON public.feed_envies (created_at) WHERE synced_at IS NULL;

-- Mission 1 : le cadeau de bienvenue, une fois débloqué.
CREATE TABLE IF NOT EXISTS public.feed_missions (
  user_id    UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  cadeau_le  TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lecture / écriture par le serveur du site (clé de service) ; l'OS lit et acquitte les envies.
ALTER TABLE public.defis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_envies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_missions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'arazzo_reader') THEN
    GRANT SELECT, UPDATE ON public.feed_envies TO arazzo_reader;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='feed_envies' AND policyname='arazzo_reader_envies_read') THEN
      CREATE POLICY "arazzo_reader_envies_read" ON public.feed_envies FOR SELECT TO arazzo_reader USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='feed_envies' AND policyname='arazzo_reader_envies_ack') THEN
      CREATE POLICY "arazzo_reader_envies_ack" ON public.feed_envies FOR UPDATE TO arazzo_reader USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;
