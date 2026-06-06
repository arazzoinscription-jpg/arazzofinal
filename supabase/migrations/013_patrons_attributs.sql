-- ─────────────────────────────────────────────────────────────────────────────
-- 013 — Attributs des patrons + visuels d'aperçu
-- Ajoute des caractéristiques (tailles, tissu conseillé, table des mesures…)
-- et renseigne une image d'aperçu pour chaque patron.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.patrons
  ADD COLUMN IF NOT EXISTS tailles      TEXT,                          -- ex. « 34 – 52 »
  ADD COLUMN IF NOT EXISTS tissu        TEXT,                          -- ex. « Crêpe · satin · gabardine »
  ADD COLUMN IF NOT EXISTS taille_table TEXT,                          -- description de la table des mesures
  ADD COLUMN IF NOT EXISTS nb_pages     INTEGER,                       -- nombre de pages du PDF
  ADD COLUMN IF NOT EXISTS format       TEXT DEFAULT 'PDF A4 + A0';    -- formats d'impression inclus

-- 1) Image d'aperçu : affecte les 26 visuels (/images/patrons/N.png) de façon cyclique
--    aux patrons qui n'en ont pas encore.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
  FROM public.patrons
)
UPDATE public.patrons p
SET preview_url = '/images/patrons/' || (((r.rn - 1) % 26) + 1)::text || '.png'
FROM ranked r
WHERE p.id = r.id
  AND (p.preview_url IS NULL OR p.preview_url = '');

-- 2) Attributs par défaut (le formateur pourra les affiner ensuite).
UPDATE public.patrons SET
  tailles      = COALESCE(NULLIF(tailles, ''),      '34 – 52'),
  tissu        = COALESCE(NULLIF(tissu, ''),        'Crêpe · satin · gabardine · coton'),
  taille_table = COALESCE(NULLIF(taille_table, ''), 'Tableau des mesures inclus : tour de poitrine, tour de taille, tour de hanches, hauteur.'),
  nb_pages     = COALESCE(nb_pages, 24),
  format       = COALESCE(NULLIF(format, ''),       'PDF A4 + A0 (impression maison & traceur)');
