-- ═══════════════════════════════════════════════════════════════════════════
-- 096 — LIVES PÉDAGOGIQUES (/admin/lives)
-- ───────────────────────────────────────────────────────────────────────────
-- ⚠️ NON VALIDÉE — préparée et testée sur un faux serveur local uniquement.
--    À valider sur une base de test (ou, sur décision de l'administratrice,
--    appliquer avec le contrôle préalable ci-dessous puis le bilan
--    scripts/sql/lives-bilan.sql). Jamais sans autorisation.
--
-- PAS DE SECOND CALENDRIER : chaque live reste une ligne de `live_sessions`
-- (la table que lisent déjà /dashboard/sessions, /formateur/sessions et le cron
-- des rappels). On y AJOUTE des colonnes, et trois petites tables :
--   • live_series           règle d'une récurrence hebdomadaire (heure d'Alger)
--   • live_session_courses  niveaux multiples d'un live (lecture élève permise)
--   • live_reminders        rappels PLANIFIÉS — aucun envoi dans cette phase ;
--                           « envoye » est INTERDIT sans date + id fournisseur.
-- Aucune donnée existante n'est modifiée. Se rejoue sans dommage.
--
-- Retour arrière (perd uniquement les données de ce module) :
--   DROP TABLE IF EXISTS public.live_reminders;
--   DROP TABLE IF EXISTS public.live_session_courses;
--   DROP INDEX IF EXISTS public.live_sessions_admin_doublon_uniq;
--   ALTER TABLE public.live_sessions DROP CONSTRAINT IF EXISTS live_sessions_serie_date_uniq;
--   ALTER TABLE public.live_sessions DROP COLUMN IF EXISTS series_id, DROP COLUMN IF EXISTS occurrence_date,
--     DROP COLUMN IF EXISTS occurrence_modifiee, DROP COLUMN IF EXISTS duree_minutes, DROP COLUMN IF EXISTS cancelled_at,
--     DROP COLUMN IF EXISTS cancel_reason, DROP COLUMN IF EXISTS rappels, DROP COLUMN IF EXISTS created_via, DROP COLUMN IF EXISTS updated_at;
--   DROP TABLE IF EXISTS public.live_series;
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 0. Contrôle préalable ──────────────────────────────────────────────────
DO $$
DECLARE manquants text;
BEGIN
  SELECT string_agg(t.tbl || '.' || t.col, ', ') INTO manquants
  FROM (VALUES
    ('live_sessions','id'), ('live_sessions','course_id'), ('live_sessions','formateur_id'), ('live_sessions','titre'),
    ('live_sessions','description'), ('live_sessions','starts_at'), ('live_sessions','meet_url'), ('live_sessions','replay_url'),
    ('live_sessions','is_live'), ('session_reminders','session_id'), ('session_reminders','stage'),
    ('courses','formateur_id'), ('enrollments','course_id'), ('notifications','type'), ('email_log','category'),
    ('email_preferences','announcements'), ('users','id')
  ) AS t(tbl, col)
  WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns c
                    WHERE c.table_schema = 'public' AND c.table_name = t.tbl AND c.column_name = t.col);
  IF manquants IS NOT NULL THEN
    RAISE EXCEPTION '096 annulée, rien n''a été créé. Colonnes absentes : %', manquants;
  END IF;
END $$;

