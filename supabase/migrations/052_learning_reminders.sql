-- ════════════════════════════════════════════════════════════════════════
-- 052 — Relances pédagogiques par email (progression des leçons)
-- ────────────────────────────────────────────────────────────────────────
-- Journal anti-doublon des relances envoyées à l'élève :
--   • 'continue' : la vidéo d'une leçon est commencée mais pas terminée
--                  (« Continuez votre cours, vous y êtes presque ! »).
--   • 'practical': la leçon est terminée et a un devoir, mais l'élève n'a pas
--                  encore envoyé son travail pratique (« Envoyez votre travail »).
-- Chaque (user, lesson, kind) n'est envoyé qu'UNE fois (contrainte UNIQUE).
-- Additif — table interne, aucune policy (accès service-role via le cron).
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.learning_reminders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id  UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('continue','practical')),
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lesson_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_learning_reminders_user ON public.learning_reminders(user_id);

ALTER TABLE public.learning_reminders ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════════════
-- Fin de la migration 052_learning_reminders
-- ════════════════════════════════════════════════════════════════════════
