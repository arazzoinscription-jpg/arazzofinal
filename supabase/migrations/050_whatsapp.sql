-- ════════════════════════════════════════════════════════════════════════
-- 050 — Communication WhatsApp (bulle flottante + groupes des formations)
-- ────────────────────────────────────────────────────────────────────────
-- Additif et non destructif : n'ajoute que des colonnes manquantes.
--  1) users.whatsapp                → numéro WhatsApp du formateur (contact 1:1)
--  2) platform_config.whatsapp_*    → numéro admin + message par défaut + on/off
--  3) groups.whatsapp_link/disabled → lien d'invitation du groupe de formation
-- La sécurité repose sur les RLS existantes : la résolution du numéro d'un
-- formateur et la lecture des liens de groupe se font côté serveur via le
-- client service-role (voir src/lib/whatsapp-server.ts), et les pages qui
-- exposent un lien de groupe vérifient déjà l'appartenance / la propriété.
-- ════════════════════════════════════════════════════════════════════════

-- ─── 1) Numéro WhatsApp du formateur ─────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- ─── 2) Configuration WhatsApp de l'administrateur (singleton platform_config) ─
ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS whatsapp_admin_number    TEXT;
ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS whatsapp_default_message TEXT;
ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS whatsapp_bubble_enabled  BOOLEAN NOT NULL DEFAULT TRUE;

-- ─── 3) Lien du groupe WhatsApp de la formation ──────────────────────────────
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS whatsapp_link     TEXT;
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS whatsapp_disabled BOOLEAN NOT NULL DEFAULT FALSE;

-- ════════════════════════════════════════════════════════════════════════
-- Fin de la migration 050_whatsapp
-- ════════════════════════════════════════════════════════════════════════
