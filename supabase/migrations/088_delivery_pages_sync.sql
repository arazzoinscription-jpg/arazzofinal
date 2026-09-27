-- ─── DELIVERY PAGES : COURS GRATUITS, POUSSÉS DEPUIS ARAZZO OS ──────────────
--
-- Une « Delivery Page » livre un cours GRATUIT (vidéo Bunny, PDF facultatif,
-- formulaire de capture facultatif, bouton vers une offre payante) à l'adresse
-- `/free/[slug]`. Toutes les pages partagent UN SEUL modèle dynamique : on ne
-- code jamais une page par cours.
--
-- Même patron que le présentiel (082 + 083) et les inscriptions en ligne (087) :
-- l'OS est la source de configuration et POUSSE un instantané par page ; la page
-- publique le lit ; les prospects saisis sur la page sont déposés ici, puis
-- RAPATRIÉS dans le CRM de l'OS au clic « Synchroniser ».
--
-- Leçon de 083 appliquée d'emblée : la clé service-role n'est pas fiable côté
-- hébergement public (Vercel) → la page lit l'instantané et dépose le prospect
-- avec la clé ANON, sous des droits minimaux explicites.
--
-- Moindre privilège :
--   anon / authenticated : LIRE l'instantané (donnée publique) + DÉPOSER un
--                          prospect (INSERT seul — jamais lire ni modifier).
--   arazzo_reader (l'OS) : écrire l'instantané (upsert) + lire/acquitter les
--                          prospects. Jamais de DELETE.
--
-- 100 % ADDITIF : deux tables nouvelles, aucune table existante touchée.

-- ── 1. Les tables ──

-- L'INSTANTANÉ d'une page : exactement ce que renvoie `publicView(page)` côté OS
-- (titre, textes, couverture, vidéo, PDF, CTA, formulaire, statut `active`).
-- Une ligne par page déjà synchronisée ; l'OS la réécrit à chaque synchro.
-- Une page dépubliée/archivée n'est PAS supprimée : son instantané porte
-- `active = false` et la page publique affiche « pas ouverte ».
CREATE TABLE IF NOT EXISTS public.delivery_page_snapshots (
  slug        text PRIMARY KEY,
  data        jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Un PROSPECT laissé sur une page. Tant que `synced_at` est nul, il n'a pas
-- encore été importé dans le CRM de l'OS. On ne supprime rien : la trace reste.
CREATE TABLE IF NOT EXISTS public.delivery_page_leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL,
  full_name   text,
  phone       text,
  email       text,
  wilaya      text,
  consent     boolean NOT NULL DEFAULT false,
  lang        text,
  source      text,
  utm         jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  synced_at   timestamptz
);

-- L'OS ne lit que les prospects pas encore importés : index partiel.
CREATE INDEX IF NOT EXISTS delivery_page_leads_unsynced_idx
  ON public.delivery_page_leads (created_at)
  WHERE synced_at IS NULL;

-- ── 2. RLS ──
ALTER TABLE public.delivery_page_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_page_leads     ENABLE ROW LEVEL SECURITY;

-- ── 3. Droits de la page publique (anon) ──
GRANT SELECT ON public.delivery_page_snapshots TO anon, authenticated;
GRANT INSERT ON public.delivery_page_leads     TO anon, authenticated;

-- ── 4. Droits de l'OS (arazzo_reader) ──
GRANT SELECT, INSERT, UPDATE ON public.delivery_page_snapshots TO arazzo_reader;
GRANT SELECT, UPDATE          ON public.delivery_page_leads     TO arazzo_reader;

DO $$
BEGIN
  -- Instantané : lecture publique (c'est ce qui s'affiche sur la page).
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='delivery_page_snapshots' AND policyname='anon_read_delivery_snapshots') THEN
    CREATE POLICY "anon_read_delivery_snapshots" ON public.delivery_page_snapshots
      FOR SELECT TO anon, authenticated USING (true);
  END IF;

  -- Instantané : l'OS le lit et l'écrit (upsert). Pas de DELETE accordé.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='delivery_page_snapshots' AND policyname='arazzo_reader_delivery_snapshots') THEN
    CREATE POLICY "arazzo_reader_delivery_snapshots" ON public.delivery_page_snapshots
      FOR ALL TO arazzo_reader USING (true) WITH CHECK (true);
  END IF;

  -- Prospect : DÉPÔT public seul. Aucune policy SELECT/UPDATE pour anon → les
  -- coordonnées déposées ne sont jamais exposées publiquement.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='delivery_page_leads' AND policyname='anon_insert_delivery_leads') THEN
    CREATE POLICY "anon_insert_delivery_leads" ON public.delivery_page_leads
      FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;

  -- Prospect : l'OS le lit et l'acquitte (pose `synced_at`). Pas d'insert.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='delivery_page_leads' AND policyname='arazzo_reader_delivery_leads_read') THEN
    CREATE POLICY "arazzo_reader_delivery_leads_read" ON public.delivery_page_leads
      FOR SELECT TO arazzo_reader USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='delivery_page_leads' AND policyname='arazzo_reader_delivery_leads_ack') THEN
    CREATE POLICY "arazzo_reader_delivery_leads_ack" ON public.delivery_page_leads
      FOR UPDATE TO arazzo_reader USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 5. Se rejoue sans dommage ──
-- Tables en IF NOT EXISTS, grants ré-accordables, policies gardées par
-- IF NOT EXISTS. Une application interrompue se rattrape en relançant le tout.
--
-- ── 6. Retour arrière (si jamais nécessaire, À LA MAIN, après sauvegarde) ──
-- Ce module n'a aucune dépendance entrante : le retirer ne casse rien d'autre.
--   DROP TABLE IF EXISTS public.delivery_page_leads;      -- ⚠️ efface les prospects non importés
--   DROP TABLE IF EXISTS public.delivery_page_snapshots;  -- les pages /free/* affichent « pas ouverte »
--
-- ── 7. Vérification (après application) ──
--   SET ROLE arazzo_reader;
--   INSERT INTO public.delivery_page_snapshots (slug, data)
--     VALUES ('__test__', '{}'::jsonb)
--     ON CONFLICT (slug) DO UPDATE SET data = EXCLUDED.data, updated_at = now();  -- doit réussir
--   DELETE FROM public.delivery_page_snapshots WHERE slug = '__test__';           -- doit ÉCHOUER
--   RESET ROLE;
--   DELETE FROM public.delivery_page_snapshots WHERE slug = '__test__';           -- nettoyage (owner)
