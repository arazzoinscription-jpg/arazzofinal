-- ═══════════════════════════════════════════════════════════════════════════
-- Arazzo Formation — Migration 002 : Fonctionnalités avancées (features 1→18)
-- Fondation complète : tables, RLS, index, triggers, recherche full-text.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Colonnes d'activité sur users (features 2, 7, 14)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS twofa_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── Helper : est-on admin ? ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('formateur','admin'));
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- FEATURE 1 — EMAILS : préférences + journal d'envoi
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.email_preferences (
  user_id        UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  welcome        BOOLEAN NOT NULL DEFAULT TRUE,
  purchases      BOOLEAN NOT NULL DEFAULT TRUE,
  new_content    BOOLEAN NOT NULL DEFAULT TRUE,
  teacher_reply  BOOLEAN NOT NULL DEFAULT TRUE,
  private_msg    BOOLEAN NOT NULL DEFAULT TRUE,
  certificates   BOOLEAN NOT NULL DEFAULT TRUE,
  reactivation   BOOLEAN NOT NULL DEFAULT TRUE,
  announcements  BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  to_email    TEXT NOT NULL,
  category    TEXT NOT NULL,
  subject     TEXT,
  status      TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed','skipped')),
  resend_id   TEXT,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_log_user ON public.email_log(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- FEATURE 2 — RÉACTIVATION : journal des relances inactivité
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.reactivation_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stage       TEXT NOT NULL CHECK (stage IN ('reminder_7','motivation_14','direct_30','notify_teacher_60')),
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, stage)
);
CREATE INDEX IF NOT EXISTS idx_reactivation_user ON public.reactivation_log(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- FEATURE 3 + 12 — NOTIFICATIONS (contenu, annonces, système)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,            -- new_content | announcement | reply | ticket | session | badge | system
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- FEATURE 4 — SUIVI VIDÉOS BUNNY
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.video_progress (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id         UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  last_position_sec INTEGER NOT NULL DEFAULT 0,
  duration_sec      INTEGER,
  watched_pct       NUMERIC(5,2) NOT NULL DEFAULT 0,
  watched_complete  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_video_progress_user ON public.video_progress(user_id);
-- Seuil minimum de visionnage pour valider une leçon (configurable par cours)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS min_watch_pct INTEGER NOT NULL DEFAULT 80;

-- ═══════════════════════════════════════════════════════════════════════════
-- FEATURE 5 — CERTIFICATS (extension)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS numero TEXT UNIQUE;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS pdf_path TEXT;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS qr_url TEXT;

-- ═══════════════════════════════════════════════════════════════════════════
-- FEATURE 6 — GAMIFICATION
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,     -- first_lesson | first_module | first_question | course_done | streak_7 ...
  titre       TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  points      INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.user_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_id    UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);
CREATE TABLE IF NOT EXISTS public.points_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  points      INTEGER NOT NULL,
  reason      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.learning_streaks (
  user_id        UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_day       DATE
);

-- ═══════════════════════════════════════════════════════════════════════════
-- FEATURE 8 — SESSIONS LIVE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  formateur_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  titre        TEXT NOT NULL,
  description  TEXT,
  starts_at    TIMESTAMPTZ NOT NULL,
  meet_url     TEXT,
  replay_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_live_sessions_course ON public.live_sessions(course_id, starts_at);
CREATE TABLE IF NOT EXISTS public.session_reminders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  stage       TEXT NOT NULL CHECK (stage IN ('j1','h1')),
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, stage)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- FEATURE 9 — BIBLIOTHÈQUE DE RESSOURCES
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.resources (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  chapter_id   UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  formateur_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  titre        TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'pdf',   -- pdf | patron | zip | video | autre
  file_path    TEXT NOT NULL,
  taille_ko    INTEGER,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_resources_course ON public.resources(course_id);
CREATE TABLE IF NOT EXISTS public.resource_downloads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- FEATURE 1/3/12 — Q&A + MESSAGES PRIVÉS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.qa_questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id   UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  titre       TEXT NOT NULL,
  body        TEXT,
  resolved    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.qa_answers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.qa_questions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  is_teacher  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_user     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_to ON public.messages(to_user, read_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- FEATURE 12 — ANNONCES
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.announcements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id    UUID REFERENCES public.courses(id) ON DELETE CASCADE,  -- NULL = tous
  titre        TEXT NOT NULL,
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- FEATURE 13 — SUPPORT TICKETS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.tickets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_to  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sujet        TEXT NOT NULL,
  statut       TEXT NOT NULL DEFAULT 'ouvert' CHECK (statut IN ('ouvert','en_cours','resolu','ferme')),
  priorite     TEXT NOT NULL DEFAULT 'normale' CHECK (priorite IN ('basse','normale','haute')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- FEATURE 14 — SÉCURITÉ : connexions, appareils, 2FA
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.login_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ip          TEXT,
  user_agent  TEXT,
  device      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_history_user ON public.login_history(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.user_devices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_label TEXT,
  last_ip      TEXT,
  last_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked      BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS public.user_2fa (
  user_id     UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  secret      TEXT NOT NULL,
  verified    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- FEATURE 15 — JOURNAL D'ACTIVITÉ
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,   -- login | logout | course_view | video_watch | download | question | answer
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON public.activity_log(user_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- FEATURE 17 — PAIEMENTS CHARGILY : paiements, factures, coupons, remboursements
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.coupons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL UNIQUE,
  type         TEXT NOT NULL CHECK (type IN ('percent','fixed')),
  value        NUMERIC(10,2) NOT NULL,
  max_uses     INTEGER,
  used_count   INTEGER NOT NULL DEFAULT 0,
  expires_at   TIMESTAMPTZ,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id     UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  amount        NUMERIC(12,2) NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'DZD',
  provider      TEXT NOT NULL DEFAULT 'chargily',  -- chargily | stripe
  provider_ref  TEXT,
  coupon_id     UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('pending','paid','failed','refunded')),
  invoice_path  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE TABLE IF NOT EXISTS public.refunds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id  UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- FEATURE 10 — RECHERCHE FULL-TEXT (pg_trgm)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_courses_search ON public.courses USING gin (titre_fr gin_trgm_ops, titre_ar gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_chapters_search ON public.chapters USING gin (titre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lessons_search ON public.lessons USING gin (titre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_resources_search ON public.resources USING gin (titre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_qa_search ON public.qa_questions USING gin (titre gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.global_search(q TEXT)
RETURNS TABLE (kind TEXT, id UUID, label TEXT, link TEXT, score REAL)
LANGUAGE sql STABLE AS $$
  SELECT 'cours'::TEXT, c.id, c.titre_fr, '/formations/'||c.slug, similarity(c.titre_fr, q)
    FROM courses c WHERE c.published AND c.titre_fr % q
  UNION ALL
  SELECT 'leçon'::TEXT, l.id, l.titre, '/dashboard/cours/'||l.id::text, similarity(l.titre, q)
    FROM lessons l WHERE l.titre % q
  UNION ALL
  SELECT 'ressource'::TEXT, r.id, r.titre, '#'::TEXT, similarity(r.titre, q)
    FROM resources r WHERE r.titre % q
  UNION ALL
  SELECT 'question'::TEXT, qq.id, qq.titre, '#'::TEXT, similarity(qq.titre, q)
    FROM qa_questions qq WHERE qq.titre % q
  ORDER BY 5 DESC LIMIT 20;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.email_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactivation_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_streaks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_reminders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_downloads  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_questions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_answers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_2fa            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds             ENABLE ROW LEVEL SECURITY;

-- Données personnelles : l'utilisateur gère les siennes
CREATE POLICY "own_email_prefs"   ON public.email_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_notifications" ON public.notifications     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_video"         ON public.video_progress    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_userbadges"    ON public.user_badges       FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_points"        ON public.points_log        FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_streak"        ON public.learning_streaks  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_login_hist"    ON public.login_history     FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_devices"       ON public.user_devices      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_2fa"           ON public.user_2fa          FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_activity"      ON public.activity_log      FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "own_payments"      ON public.payments          FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Badges : catalogue public en lecture
CREATE POLICY "badges_read" ON public.badges FOR SELECT USING (TRUE);

-- Messages privés : expéditeur ou destinataire
CREATE POLICY "msg_rw" ON public.messages FOR ALL
  USING (auth.uid() = from_user OR auth.uid() = to_user)
  WITH CHECK (auth.uid() = from_user);

-- Q&A : lecture par inscrits, écriture par l'auteur
CREATE POLICY "qa_q_read"  ON public.qa_questions FOR SELECT USING (TRUE);
CREATE POLICY "qa_q_write" ON public.qa_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "qa_a_read"  ON public.qa_answers   FOR SELECT USING (TRUE);
CREATE POLICY "qa_a_write" ON public.qa_answers   FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ressources : lecture publique (inscrits), gestion staff
CREATE POLICY "resources_read"   ON public.resources FOR SELECT USING (TRUE);
CREATE POLICY "resources_manage" ON public.resources FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "rdl_own" ON public.resource_downloads FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Sessions live : lecture publique, gestion formateur/admin
CREATE POLICY "sessions_read"   ON public.live_sessions FOR SELECT USING (TRUE);
CREATE POLICY "sessions_manage" ON public.live_sessions FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Annonces : lecture publique, écriture staff
CREATE POLICY "ann_read"  ON public.announcements FOR SELECT USING (TRUE);
CREATE POLICY "ann_write" ON public.announcements FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Tickets : propriétaire + staff
CREATE POLICY "tickets_own"  ON public.tickets FOR ALL
  USING (auth.uid() = user_id OR public.is_staff())
  WITH CHECK (auth.uid() = user_id OR public.is_staff());
CREATE POLICY "ticket_msg"   ON public.ticket_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.is_staff())))
  WITH CHECK (auth.uid() = user_id);

-- Coupons : staff seulement
CREATE POLICY "coupons_staff" ON public.coupons FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "refunds_staff" ON public.refunds FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- BADGES par défaut (catalogue gamification)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO public.badges (code, titre, description, icon, points) VALUES
  ('first_lesson',  'Premier pas',        'Vous avez terminé votre première leçon',      '🎯', 10),
  ('first_module',  'Premier module',     'Vous avez complété un module entier',          '📦', 25),
  ('first_question','Curieuse',           'Vous avez posé votre première question',        '❓', 15),
  ('course_done',   'Diplômée',           'Vous avez terminé une formation complète',      '🎓', 100),
  ('streak_7',      'Régulière',          '7 jours d''apprentissage consécutifs',          '🔥', 50),
  ('streak_30',     'Assidue',            '30 jours d''apprentissage consécutifs',         '⭐', 200)
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER — Création auto des préférences email à l'inscription
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user_prefs()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.email_preferences (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.learning_streaks (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_user_created_prefs ON public.users;
CREATE TRIGGER on_user_created_prefs
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_prefs();

-- Backfill pour les utilisateurs existants
INSERT INTO public.email_preferences (user_id) SELECT id FROM public.users ON CONFLICT DO NOTHING;
INSERT INTO public.learning_streaks (user_id) SELECT id FROM public.users ON CONFLICT DO NOTHING;
