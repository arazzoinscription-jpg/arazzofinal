-- ════════════════════════════════════════════════════════════════════════
-- 049 — Prospects : suivi des inscrits sans commande + séquence d'emails
-- ────────────────────────────────────────────────────────────────────────
-- Ajout INCRÉMENTAL et non destructif. Ne touche NI aux tables existantes
-- (hors ajout de colonnes manquantes), NI au trigger handle_new_user.
--
--  1) email_preferences += `prospect`  → opt-out de la séquence marketing.
--  2) prospect_sequence               → état de la séquence par utilisateur
--     (créé à la volée par le moteur / à l'inscription — jamais rétroactif
--      grâce à prospect_settings.sequence_start_at).
--  3) prospect_settings (singleton)   → délais + sujets + HTML éditables,
--     signature, logo, promo, activation, borne de démarrage.
-- ════════════════════════════════════════════════════════════════════════

-- ─── 1) Opt-out séquence prospect (réutilise le système email_preferences) ───
ALTER TABLE public.email_preferences
  ADD COLUMN IF NOT EXISTS prospect BOOLEAN NOT NULL DEFAULT TRUE;

-- ─── 2) État de la séquence par utilisateur ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prospect_sequence (
  user_id                 UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  registration_source     TEXT NOT NULL DEFAULT 'direct',   -- direct | oauth | admin | import
  -- Horodatage d'envoi de chaque email (NULL = pas encore envoyé) → anti-doublon
  welcome_sent_at         TIMESTAMPTZ,
  reminder_2_sent_at      TIMESTAMPTZ,
  reminder_7_sent_at      TIMESTAMPTZ,
  reminder_14_sent_at     TIMESTAMPTZ,
  last_reminder_at        TIMESTAMPTZ,
  -- Conversion
  has_purchased           BOOLEAN NOT NULL DEFAULT FALSE,
  first_purchase_at       TIMESTAMPTZ,
  reminders_before_purchase INTEGER NOT NULL DEFAULT 0,     -- pour distinguer « Client » vs « Réactivé »
  -- Arrêt de séquence (achat OU suspension manuelle admin)
  sequence_stopped        BOOLEAN NOT NULL DEFAULT FALSE,
  stopped_reason          TEXT,                             -- purchased | manual | deleted
  -- Inactivité longue (12 mois)
  inactivity_notice_sent_at TIMESTAMPTZ,
  marked_for_deletion_at  TIMESTAMPTZ,                      -- placé dans « À supprimer » (validation admin requise)
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospect_seq_stopped   ON public.prospect_sequence(sequence_stopped);
CREATE INDEX IF NOT EXISTS idx_prospect_seq_purchased ON public.prospect_sequence(has_purchased);
CREATE INDEX IF NOT EXISTS idx_prospect_seq_deletion  ON public.prospect_sequence(marked_for_deletion_at);
CREATE INDEX IF NOT EXISTS idx_prospect_seq_created   ON public.prospect_sequence(created_at DESC);

-- RLS activé, AUCUNE policy publique → accès service-role uniquement
-- (moteur cron + Server Actions admin). Calqué sur enrollment_requests (042).
ALTER TABLE public.prospect_sequence ENABLE ROW LEVEL SECURITY;

-- ─── 3) Paramètres éditables depuis l'administration (singleton id = 1) ──────
CREATE TABLE IF NOT EXISTS public.prospect_settings (
  id                     SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled                BOOLEAN NOT NULL DEFAULT TRUE,
  -- Borne de démarrage : seuls les comptes créés APRÈS cette date entrent dans
  -- la séquence (garantit « nouveaux inscrits uniquement », zéro envoi massif).
  sequence_start_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Délais (en jours) après inscription
  delay_welcome_days     INTEGER NOT NULL DEFAULT 0,
  delay_reminder_2_days  INTEGER NOT NULL DEFAULT 2,
  delay_reminder_7_days  INTEGER NOT NULL DEFAULT 7,
  delay_reminder_14_days INTEGER NOT NULL DEFAULT 14,
  -- Délai (en mois) avant l'email d'inactivité / marquage à supprimer
  delay_deletion_months  INTEGER NOT NULL DEFAULT 12,
  -- Sujets & HTML éditables (NULL/vide = utilise le modèle par défaut du code)
  subject_welcome        TEXT,
  html_welcome           TEXT,
  subject_reminder_2     TEXT,
  html_reminder_2        TEXT,
  subject_reminder_7     TEXT,
  html_reminder_7        TEXT,
  subject_reminder_14    TEXT,
  html_reminder_14       TEXT,
  -- Bonus / promotion optionnelle pour le dernier rappel
  promo_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
  promo_text             TEXT,
  -- Habillage
  signature              TEXT,
  logo_url               TEXT,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ligne unique par défaut
INSERT INTO public.prospect_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.prospect_settings ENABLE ROW LEVEL SECURITY;

-- SELECT authentifié ; UPDATE réservé admin ; INSERT via service-role.
-- (Pattern identique à ccp_config — migration 011.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='prospect_settings' AND policyname='prospect_settings_select') THEN
    CREATE POLICY "prospect_settings_select" ON public.prospect_settings FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='prospect_settings' AND policyname='prospect_settings_update') THEN
    CREATE POLICY "prospect_settings_update" ON public.prospect_settings FOR UPDATE
      USING (public.is_admin());
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════
-- Fin de la migration 049_prospects
-- ════════════════════════════════════════════════════════════════════════
