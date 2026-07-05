-- ─────────────────────────────────────────────────────────────────────────────
-- 056 — Rôles multiples (un compte peut cumuler formateur + patronniste + admin)
-- ─────────────────────────────────────────────────────────────────────────────
-- Avant : users.role = UN seul rôle → donner « formateur » à un patronniste
-- écrasait son rôle et lui faisait perdre son espace. On introduit un ENSEMBLE
-- de rôles (users.roles) additif. La colonne `role` reste le rôle « principal »
-- (le plus élevé) pour l'affichage et le routage par défaut.

-- 1) Colonne ensemble de rôles
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT ARRAY['eleve']::text[];

-- 2) Backfill : chaque compte reçoit au minimum 'eleve' + son rôle actuel
UPDATE public.users
SET roles = (
  SELECT ARRAY(
    SELECT DISTINCT r FROM unnest(ARRAY['eleve', role]) AS r WHERE r IS NOT NULL
  )
)
WHERE roles IS NULL OR roles = ARRAY['eleve']::text[] OR NOT (role = ANY(roles));

-- 3) Contrainte : valeurs autorisées dans l'ensemble
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_roles_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_roles_check CHECK (
    roles <@ ARRAY['eleve','formateur','patronniste','admin']::text[]
  );

-- 4) Index GIN pour les recherches « qui a le rôle X »
CREATE INDEX IF NOT EXISTS idx_users_roles ON public.users USING GIN (roles);

-- NB : la colonne `role` (rôle principal) est maintenue en synchro par le code
-- applicatif (priorité admin > formateur > patronniste > eleve) à chaque
-- changement de rôles. Les policies RLS existantes basées sur `role` restent
-- valides pour l'admin (le rôle principal d'un admin reste 'admin').
