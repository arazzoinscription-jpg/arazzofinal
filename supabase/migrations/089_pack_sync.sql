-- ─── LES PACKS COMPOSÉS DANS L'OS, POUSSÉS VERS LE LMS ──────────────────────
--
-- Certains packs (ex. « pack-couture-1-2 ») sont COMPOSÉS dans Arazzo OS
-- (PackConfigRepository, .local/packs.json) et non dans la table `course_packs`
-- du LMS. Le site ne les connaît donc pas. Cette table reçoit un INSTANTANÉ de
-- ces packs (slug, nom, cours membres, prix) poussé au clic « Synchroniser ».
-- La page `/pack/[slug]` les lit et les affiche comme une landing en ligne ; le
-- paiement (CCP/BaridiMob + preuve) remonte dans l'OS (via `level = slug du pack`,
-- que l'OS sait résoudre en plusieurs cours).
--
-- Lecture publique (le pack s'affiche au public). L'OS (arazzo_reader) écrit.

CREATE TABLE IF NOT EXISTS public.pack_snapshots (
  slug        text PRIMARY KEY,
  data        jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pack_snapshots ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.pack_snapshots TO arazzo_reader;
GRANT SELECT ON public.pack_snapshots TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='pack_snapshots' AND policyname='arazzo_reader_pack_snapshots') THEN
    CREATE POLICY "arazzo_reader_pack_snapshots" ON public.pack_snapshots
      FOR ALL TO arazzo_reader USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='pack_snapshots' AND policyname='anon_read_pack_snapshots') THEN
    CREATE POLICY "anon_read_pack_snapshots" ON public.pack_snapshots
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;
