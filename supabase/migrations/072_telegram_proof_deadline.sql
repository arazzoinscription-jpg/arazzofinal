-- ─────────────────────────────────────────────────────────────────────────────
-- 072 — Preuve Telegram : délai de 7 jours puis blocage du compte
-- ─────────────────────────────────────────────────────────────────────────────
-- `telegram_notified_at` = date de PREMIÈRE présentation du rappel à l'étudiante
-- importée (posée automatiquement à sa première visite du tableau de bord).
-- 7 jours plus tard, si aucune preuve n'a été envoyée, l'accès à l'espace est
-- bloqué jusqu'à l'envoi de la preuve finale.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS telegram_notified_at timestamptz;
