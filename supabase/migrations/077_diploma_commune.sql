-- ─────────────────────────────────────────────────────────────────────────────
-- 077 — Commune de livraison du diplôme
-- La feuille XLSX exigée par la société de livraison (modèle model_v5.1) a une
-- colonne « commune (nom) » obligatoire, à côté de « wilaya (nom) ».
-- Wilaya + commune sont saisies par l'élève via des listes déroulantes basées sur
-- les noms officiels (src/lib/algeria/wilayas.ts).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.diplomas
  ADD COLUMN IF NOT EXISTS commune TEXT;
