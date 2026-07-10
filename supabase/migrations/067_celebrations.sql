-- ─────────────────────────────────────────────────────────────────────────────
-- 067 — Célébrations (popup « Bravo » diffusé en temps réel à tous les élèves)
-- ─────────────────────────────────────────────────────────────────────────────
-- Une ligne = un événement de félicitation (diplôme obtenu). Les clients élèves
-- s'y abonnent en Realtime → popup + son. Pas de spam de notifications/push.

CREATE TABLE IF NOT EXISTS public.celebrations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,   -- pseudo (ou nom) de l'élève félicité
  course_titre TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.celebrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "celebrations_read" ON public.celebrations;
CREATE POLICY "celebrations_read" ON public.celebrations FOR SELECT TO authenticated USING (TRUE);

-- Active la diffusion Realtime pour cette table (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'celebrations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.celebrations;
  END IF;
END $$;
