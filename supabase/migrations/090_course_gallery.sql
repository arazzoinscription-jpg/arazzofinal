-- ─── GALERIE PHOTOS D'UN COURS ──────────────────────────────────────────────
--
-- Photos téléversées depuis l'outil d'édition du cours (/formateur/cours/<id>/edit),
-- affichées dans un carrousel en en-tête de la page publique du cours
-- (/formations/<slug>). Même principe que la galerie des patrons (migration 017,
-- colonne `images`).
--
-- Colonne unique, optionnelle (tableau vide par défaut → aucun changement pour
-- les cours existants) :
--   gallery  liste ordonnée d'URLs d'images (stockées dans le bucket public `posts`).

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS gallery text[] NOT NULL DEFAULT '{}';
