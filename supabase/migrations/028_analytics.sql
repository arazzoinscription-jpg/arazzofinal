-- 028 — Statistiques de visites du site (analytics)
-- À exécuter dans Supabase → SQL Editor (ou `supabase db push`).
-- Le traçage écrit via le service role (API /api/track) ; la lecture est réservée à l'admin.

CREATE TABLE IF NOT EXISTS public.page_visits (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id   TEXT,                       -- regroupe les pages d'une même visite
  path         TEXT NOT NULL,              -- chemin visité (ex. /formations)
  referrer     TEXT,                       -- référent externe (null si interne/direct)
  source       TEXT,                       -- 'google','facebook','direct','internal',…
  user_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  duration_sec INTEGER NOT NULL DEFAULT 0, -- temps passé sur la page (secondes)
  device       TEXT,                       -- 'mobile' | 'desktop'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pv_created  ON public.page_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_pv_path     ON public.page_visits(path);
CREATE INDEX IF NOT EXISTS idx_pv_session  ON public.page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_pv_source   ON public.page_visits(source);

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- Lecture réservée aux administrateurs (l'écriture passe par le service role).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='page_visits' AND policyname='pv_admin_read'
  ) THEN
    CREATE POLICY "pv_admin_read" ON public.page_visits FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));
  END IF;
END $$;
