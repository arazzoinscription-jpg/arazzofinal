-- ─── JOURNAL DES E-MAILS : LE CONTENU, ET LA LECTURE PAR ARAZZO OS ──────────────
--
-- L'école veut UNE liste de TOUS les e-mails sortis de son système (LMS + OS), et pouvoir OUVRIR chacun pour voir son
-- contenu. `email_log` gardait le destinataire, l'objet et le statut, pas le contenu.
--
--   1. On ajoute le CONTENU (html, borné côté code à ~200 Ko) et l'expéditeur logique (`source`).
--   2. Arazzo OS (rôle `arazzo_reader`, le même que pour les autres synchros) peut LIRE ce journal — lecture seule.
-- Se rejoue sans dommage.

ALTER TABLE public.email_log ADD COLUMN IF NOT EXISTS html   text;
ALTER TABLE public.email_log ADD COLUMN IF NOT EXISTS source text;
CREATE INDEX IF NOT EXISTS idx_email_log_created ON public.email_log (created_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'arazzo_reader') THEN
    EXECUTE 'GRANT SELECT ON public.email_log TO arazzo_reader';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='email_log' AND policyname='arazzo_reader_email_log_read') THEN
      EXECUTE 'CREATE POLICY "arazzo_reader_email_log_read" ON public.email_log FOR SELECT TO arazzo_reader USING (true)';
    END IF;
  END IF;
END $$;
