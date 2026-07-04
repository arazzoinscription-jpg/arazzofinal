-- ════════════════════════════════════════════════════════════════════════
-- 053 — Mois d'ouverture PERSONNALISÉ par module (abonnement par tranches)
-- ────────────────────────────────────────────────────────────────────────
-- Par défaut, le drip d'abonnement ouvre les chapitres à parts égales
-- (ceil(N/mois)). Cette colonne permet au formateur/admin de fixer EXACTEMENT
-- le mois d'ouverture d'un chapitre (module) — ex. mois 1 : modules 1→6,
-- mois 2 : 7→9, etc. NULL = découpe automatique (comportement inchangé).
-- Additif — s'applique aux abonnements cours ET pack (chapitres numérotés
-- globalement sur l'ensemble du pack).
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS unlock_month INTEGER;

-- ════════════════════════════════════════════════════════════════════════
-- Fin de la migration 053_chapter_unlock_month
-- ════════════════════════════════════════════════════════════════════════
