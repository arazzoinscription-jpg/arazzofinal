-- ─────────────────────────────────────────────────────────────────────────────
-- 075 — Projet de fin de stage (déclenche le cadeau « Espace Atelier »)
-- ─────────────────────────────────────────────────────────────────────────────
-- L'étudiante téléverse des photos / vidéos de son projet de fin de stage.
-- La validation de ce projet débloque plus tard l'« Espace Atelier » (1 an
-- offert). Pour l'instant on stocke seulement les médias envoyés + un statut.

CREATE TABLE IF NOT EXISTS public.final_project_media (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('image', 'video')),
  url         text NOT NULL,                 -- URL publique (bucket « posts »)
  path        text NOT NULL,                 -- chemin dans le bucket
  status      text NOT NULL DEFAULT 'submitted', -- submitted | approved | rejected
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_final_project_user ON public.final_project_media(user_id);

ALTER TABLE public.final_project_media ENABLE ROW LEVEL SECURITY;
-- Accès via service role (Server Actions) uniquement.
