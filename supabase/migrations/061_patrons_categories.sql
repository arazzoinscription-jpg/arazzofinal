-- ─────────────────────────────────────────────────────────────────────────────
-- 061 — Catégories patrons : genre + type de vêtement (comme un site de mode)
-- ─────────────────────────────────────────────────────────────────────────────
-- Remplace le filtrage fragile par mots-clés par de vraies colonnes structurées.
-- Les patrons non encore taggés (colonnes NULL) restent filtrables : le code
-- applicatif infère leur catégorie par mots-clés en repli (voir patron-categories.ts).

ALTER TABLE public.patrons
  ADD COLUMN IF NOT EXISTS genre         TEXT,   -- femme | homme | enfant | mixte
  ADD COLUMN IF NOT EXISTS type_vetement TEXT;   -- robe | jupe | pantalon | haut | veste | ensemble | traditionnel | accessoire

ALTER TABLE public.patrons DROP CONSTRAINT IF EXISTS patrons_genre_check;
ALTER TABLE public.patrons
  ADD CONSTRAINT patrons_genre_check
  CHECK (genre IS NULL OR genre IN ('femme', 'homme', 'enfant', 'mixte'));

ALTER TABLE public.patrons DROP CONSTRAINT IF EXISTS patrons_type_vetement_check;
ALTER TABLE public.patrons
  ADD CONSTRAINT patrons_type_vetement_check
  CHECK (type_vetement IS NULL OR type_vetement IN
    ('robe', 'jupe', 'pantalon', 'haut', 'veste', 'ensemble', 'traditionnel', 'accessoire'));

CREATE INDEX IF NOT EXISTS idx_patrons_genre ON public.patrons(genre);
CREATE INDEX IF NOT EXISTS idx_patrons_type  ON public.patrons(type_vetement);
