-- 046 — « Devoir à faire » par leçon
-- Ajoute une consigne de devoir au niveau de chaque leçon (affichée sous la vidéo,
-- au-dessus de la zone « Travaux pratiques »). Distincte du devoir global du cours
-- (colonne courses.homework, migration 027).

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS devoir TEXT;
