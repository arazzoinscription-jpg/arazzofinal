-- ─────────────────────────────────────────────────────────────────────────────
-- 069 — Préférences ADMIN des emails par catégorie
-- ─────────────────────────────────────────────────────────────────────────────
-- L'admin choisit quels TYPES d'emails la plateforme envoie (page
-- /admin/preferences). JSONB catégorie → booléen ; catégorie absente = activée.
-- Vérifié au centre par sendEmail (src/lib/email.ts) avant tout envoi
-- (sauf emails critiques envoyés avec force: true).

ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS email_categories JSONB NOT NULL DEFAULT '{}'::jsonb;
