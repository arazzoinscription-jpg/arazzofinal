-- ─── TEXTES DES LANDINGS, ÉDITÉS DANS L'OS ──────────────────────────────────
--
-- Même principe que 082/084/085 : l'OS POUSSE les textes d'interface des pages
-- publiques (titres, boutons, phrases), la landing les LIT et les applique
-- PAR-DESSUS ses textes par défaut. Un champ vide → le défaut est conservé.
--
--   landing_texts  une ligne par page (offres, formation, presentiel, pack,
--                  patrons, level-test…). `data` = { fr: {clé:texte}, ar: {…} }.
--
-- Lecture publique (les pages affichent ces textes) ; écriture réservée à l'OS
-- (rôle arazzo_reader). Aucune donnée détruite : additif, se rejoue sans dommage.

CREATE TABLE IF NOT EXISTS public.landing_texts (
  page        text PRIMARY KEY,
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_texts ENABLE ROW LEVEL SECURITY;

-- Droits de l'OS (rôle arazzo_reader) : écrit/actualise les textes.
GRANT SELECT, INSERT, UPDATE ON public.landing_texts TO arazzo_reader;

-- Droits du site public (anon) : LIRE les textes (aucune écriture).
GRANT SELECT ON public.landing_texts TO anon, authenticated;

DO $$
BEGIN
  -- OS : tout sur les textes.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='landing_texts' AND policyname='arazzo_reader_landing_texts') THEN
    CREATE POLICY "arazzo_reader_landing_texts" ON public.landing_texts
      FOR ALL TO arazzo_reader USING (true) WITH CHECK (true);
  END IF;
  -- Public : lecture seule.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='landing_texts' AND policyname='anon_read_landing_texts') THEN
    CREATE POLICY "anon_read_landing_texts" ON public.landing_texts
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

-- Se rejoue sans dommage.
