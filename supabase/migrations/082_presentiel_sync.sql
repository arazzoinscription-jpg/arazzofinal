-- ─── LE PRÉSENTIEL, POUSSÉ DEPUIS ARAZZO OS ─────────────────────────────────
--
-- La landing présentielle (`/presentiel/[slug]`) doit vivre 24/7 sur Vercel,
-- SANS tunnel, tout en montrant les VRAIES places réservées et les groupes —
-- des données qui vivent dans Arazzo OS (le CRM présentiel). Le LMS ne peut pas
-- interroger l'OS en direct (ce serait re-dépendre du tunnel bloqué).
--
-- La solution : l'OS POUSSE un instantané ici, sur commande (bouton
-- « Synchroniser »). La landing lit cet instantané. Les prospects saisis sur la
-- landing sont écrits ici, puis RAPATRIÉS dans le CRM de l'OS au même clic.
--
-- Deux tables, dans le même esprit « moindre privilège » que les migrations
-- 079-081 : le rôle `arazzo_reader` (celui qu'utilise l'OS) reçoit juste ce
-- qu'il faut — écrire l'instantané, lire et acquitter les prospects. Le service
-- role du LMS (server components, server actions) contourne la RLS et gère la
-- lecture publique de l'instantané + l'écriture des prospects.

-- ── 1. Les tables ──

-- L'INSTANTANÉ d'une offre : exactement ce que renvoie `publicOfferView(slug)`
-- côté OS (places, groupes ouverts, formules, centre, textes bilingues…). Une
-- ligne par offre active. L'OS la réécrit à chaque synchro (upsert sur `slug`).
CREATE TABLE IF NOT EXISTS public.presentiel_snapshots (
  slug        text PRIMARY KEY,
  data        jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Un PROSPECT laissé sur la landing. Il attend d'être rapatrié dans le CRM de
-- l'OS : tant que `synced_at` est nul, il n'a pas encore été importé. L'OS le
-- lit, crée/enrichit la fiche CRM (dédupliquée de son côté), puis pose
-- `synced_at`. On ne supprime rien ici : la trace reste.
CREATE TABLE IF NOT EXISTS public.presentiel_leads (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text NOT NULL,
  first_name     text,
  phone          text,
  email          text,
  city           text,
  availabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  formula_id     text,
  message        text,
  consent        boolean NOT NULL DEFAULT false,
  lang           text,
  source         text,
  utm            jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  synced_at      timestamptz
);

-- L'OS ne lit que les prospects pas encore importés : un index partiel garde
-- cette lecture rapide même quand la table grossit.
CREATE INDEX IF NOT EXISTS presentiel_leads_unsynced_idx
  ON public.presentiel_leads (created_at)
  WHERE synced_at IS NULL;

-- ── 2. RLS ──
-- Activée sur les deux tables. Le service role du LMS la contourne (lecture
-- publique de l'instantané côté serveur, écriture des prospects). Seul
-- `arazzo_reader` (l'OS, via PostgREST) est soumis aux politiques ci-dessous.
ALTER TABLE public.presentiel_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentiel_leads     ENABLE ROW LEVEL SECURITY;

-- ── 3. Les droits de l'OS (rôle arazzo_reader) ──
-- L'OS ÉCRIT l'instantané (upsert = INSERT + UPDATE + SELECT) et LIT/ACQUITTE
-- les prospects (SELECT + UPDATE de `synced_at`). Il n'INSÈRE jamais de
-- prospect (c'est la landing qui le fait) et ne SUPPRIME rien.
GRANT SELECT, INSERT, UPDATE ON public.presentiel_snapshots TO arazzo_reader;
GRANT SELECT, UPDATE          ON public.presentiel_leads     TO arazzo_reader;

DO $$
BEGIN
  -- Instantané : l'OS peut tout faire (lire/écrire) sur cette table de travail.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='presentiel_snapshots' AND policyname='arazzo_reader_snapshots') THEN
    CREATE POLICY "arazzo_reader_snapshots" ON public.presentiel_snapshots
      FOR ALL TO arazzo_reader
      USING (true) WITH CHECK (true);
  END IF;

  -- Prospects : l'OS les lit et les acquitte (pose `synced_at`). Pas d'insert.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='presentiel_leads' AND policyname='arazzo_reader_leads_read') THEN
    CREATE POLICY "arazzo_reader_leads_read" ON public.presentiel_leads
      FOR SELECT TO arazzo_reader USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='presentiel_leads' AND policyname='arazzo_reader_leads_ack') THEN
    CREATE POLICY "arazzo_reader_leads_ack" ON public.presentiel_leads
      FOR UPDATE TO arazzo_reader USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 4. Ce fichier se rejoue sans dommage ──
-- Tables en `IF NOT EXISTS`, grants ré-accordables, politiques gardées par
-- `IF NOT EXISTS`. Une application interrompue se rattrape en relançant le tout.
--
-- ── 5. Vérification (après application) ──
--
--   SET ROLE arazzo_reader;
--   -- doit réussir (upsert de l'instantané) :
--   INSERT INTO public.presentiel_snapshots (slug, data)
--     VALUES ('__test__', '{}'::jsonb)
--     ON CONFLICT (slug) DO UPDATE SET data = EXCLUDED.data, updated_at = now();
--   SELECT slug FROM public.presentiel_snapshots WHERE slug = '__test__';  -- 1 ligne
--   DELETE FROM public.presentiel_snapshots WHERE slug = '__test__';       -- doit ÉCHOUER (pas de DELETE)
--   RESET ROLE;
--   DELETE FROM public.presentiel_snapshots WHERE slug = '__test__';       -- nettoyage (owner)
