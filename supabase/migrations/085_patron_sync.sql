-- ─── LES PATRONS, VITRINE POUSSÉE + COMMANDES RAPATRIÉES ────────────────────
--
-- Même pattern que le présentiel (082/083) et le test (084). La page publique
-- des patrons du site devient identique à la vitrine de l'OS :
--   • l'OS POUSSE la vitrine curée (hero + grille + réglages) dans
--     `patron_landing_snapshot` (une ligne) ;
--   • le site AFFICHE cette vitrine, et l'achat/la demande sur-mesure DÉPOSENT
--     une commande dans `patron_order_leads` / `patron_custom_order_leads` ;
--   • l'OS RAPATRIE ces commandes au clic « Synchroniser » (il crée la vraie
--     commande dans son système, avec la preuve), et l'école valide dans l'OS.
--
-- Lecture publique de la vitrine + dépôt public d'une commande (INSERT seul).
-- L'OS (arazzo_reader) écrit la vitrine et lit/acquitte les commandes. La preuve
-- de paiement va dans un bucket PUBLIC `patron-proofs` (URL visible depuis l'OS).

-- ── Tables ──
CREATE TABLE IF NOT EXISTS public.patron_landing_snapshot (
  id          text PRIMARY KEY DEFAULT 'default',
  data        jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.patron_order_leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patron_id   text NOT NULL,
  format      text NOT NULL DEFAULT 'pdf',
  first_name  text,
  email       text,
  phone       text,
  address     text,
  city        text,
  sizes       jsonb NOT NULL DEFAULT '[]'::jsonb,
  placement   jsonb,
  proof_url   text,
  amount      integer,
  method      text,
  lang        text,
  utm         jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  synced_at   timestamptz
);

CREATE TABLE IF NOT EXISTS public.patron_custom_order_leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name  text,
  email       text,
  phone       text,
  photo_url   text,
  message     text,
  patron_id   text,
  lang        text,
  utm         jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  synced_at   timestamptz
);

CREATE INDEX IF NOT EXISTS patron_order_leads_unsynced_idx
  ON public.patron_order_leads (created_at) WHERE synced_at IS NULL;
CREATE INDEX IF NOT EXISTS patron_custom_order_leads_unsynced_idx
  ON public.patron_custom_order_leads (created_at) WHERE synced_at IS NULL;

ALTER TABLE public.patron_landing_snapshot      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patron_order_leads           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patron_custom_order_leads    ENABLE ROW LEVEL SECURITY;

-- ── Droits OS (arazzo_reader) ──
GRANT SELECT, INSERT, UPDATE ON public.patron_landing_snapshot   TO arazzo_reader;
GRANT SELECT, UPDATE         ON public.patron_order_leads         TO arazzo_reader;
GRANT SELECT, UPDATE         ON public.patron_custom_order_leads  TO arazzo_reader;

-- ── Droits public (anon) ──
GRANT SELECT ON public.patron_landing_snapshot TO anon, authenticated;
GRANT INSERT ON public.patron_order_leads          TO anon, authenticated;
GRANT INSERT ON public.patron_custom_order_leads   TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patron_landing_snapshot' AND policyname='arazzo_reader_patron_snapshot') THEN
    CREATE POLICY "arazzo_reader_patron_snapshot" ON public.patron_landing_snapshot FOR ALL TO arazzo_reader USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patron_landing_snapshot' AND policyname='anon_read_patron_snapshot') THEN
    CREATE POLICY "anon_read_patron_snapshot" ON public.patron_landing_snapshot FOR SELECT TO anon, authenticated USING (true); END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patron_order_leads' AND policyname='arazzo_reader_patron_orders_read') THEN
    CREATE POLICY "arazzo_reader_patron_orders_read" ON public.patron_order_leads FOR SELECT TO arazzo_reader USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patron_order_leads' AND policyname='arazzo_reader_patron_orders_ack') THEN
    CREATE POLICY "arazzo_reader_patron_orders_ack" ON public.patron_order_leads FOR UPDATE TO arazzo_reader USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patron_order_leads' AND policyname='anon_insert_patron_orders') THEN
    CREATE POLICY "anon_insert_patron_orders" ON public.patron_order_leads FOR INSERT TO anon, authenticated WITH CHECK (true); END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patron_custom_order_leads' AND policyname='arazzo_reader_custom_read') THEN
    CREATE POLICY "arazzo_reader_custom_read" ON public.patron_custom_order_leads FOR SELECT TO arazzo_reader USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patron_custom_order_leads' AND policyname='arazzo_reader_custom_ack') THEN
    CREATE POLICY "arazzo_reader_custom_ack" ON public.patron_custom_order_leads FOR UPDATE TO arazzo_reader USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patron_custom_order_leads' AND policyname='anon_insert_custom') THEN
    CREATE POLICY "anon_insert_custom" ON public.patron_custom_order_leads FOR INSERT TO anon, authenticated WITH CHECK (true); END IF;
END $$;

-- ── Bucket public pour la preuve de paiement ──
INSERT INTO storage.buckets (id, name, public)
VALUES ('patron-proofs', 'patron-proofs', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  -- Dépôt public (INSERT) de la preuve dans ce bucket ; lecture publique
  -- automatique (bucket public). Nom de fichier en UUID → non devinable.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='anon_insert_patron_proofs') THEN
    CREATE POLICY "anon_insert_patron_proofs" ON storage.objects
      FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'patron-proofs'); END IF;
END $$;

-- Se rejoue sans dommage.
