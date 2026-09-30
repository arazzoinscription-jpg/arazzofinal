-- ─── ORDRE DES COURS DANS UN PACK / UNE FORMATION ──────────────────────────
--
-- Permet de ranger les cours d'un pack dans une séquence précise (parcours :
-- ex. Niveau 1 = robe d'intérieur → … → pantalons). Colonne optionnelle
-- (0 par défaut → aucun changement pour les packs existants).

ALTER TABLE public.course_pack_items
  ADD COLUMN IF NOT EXISTS ordre integer NOT NULL DEFAULT 0;
