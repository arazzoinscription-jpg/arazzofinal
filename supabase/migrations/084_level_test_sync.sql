-- ─── LE TEST DE NIVEAU, POUSSÉ DEPUIS L'OS ──────────────────────────────────
--
-- Même principe que le présentiel (082/083) : l'OS POUSSE la définition du test
-- de niveau (questions, barème, niveaux, recommandations) dans Supabase ; la
-- landing l'affiche en POPUP, calcule le résultat, et enregistre le passage
-- (contact + réponses). L'OS RAPATRIE ces passages dans son CRM au clic
-- « Synchroniser » (le résultat/niveau y est recalculé, à l'identique).
--
-- Deux tables, dans le même esprit « moindre privilège » :
--   level_test_snapshots  la définition d'un test (une ligne par slug).
--   level_test_leads      un passage laissé sur le site (contact + réponses),
--                         en attente de rapatriement (synced_at IS NULL).
--
-- Lecture publique de l'instantané (le test s'affiche au public) ; dépôt public
-- d'un passage (INSERT seul, jamais lire/modifier). L'OS (arazzo_reader) écrit
-- l'instantané et lit/acquitte les passages.

CREATE TABLE IF NOT EXISTS public.level_test_snapshots (
  slug        text PRIMARY KEY,
  data        jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.level_test_leads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL,
  first_name   text,
  last_name    text,
  email        text,
  phone        text,
  city         text,
  answers      jsonb NOT NULL DEFAULT '{}'::jsonb,
  level_key    text,
  level_label  text,
  score        integer,
  lang         text,
  utm          jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  synced_at    timestamptz
);

CREATE INDEX IF NOT EXISTS level_test_leads_unsynced_idx
  ON public.level_test_leads (created_at)
  WHERE synced_at IS NULL;

ALTER TABLE public.level_test_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_test_leads     ENABLE ROW LEVEL SECURITY;

-- Droits de l'OS (rôle arazzo_reader) : écrit l'instantané, lit/acquitte les passages.
GRANT SELECT, INSERT, UPDATE ON public.level_test_snapshots TO arazzo_reader;
GRANT SELECT, UPDATE          ON public.level_test_leads     TO arazzo_reader;

-- Droits du site public (anon) : LIRE l'instantané, DÉPOSER un passage (INSERT seul).
GRANT SELECT ON public.level_test_snapshots TO anon, authenticated;
GRANT INSERT ON public.level_test_leads     TO anon, authenticated;

DO $$
BEGIN
  -- OS : tout sur l'instantané.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='level_test_snapshots' AND policyname='arazzo_reader_test_snapshots') THEN
    CREATE POLICY "arazzo_reader_test_snapshots" ON public.level_test_snapshots
      FOR ALL TO arazzo_reader USING (true) WITH CHECK (true);
  END IF;
  -- OS : lit + acquitte les passages.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='level_test_leads' AND policyname='arazzo_reader_test_leads_read') THEN
    CREATE POLICY "arazzo_reader_test_leads_read" ON public.level_test_leads
      FOR SELECT TO arazzo_reader USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='level_test_leads' AND policyname='arazzo_reader_test_leads_ack') THEN
    CREATE POLICY "arazzo_reader_test_leads_ack" ON public.level_test_leads
      FOR UPDATE TO arazzo_reader USING (true) WITH CHECK (true);
  END IF;
  -- Public : lecture de l'instantané.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='level_test_snapshots' AND policyname='anon_read_test_snapshots') THEN
    CREATE POLICY "anon_read_test_snapshots" ON public.level_test_snapshots
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
  -- Public : dépôt d'un passage (INSERT seul).
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='level_test_leads' AND policyname='anon_insert_test_leads') THEN
    CREATE POLICY "anon_insert_test_leads" ON public.level_test_leads
      FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

-- Se rejoue sans dommage.
