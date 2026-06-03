-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 008 — SYSTÈME DE QUIZ & GAMIFICATION (anti-abandon)
-- Plateforme couture/modélisme · Next.js 14 + Supabase
-- Règles : aucun DROP destructif · ALTER uniquement pour étendre l'existant.
-- Note : la table utilisateur est `public.users` (pas `profiles`).
--        `users.level` existe déjà en int → on ajoute `level_label` (texte).
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. SYSTÈME DE QUIZ
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quizzes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id         UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  type              TEXT CHECK (type IN ('lesson_end','module_end','timed','practical')),
  min_score         INT NOT NULL DEFAULT 70,      -- % minimum pour valider
  time_limit_seconds INT,                          -- NULL = pas de limite
  max_attempts      INT NOT NULL DEFAULT 3,
  is_required       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON public.quizzes(lesson_id);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id       UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question      TEXT NOT NULL,
  type          TEXT CHECK (type IN ('qcm','true_false','number','photo')),
  options       JSONB,                 -- ["opt1","opt2","opt3","opt4"]
  correct_answer TEXT,
  explanation   TEXT,                  -- affiché après la réponse
  points        INT NOT NULL DEFAULT 10,
  order_index   INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id           UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  answers           JSONB,             -- {question_id: réponse}
  score             INT NOT NULL DEFAULT 0,
  passed            BOOLEAN NOT NULL DEFAULT FALSE,
  time_spent_seconds INT,
  attempt_number    INT NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON public.quiz_attempts(student_id, quiz_id);

CREATE TABLE IF NOT EXISTS public.practical_submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id       UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  photo_url     TEXT,                  -- stocké sur Supabase Storage
  comment       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  feedback      TEXT,                  -- retour de la formatrice
  reviewed_at   TIMESTAMPTZ,
  reviewed_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_practical_student ON public.practical_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_practical_status ON public.practical_submissions(status);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. GAMIFICATION — extension de public.users (ALTER, non destructif)
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS xp_total           INT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS xp_this_month      INT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS level_label        TEXT DEFAULT 'apprentie';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_streak     INT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS longest_streak     INT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_activity_date DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS weekly_goal        INT DEFAULT 3;  -- leçons / semaine

-- Extension de la table badges existante (ajout des champs de la spec)
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS slug            TEXT;
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS name            TEXT;
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS category        TEXT;
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS xp_reward       INT DEFAULT 0;
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS condition_type  TEXT;
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS condition_value INT;
-- Catégorie limitée (autorise NULL pour les anciens badges)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'badges_category_chk') THEN
    ALTER TABLE public.badges ADD CONSTRAINT badges_category_chk
      CHECK (category IS NULL OR category IN ('couture','quiz','streak','special'));
  END IF;
END $$;
-- Index unique sur slug (les anciens badges ont slug NULL → autorisé en double)
CREATE UNIQUE INDEX IF NOT EXISTS idx_badges_slug ON public.badges(slug);

CREATE TABLE IF NOT EXISTS public.student_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_id    UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, badge_id)
);
CREATE INDEX IF NOT EXISTS idx_student_badges_student ON public.student_badges(student_id);

CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount        INT NOT NULL,
  reason        TEXT NOT NULL,         -- 'lesson_complete', 'quiz_passed', 'badge:...'
  reference_id  UUID,                  -- id de la leçon / quiz / badge concerné
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_xp_tx_student ON public.xp_transactions(student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.weekly_goals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  week_start  DATE NOT NULL,
  goal        INT NOT NULL DEFAULT 3,
  achieved    INT NOT NULL DEFAULT 0,
  completed   BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (student_id, week_start)
);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. SEED — Badges couture (idempotent via ON CONFLICT slug)
--    On renseigne aussi code/titre/points pour respecter les colonnes
--    NOT NULL héritées de la table badges existante.
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO public.badges (code, titre, points, slug, name, description, icon, category, xp_reward, condition_type, condition_value) VALUES
  -- Premiers pas
  ('premiere-aiguille','Première Aiguille',50, 'premiere-aiguille','Première Aiguille 🪡','Votre toute première leçon terminée','🪡','couture',50, 'lesson_count',1),
  ('premier-module',   'Premier Module',  100,'premier-module',   'Premier Module 🎖️','Un module entier complété','🎖️','couture',100,'module_count',1),
  ('premier-quiz',     'Première Note',    30, 'premier-quiz',     'Première Note 📝','Votre premier quiz réussi','📝','quiz',30,    'quiz_passed',1),
  ('quiz-parfait',     'Sans Faute',       80, 'quiz-parfait',     'Sans Faute ⭐','Un quiz réussi à 100%','⭐','quiz',80,         'quiz_perfect',1),
  -- Régularité (streak)
  ('serie-3', 'En forme',         50, 'serie-3', 'En forme 🔥','3 jours d''apprentissage de suite','🔥','streak',50,  'streak_days',3),
  ('serie-7', 'Semaine parfaite',150,'serie-7', 'Semaine parfaite 🔥','7 jours de suite','🔥','streak',150,         'streak_days',7),
  ('serie-30','Mois parfait',    500,'serie-30','Mois parfait 🏆','30 jours de suite','🏆','streak',500,            'streak_days',30),
  -- Couture spécifique
  ('reine-patron','Reine du Patron', 300,'reine-patron','Reine du Patron 📐','Parcours modélisme terminé','📐','special',300,    'manual',0),
  ('maitresse-de','Maîtresse du Dé', 200,'maitresse-de','Maîtresse du Dé 🎯','10 quiz pratiques approuvés','🎯','couture',200,   'practical_approved',10),
  ('styliste',    'Styliste',        300,'styliste',    'Styliste 👗','Parcours stylisme terminé','👗','special',300,            'manual',0),
  ('diplomee',    'Diplômée',       1000,'diplomee',    'Diplômée 🎓','Diplôme final obtenu','🎓','special',1000,                'manual',0)
ON CONFLICT (slug) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. FONCTIONS SQL
-- ───────────────────────────────────────────────────────────────────────────