-- ─── 1. Séries hebdomadaires ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.live_series (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre          text NOT NULL,
  description    text,
  heure_alger    text NOT NULL CHECK (heure_alger ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  duree_minutes  integer NOT NULL CHECK (duree_minutes BETWEEN 5 AND 600),
  date_debut     date NOT NULL,                 -- fixe aussi le jour de la semaine
  date_fin       date NOT NULL,
  lien           text,
  course_ids     uuid[] NOT NULL DEFAULT '{}',
  rappels        jsonb NOT NULL DEFAULT '[]'::jsonb,
  formateur_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  cancelled_at   timestamptz,
  cancel_reason  text,
  created_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT live_series_dates_chk CHECK (date_fin >= date_debut AND date_fin <= date_debut + 182)
);

-- ─── 2. live_sessions : colonnes ajoutées (rien n'est retiré) ───────────────
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS duree_minutes       integer CHECK (duree_minutes IS NULL OR duree_minutes BETWEEN 5 AND 600),
  ADD COLUMN IF NOT EXISTS cancelled_at        timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason       text,
  ADD COLUMN IF NOT EXISTS series_id           uuid REFERENCES public.live_series(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS occurrence_date     date,
  ADD COLUMN IF NOT EXISTS occurrence_modifiee boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rappels             jsonb,
  ADD COLUMN IF NOT EXISTS created_via         text,
  ADD COLUMN IF NOT EXISTS updated_at          timestamptz;

-- Une date d'une série n'existe qu'une fois (les lives uniques ont series_id NULL : non concernés).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'live_sessions_serie_date_uniq') THEN
    ALTER TABLE public.live_sessions ADD CONSTRAINT live_sessions_serie_date_uniq UNIQUE (series_id, occurrence_date);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_live_sessions_starts ON public.live_sessions(starts_at);
-- Anti double-envoi du formulaire : un même live (titre + instant) n'est programmé qu'une fois
-- par /admin/lives tant qu'il n'est pas annulé. Les lives de la formatrice ne sont pas concernés.
CREATE UNIQUE INDEX IF NOT EXISTS live_sessions_admin_doublon_uniq
  ON public.live_sessions (titre, starts_at) WHERE created_via = 'admin_lives' AND cancelled_at IS NULL;

-- ─── 3. Niveaux multiples d'un live ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.live_session_courses (
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  course_id  uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_live_session_courses_course ON public.live_session_courses(course_id);

-- ─── 4. Rappels PLANIFIÉS (aucun envoi dans cette phase) ────────────────────
CREATE TABLE IF NOT EXISTS public.live_reminders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  moment           text NOT NULL CHECK (moment IN ('avant', 'debut', 'apres')),
  decalage_minutes integer NOT NULL DEFAULT 0 CHECK (decalage_minutes >= 0),
  canal            text NOT NULL CHECK (canal IN ('notification', 'email', 'whatsapp')),
  prevu_le         timestamptz NOT NULL,
  statut           text NOT NULL DEFAULT 'prevu' CHECK (statut IN ('prevu', 'annule', 'envoye', 'echec')),
  envoye_le        timestamptz,
  fournisseur_id   text,
  erreur           text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT live_reminders_unique UNIQUE (session_id, moment, decalage_minutes, canal),
  -- « envoyé » sans preuve est impossible, même par erreur de code.
  CONSTRAINT live_reminders_envoi_confirme CHECK (statut <> 'envoye' OR (envoye_le IS NOT NULL AND fournisseur_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_live_reminders_echeance ON public.live_reminders(prevu_le) WHERE statut = 'prevu';

-- ─── 5. Accès ───────────────────────────────────────────────────────────────
ALTER TABLE public.live_series          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_reminders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_courses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.live_series, public.live_reminders FROM PUBLIC, anon, authenticated;   -- service_role seul
REVOKE ALL ON public.live_session_courses FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.live_session_courses TO authenticated;      -- la page élève lit les niveaux d'un live
GRANT ALL ON public.live_series, public.live_reminders, public.live_session_courses TO service_role;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'live_session_courses' AND policyname = 'live_session_courses_lecture') THEN
    CREATE POLICY "live_session_courses_lecture" ON public.live_session_courses FOR SELECT TO authenticated USING (true);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'arazzo_reader') THEN
    EXECUTE 'REVOKE ALL ON public.live_series, public.live_reminders, public.live_session_courses FROM arazzo_reader';
  END IF;
END $$;
