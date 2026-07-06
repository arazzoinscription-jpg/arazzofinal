-- ─────────────────────────────────────────────────────────────────────────────
-- 059 — Liens d'accès à usage unique (SEC-003)
-- ─────────────────────────────────────────────────────────────────────────────
-- Les liens de RÉINITIALISATION de mot de passe doivent être à usage unique et
-- de courte durée. Les liens de livraison/onboarding (fiches physiques) restent
-- durables et réutilisables → on distingue les deux via une colonne `single_use`.
ALTER TABLE public.access_links
  ADD COLUMN IF NOT EXISTS single_use BOOLEAN NOT NULL DEFAULT FALSE;
