-- ─────────────────────────────────────────────────────────────────────────────
-- 064 — Notifications push silencieuses (préférence par utilisateur)
-- ─────────────────────────────────────────────────────────────────────────────
-- push_silent = TRUE → les push arrivent SANS son ni vibration (bannière discrète).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS push_silent BOOLEAN NOT NULL DEFAULT FALSE;
