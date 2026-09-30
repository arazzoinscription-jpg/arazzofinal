-- ─── GALERIE PHOTOS D'UN PACK / FORMATION ───────────────────────────────────
--
-- Photos téléversées dans le créateur de pack, affichées dans un carrousel en
-- en-tête de la page du pack (même principe que courses.gallery, migration 090).
-- Colonne optionnelle (tableau vide par défaut → aucun changement pour l'existant).

ALTER TABLE public.course_packs
  ADD COLUMN IF NOT EXISTS gallery text[] NOT NULL DEFAULT '{}';