-- Calcule le niveau (texte) selon l'XP total
CREATE OR REPLACE FUNCTION public.calculate_level(p_xp INT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_xp >= 4000 THEN 'créatrice de mode'
    WHEN p_xp >= 2000 THEN 'maître couturière'
    WHEN p_xp >= 1000 THEN 'styliste'
    WHEN p_xp >= 500  THEN 'modéliste'
    WHEN p_xp >= 200  THEN 'couturière'
    ELSE 'apprentie'
  END;
$$;

-- Met à jour la série journalière (jours consécutifs)
CREATE OR REPLACE FUNCTION public.update_daily_streak(p_student UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_last DATE; v_streak INT; v_longest INT; v_today DATE := CURRENT_DATE;
BEGIN
  SELECT last_activity_date, current_streak, longest_streak
    INTO v_last, v_streak, v_longest FROM public.users WHERE id = p_student;
  IF v_last = v_today THEN
    RETURN;                                   -- déjà compté aujourd'hui
  ELSIF v_last = v_today - 1 THEN
    v_streak := COALESCE(v_streak,0) + 1;     -- jour consécutif
  ELSE
    v_streak := 1;                            -- série rompue / première activité
  END IF;
  v_longest := GREATEST(COALESCE(v_longest,0), v_streak);
  UPDATE public.users
    SET current_streak = v_streak, longest_streak = v_longest, last_activity_date = v_today
    WHERE id = p_student;
END;
$$;

-- Vérifie et attribue automatiquement les badges débloqués
CREATE OR REPLACE FUNCTION public.check_badges(p_student UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b RECORD; v_metric INT; v_meets BOOLEAN; v_total INT;
BEGIN
  FOR b IN SELECT * FROM public.badges WHERE slug IS NOT NULL AND condition_type IS NOT NULL AND condition_type <> 'manual' LOOP
    -- Déjà obtenu ?
    IF EXISTS (SELECT 1 FROM public.student_badges sb WHERE sb.student_id = p_student AND sb.badge_id = b.id) THEN
      CONTINUE;
    END IF;
    v_meets := FALSE;

    IF b.condition_type = 'lesson_count' THEN
      SELECT count(*) INTO v_metric FROM public.progress WHERE user_id = p_student;
      v_meets := v_metric >= b.condition_value;

    ELSIF b.condition_type = 'module_count' THEN
      SELECT count(*) INTO v_metric FROM public.chapters ch
        WHERE EXISTS (SELECT 1 FROM public.lessons l WHERE l.chapter_id = ch.id)
          AND NOT EXISTS (
            SELECT 1 FROM public.lessons l
            WHERE l.chapter_id = ch.id
              AND NOT EXISTS (SELECT 1 FROM public.progress p WHERE p.user_id = p_student AND p.lesson_id = l.id));
      v_meets := v_metric >= b.condition_value;

    ELSIF b.condition_type = 'quiz_passed' THEN
      SELECT count(*) INTO v_metric FROM public.quiz_attempts WHERE student_id = p_student AND passed = TRUE;
      v_meets := v_metric >= b.condition_value;

    ELSIF b.condition_type = 'quiz_perfect' THEN
      SELECT count(*) INTO v_metric FROM public.quiz_attempts WHERE student_id = p_student AND score = 100;
      v_meets := v_metric >= b.condition_value;

    ELSIF b.condition_type = 'streak_days' THEN
      SELECT current_streak INTO v_metric FROM public.users WHERE id = p_student;
      v_meets := COALESCE(v_metric,0) >= b.condition_value;

    ELSIF b.condition_type = 'practical_approved' THEN
      SELECT count(*) INTO v_metric FROM public.practical_submissions WHERE student_id = p_student AND status = 'approved';
      v_meets := v_metric >= b.condition_value;
    END IF;

    IF v_meets THEN
      INSERT INTO public.student_badges (student_id, badge_id) VALUES (p_student, b.id) ON CONFLICT DO NOTHING;
      -- XP de récompense du badge (inséré directement → pas de récursion award_xp)
      IF COALESCE(b.xp_reward,0) > 0 THEN
        INSERT INTO public.xp_transactions (student_id, amount, reason, reference_id)
          VALUES (p_student, b.xp_reward, 'badge:' || b.slug, b.id);
        UPDATE public.users
          SET xp_total = COALESCE(xp_total,0) + b.xp_reward,
              xp_this_month = COALESCE(xp_this_month,0) + b.xp_reward
          WHERE id = p_student RETURNING xp_total INTO v_total;
        UPDATE public.users SET level_label = public.calculate_level(v_total) WHERE id = p_student;
      END IF;
      -- Notification (table notifications existante)
      INSERT INTO public.notifications (user_id, type, title, body, link)
        VALUES (p_student, 'badge', '🏅 Badge débloqué : ' || COALESCE(b.name, b.titre), b.description, '/dashboard');
    END IF;
  END LOOP;
END;
$$;

-- Ajoute de l'XP + recalcule le niveau + vérifie les badges
CREATE OR REPLACE FUNCTION public.award_xp(p_student UUID, p_amount INT, p_reason TEXT, p_ref UUID DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total INT;
BEGIN
  IF p_amount IS NULL OR p_amount = 0 THEN RETURN; END IF;
  INSERT INTO public.xp_transactions (student_id, amount, reason, reference_id)
    VALUES (p_student, p_amount, p_reason, p_ref);
  UPDATE public.users
    SET xp_total = COALESCE(xp_total,0) + p_amount,
        xp_this_month = COALESCE(xp_this_month,0) + p_amount
    WHERE id = p_student RETURNING xp_total INTO v_total;
  UPDATE public.users SET level_label = public.calculate_level(v_total) WHERE id = p_student;
  PERFORM public.check_badges(p_student);
END;
$$;

-- Classement mensuel (XP du mois en cours, top 50 élèves)
CREATE OR REPLACE FUNCTION public.get_monthly_leaderboard()
RETURNS TABLE (rang BIGINT, student_id UUID, nom TEXT, xp_mois BIGINT, niveau TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT row_number() OVER (ORDER BY COALESCE(SUM(x.amount),0) DESC),
         u.id, u.nom, COALESCE(SUM(x.amount),0)::BIGINT, u.level_label
  FROM public.users u
  LEFT JOIN public.xp_transactions x
    ON x.student_id = u.id AND x.created_at >= date_trunc('month', NOW())
  WHERE u.role = 'eleve'
  GROUP BY u.id, u.nom, u.level_label
  HAVING COALESCE(SUM(x.amount),0) > 0
  ORDER BY 4 DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_monthly_leaderboard() TO authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. TRIGGERS AUTOMATIQUES (CREATE OR REPLACE TRIGGER — PG14+ — sans DROP)
-- ───────────────────────────────────────────────────────────────────────────

-- Leçon terminée → +20 XP, série du jour, badges
CREATE OR REPLACE FUNCTION public.trg_progress_gamify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.update_daily_streak(NEW.user_id);
  PERFORM public.award_xp(NEW.user_id, 20, 'lesson_complete', NEW.lesson_id);
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER trg_progress_gamify
  AFTER INSERT ON public.progress
  FOR EACH ROW EXECUTE FUNCTION public.trg_progress_gamify();

-- Quiz réussi → bonus XP (= score), badges
CREATE OR REPLACE FUNCTION public.trg_quiz_gamify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.passed THEN
    PERFORM public.award_xp(NEW.student_id, GREATEST(COALESCE(NEW.score,0), 10), 'quiz_passed', NEW.quiz_id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER trg_quiz_gamify
  AFTER INSERT ON public.quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.trg_quiz_gamify();

-- Soumission pratique approuvée → +50 XP, badges
CREATE OR REPLACE FUNCTION public.trg_practical_gamify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    PERFORM public.award_xp(NEW.student_id, 50, 'practical_approved', NEW.quiz_id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER trg_practical_gamify
  AFTER UPDATE ON public.practical_submissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_practical_gamify();

-- ───────────────────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.quizzes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practical_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_badges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_goals          ENABLE ROW LEVEL SECURITY;

-- quizzes / quiz_questions : lecture si inscrite au cours, gestion staff
CREATE POLICY "quizzes_read" ON public.quizzes FOR SELECT USING (
  public.is_staff() OR EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.chapters ch ON ch.id = l.chapter_id
    JOIN public.enrollments e ON e.course_id = ch.course_id
    WHERE l.id = quizzes.lesson_id AND e.user_id = auth.uid()
  )
);
CREATE POLICY "quizzes_manage" ON public.quizzes FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "quiz_questions_read" ON public.quiz_questions FOR SELECT USING (
  public.is_staff() OR EXISTS (
    SELECT 1 FROM public.quizzes q
    JOIN public.lessons l ON l.id = q.lesson_id
    JOIN public.chapters ch ON ch.id = l.chapter_id
    JOIN public.enrollments e ON e.course_id = ch.course_id
    WHERE q.id = quiz_questions.quiz_id AND e.user_id = auth.uid()
  )
);
CREATE POLICY "quiz_questions_manage" ON public.quiz_questions FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- quiz_attempts : CRUD par la propriétaire uniquement
CREATE POLICY "quiz_attempts_own" ON public.quiz_attempts FOR ALL
  USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

-- practical_submissions : lecture prof + propriétaire ; insert propriétaire ; update staff (review)
CREATE POLICY "practical_read" ON public.practical_submissions FOR SELECT
  USING (auth.uid() = student_id OR public.is_staff());
CREATE POLICY "practical_insert" ON public.practical_submissions FOR INSERT
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "practical_review" ON public.practical_submissions FOR UPDATE
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- student_badges / xp_transactions : lecture propriétaire (écriture via fonctions SECURITY DEFINER)
CREATE POLICY "student_badges_own" ON public.student_badges FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "xp_tx_own"          ON public.xp_transactions FOR SELECT USING (auth.uid() = student_id);

-- weekly_goals : CRUD propriétaire
CREATE POLICY "weekly_goals_own" ON public.weekly_goals FOR ALL
  USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

-- badges : déjà en lecture publique (policy "badges_read" créée en migration 002)
-- leaderboard : exposé via get_monthly_leaderboard() (GRANT authenticated ci-dessus)

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN — Migration 008
-- ═══════════════════════════════════════════════════════════════════════════
