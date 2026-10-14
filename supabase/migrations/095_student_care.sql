-- ═══════════════════════════════════════════════════════════════════════════
-- 095 — SUIVI PÉDAGOGIQUE (/admin/suivi) — v2
-- ───────────────────────────────────────────────────────────────────────────
-- ⚠️ NON VALIDÉE. À appliquer UNIQUEMENT sur le projet Supabase de RECETTE
--    (scripts/recette/migrer.mjs) tant que les contrôles de
--    scripts/sql/student-care-checks.sql, les tests de permissions et les tests
--    de justesse ne sont pas concluants. Jamais en production sans autorisation.
--
-- Additif : 1 table de réglages + 2 vues en LECTURE SEULE. Aucune donnée
-- existante n'est modifiée. Rien n'est envoyé (ni e-mail, ni notification).
--
--  • student_care_settings     date de début du suivi + seuils (jours). Lisible
--                              et modifiable par le seul service_role : elle N'EST
--                              PAS dans platform_config, que toute élève connectée
--                              peut lire (policy platform_config_read, migration 044).
--  • student_care_enrollments  une ligne par inscription (élève × cours). Aucune
--                              somme entre cours : les leçons des anciens
--                              cours-modules ont été RECOPIÉES dans les cours de
--                              niveau (scripts/build-levels.mjs) ; les additionner
--                              compterait deux fois les mêmes leçons.
--  • student_care_signals      signaux par élève (connexion, leçon ouverte,
--                              relances déjà envoyées) — jamais comptés comme
--                              activité pédagogique réelle.
--
-- Activité pédagogique RÉELLE = leçon terminée (progress), quiz tenté
-- (quiz_attempts), travail pratique soumis (lesson_practicals).
--
-- Accès : security_invoker (les droits de l'appelant s'appliquent) ET droits
-- retirés à PUBLIC / anon / authenticated / arazzo_reader. Seul service_role
-- (client serveur createAdminClient) lit. Se rejoue sans dommage.
--
-- Retour arrière (aucune donnée existante concernée) :
--   DROP VIEW IF EXISTS public.student_care_signals;
--   DROP VIEW IF EXISTS public.student_care_enrollments;
--   DROP TABLE IF EXISTS public.student_care_settings;
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 0. Contrôle préalable : tout ce que la migration lit doit exister ──────
-- Si une migration plus ancienne n'a pas été appliquée sur cette base, on
-- s'arrête ICI, avant d'avoir créé quoi que ce soit, en nommant ce qui manque.
DO $$
DECLARE manquants text;
BEGIN
  SELECT string_agg(t.tbl || '.' || t.col, ', ') INTO manquants
  FROM (VALUES
    ('users','id'), ('enrollments','paid_at'), ('enrollments','enrolled_at'), ('enrollments','order_id'), ('enrollments','expires_at'),
    ('courses','slug'), ('courses','titre_fr'), ('courses','titre_ar'), ('courses','ordre'), ('courses','published'),
    ('chapters','course_id'), ('lessons','chapter_id'), ('lessons','titre'), ('progress','completed_at'),
    ('video_progress','watched_pct'), ('video_progress','watched_complete'), ('video_progress','updated_at'),
    ('quizzes','lesson_id'), ('quizzes','max_attempts'), ('quiz_attempts','student_id'), ('quiz_attempts','passed'), ('quiz_attempts','score'),
    ('lesson_practicals','status'), ('lesson_practicals','reviewed_at'), ('lesson_questions','parent_id'), ('certificates','issued_at'),
    ('course_subscriptions','status'), ('course_subscriptions','next_due_date'), ('course_subscriptions','installments_paid'), ('course_subscriptions','total_months'),
    ('pack_subscriptions','pack_id'), ('pack_subscriptions','next_due_date'), ('course_pack_items','course_id'),
    ('login_history','created_at'), ('activity_log','action'), ('reactivation_log','stage'), ('reactivation_log','sent_at'), ('learning_reminders','sent_at')
  ) AS t(tbl, col)
  WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns c
                    WHERE c.table_schema = 'public' AND c.table_name = t.tbl AND c.column_name = t.col);
  IF manquants IS NOT NULL THEN
    RAISE EXCEPTION '095 annulée, rien n''a été créé. Colonnes absentes (migrations précédentes non appliquées) : %', manquants;
  END IF;
END $$;

-- ─── 1. Réglages (ligne unique, invisible pour les élèves) ──────────────────
CREATE TABLE IF NOT EXISTS public.student_care_settings (
  id          smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  start_date  date,                                   -- NULL = aucune date choisie
  thresholds  jsonb NOT NULL DEFAULT '{}'::jsonb,     -- seuils en jours (défauts dans le code)
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES public.users(id) ON DELETE SET NULL
);
INSERT INTO public.student_care_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.student_care_settings ENABLE ROW LEVEL SECURITY;   -- aucune policy : service_role seul
REVOKE ALL ON public.student_care_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.student_care_settings TO service_role;

-- ─── 2. Vue par inscription (élève × cours) ─────────────────────────────────
CREATE OR REPLACE VIEW public.student_care_enrollments
WITH (security_invoker = true) AS
SELECT
  e.id AS enrollment_id, e.user_id, e.course_id, e.paid_at, e.enrolled_at, e.order_id, e.expires_at,
  c.slug AS course_slug, c.titre_fr AS course_titre_fr, c.titre_ar AS course_titre_ar,
  c.ordre AS course_ordre, c.published AS course_published,
  coalesce(sz.lessons_total, 0)  AS lessons_total,
  coalesce(sz.chapters_total, 0) AS chapters_total,
  coalesce(qt.quizzes_total, 0)  AS quizzes_total,
  pr.lessons_done, pr.last_lesson_done_at,
  ll.lesson_id AS last_lesson_done_id, ll.titre AS last_lesson_done_titre,
  chd.chapters_done, chd.last_chapter_done_at,
  vp.videos_opened, vp.video_last_opened_at, vp.videos_stalled, vp.last_stalled_at,
  qa.quiz_attempts, qa.quizzes_passed, qa.quizzes_exhausted, qa.last_quiz_at, qa.last_quiz_score,
  lp.practical_lessons, lp.practicals_approved, lp.practicals_waiting_review, lp.practicals_to_redo,
  lp.last_practical_at, lp.oldest_waiting_at, lp.last_redo_request_at,
  lq.questions_asked, lq.questions_unanswered, lq.oldest_unanswered_at,
  ce.issued_at AS certificate_issued_at,
  GREATEST(pr.last_lesson_done_at, qa.last_quiz_at, lp.last_practical_at) AS last_real_activity_at,
  cs.status AS course_sub_status, cs.next_due_date AS course_sub_next_due,
  cs.installments_paid AS course_sub_paid, cs.total_months AS course_sub_total,
  psub.next_due_date AS pack_sub_next_due
FROM public.enrollments e
JOIN public.courses c ON c.id = e.course_id
-- Taille du cours : seuls les chapitres qui ont au moins une leçon comptent (numérateur et dénominateur).
LEFT JOIN (
  SELECT ch.course_id, count(l.id) AS lessons_total, count(DISTINCT ch.id) AS chapters_total
  FROM public.chapters ch JOIN public.lessons l ON l.chapter_id = ch.id
  GROUP BY ch.course_id
) sz ON sz.course_id = e.course_id
-- Quiz rattachés à une leçon du cours (un quiz sans leçon n'est rattaché à aucun cours).
LEFT JOIN (
  SELECT ch.course_id, count(qz.id) AS quizzes_total
  FROM public.quizzes qz
  JOIN public.lessons l ON l.id = qz.lesson_id
  JOIN public.chapters ch ON ch.id = l.chapter_id
  GROUP BY ch.course_id
) qt ON qt.course_id = e.course_id
-- Leçons terminées : progress est unique par (user_id, lesson_id).
LEFT JOIN LATERAL (
  SELECT count(*) AS lessons_done, max(p.completed_at) AS last_lesson_done_at
  FROM public.progress p
  JOIN public.lessons l   ON l.id = p.lesson_id
  JOIN public.chapters ch ON ch.id = l.chapter_id
  WHERE p.user_id = e.user_id AND ch.course_id = e.course_id
) pr ON true
LEFT JOIN LATERAL (
  SELECT p.lesson_id, l.titre
  FROM public.progress p
  JOIN public.lessons l   ON l.id = p.lesson_id
  JOIN public.chapters ch ON ch.id = l.chapter_id
  WHERE p.user_id = e.user_id AND ch.course_id = e.course_id
  ORDER BY p.completed_at DESC, p.lesson_id
  LIMIT 1
) ll ON true
-- Modules (chapitres) terminés : toutes les leçons du chapitre sont dans progress.
LEFT JOIN LATERAL (
  SELECT count(*) AS chapters_done, max(x.done_at) AS last_chapter_done_at
  FROM (
    SELECT ch.id, max(p.completed_at) AS done_at
    FROM public.chapters ch
    JOIN public.lessons l       ON l.chapter_id = ch.id
    LEFT JOIN public.progress p ON p.lesson_id = l.id AND p.user_id = e.user_id
    WHERE ch.course_id = e.course_id
    GROUP BY ch.id
    HAVING count(p.lesson_id) = count(l.id)
  ) x
) chd ON true
-- Vidéos (SIGNAL) : ouverture, et vidéo commencée (≥ 10 %) non terminée dont la leçon n'est pas cochée.
LEFT JOIN LATERAL (
  SELECT count(*) AS videos_opened,
         max(s.updated_at) AS video_last_opened_at,
         count(*) FILTER (WHERE s.stalled) AS videos_stalled,
         max(s.updated_at) FILTER (WHERE s.stalled) AS last_stalled_at
  FROM (
    SELECT v.updated_at,
           (v.watched_pct >= 10 AND NOT v.watched_complete
            AND NOT EXISTS (SELECT 1 FROM public.progress p2
                            WHERE p2.user_id = v.user_id AND p2.lesson_id = v.lesson_id)) AS stalled
    FROM public.video_progress v
    JOIN public.lessons l   ON l.id = v.lesson_id
    JOIN public.chapters ch ON ch.id = l.chapter_id
    WHERE v.user_id = e.user_id AND ch.course_id = e.course_id
  ) s
) vp ON true
-- Quiz : un quiz est « épuisé » quand toutes ses tentatives ont échoué et que leur nombre atteint max_attempts.
LEFT JOIN LATERAL (
  SELECT coalesce(sum(t.n), 0) AS quiz_attempts,
         count(*) FILTER (WHERE t.passed) AS quizzes_passed,
         count(*) FILTER (WHERE NOT t.passed AND t.n >= t.max_attempts) AS quizzes_exhausted,
         max(t.last_at) AS last_quiz_at,
         (array_agg(t.last_score ORDER BY t.last_at DESC))[1] AS last_quiz_score
  FROM (
    SELECT a.quiz_id, qz.max_attempts, count(*) AS n, bool_or(a.passed) AS passed,
           max(a.created_at) AS last_at,
           (array_agg(a.score ORDER BY a.created_at DESC))[1] AS last_score
    FROM public.quiz_attempts a
    JOIN public.quizzes qz  ON qz.id = a.quiz_id
    JOIN public.lessons l   ON l.id = qz.lesson_id
    JOIN public.chapters ch ON ch.id = l.chapter_id
    WHERE a.student_id = e.user_id AND ch.course_id = e.course_id
    GROUP BY a.quiz_id, qz.max_attempts
  ) t
) qa ON true
-- Travaux pratiques : PLUSIEURS lignes par leçon (photos, vidéos, notes), chacune corrigée à part.
-- État par leçon : validée si une ligne l'est ; sinon « à corriger » si une ligne est soumise ;
-- sinon « à refaire » (corrigée avec commentaire, sans nouvel envoi).
LEFT JOIN LATERAL (
  SELECT count(*) AS practical_lessons,
         count(*) FILTER (WHERE s.approved) AS practicals_approved,
         count(*) FILTER (WHERE NOT s.approved AND s.pending) AS practicals_waiting_review,
         count(*) FILTER (WHERE NOT s.approved AND NOT s.pending AND s.reviewed) AS practicals_to_redo,
         max(s.last_at) AS last_practical_at,
         min(s.first_pending_at) FILTER (WHERE NOT s.approved AND s.pending) AS oldest_waiting_at,
         max(s.last_reviewed_at) FILTER (WHERE NOT s.approved AND NOT s.pending AND s.reviewed) AS last_redo_request_at
  FROM (
    SELECT t.lesson_id,
           bool_or(t.status = 'approved')  AS approved,
           bool_or(t.status = 'submitted') AS pending,
           bool_or(t.status = 'reviewed')  AS reviewed,
           max(t.created_at) AS last_at,
           min(t.created_at) FILTER (WHERE t.status = 'submitted') AS first_pending_at,
           max(coalesce(t.reviewed_at, t.created_at)) FILTER (WHERE t.status = 'reviewed') AS last_reviewed_at
    FROM public.lesson_practicals t
    JOIN public.lessons l   ON l.id = t.lesson_id
    JOIN public.chapters ch ON ch.id = l.chapter_id
    WHERE t.user_id = e.user_id AND ch.course_id = e.course_id
    GROUP BY t.lesson_id
  ) s
) lp ON true
-- Questions (SIGNAL) : sans réponse = aucune réponse d'une AUTRE personne que l'autrice.
LEFT JOIN LATERAL (
  SELECT count(*) AS questions_asked,
         count(*) FILTER (WHERE s.unanswered) AS questions_unanswered,
         min(s.created_at) FILTER (WHERE s.unanswered) AS oldest_unanswered_at
  FROM (
    SELECT q.created_at,
           NOT EXISTS (SELECT 1 FROM public.lesson_questions r
                       WHERE r.parent_id = q.id AND r.user_id <> q.user_id) AS unanswered
    FROM public.lesson_questions q
    JOIN public.lessons l   ON l.id = q.lesson_id
    JOIN public.chapters ch ON ch.id = l.chapter_id
    WHERE q.user_id = e.user_id AND q.parent_id IS NULL AND ch.course_id = e.course_id
  ) s
) lq ON true
LEFT JOIN public.certificates ce ON ce.user_id = e.user_id AND ce.course_id = e.course_id
LEFT JOIN public.course_subscriptions cs ON cs.user_id = e.user_id AND cs.course_id = e.course_id
LEFT JOIN LATERAL (
  SELECT min(ps.next_due_date) AS next_due_date
  FROM public.pack_subscriptions ps
  JOIN public.course_pack_items i ON i.pack_id = ps.pack_id
  WHERE ps.user_id = e.user_id AND i.course_id = e.course_id AND ps.status = 'active'
) psub ON true;

COMMENT ON VIEW public.student_care_enrollments IS
  'Suivi pédagogique (095) : une ligne par inscription, lecture seule, service_role uniquement. Ne jamais additionner les lignes entre cours de niveau et anciens modules.';

-- ─── 3. Vue des signaux par élève (jamais comptés comme activité réelle) ────
CREATE OR REPLACE VIEW public.student_care_signals
WITH (security_invoker = true) AS
SELECT u.id AS user_id,
  (SELECT max(h.created_at) FROM public.login_history h WHERE h.user_id = u.id) AS last_login_logged_at,
  (SELECT max(a.created_at) FROM public.activity_log a WHERE a.user_id = u.id AND a.action = 'course_view') AS last_lesson_view_at,
  (SELECT max(r.sent_at) FROM public.reactivation_log r WHERE r.user_id = u.id) AS last_reactivation_at,
  (SELECT r.stage FROM public.reactivation_log r WHERE r.user_id = u.id ORDER BY r.sent_at DESC LIMIT 1) AS last_reactivation_stage,
  (SELECT max(m.sent_at) FROM public.learning_reminders m WHERE m.user_id = u.id) AS last_learning_reminder_at
FROM public.users u
WHERE EXISTS (SELECT 1 FROM public.enrollments e WHERE e.user_id = u.id);

COMMENT ON VIEW public.student_care_signals IS
  'Suivi pédagogique (095) : signaux par élève (connexion, leçon ouverte, relances déjà envoyées). Lecture seule, service_role uniquement.';

-- ─── 4. Droits : jamais l'API publique ──────────────────────────────────────
-- (Supabase accorde par défaut les nouveaux objets à anon/authenticated : on retire.)
REVOKE ALL ON public.student_care_enrollments, public.student_care_signals FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.student_care_enrollments, public.student_care_signals TO service_role;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'arazzo_reader') THEN
    EXECUTE 'REVOKE ALL ON public.student_care_enrollments, public.student_care_signals, public.student_care_settings FROM arazzo_reader';
  END IF;
END $$;

-- NB : CREATE OR REPLACE VIEW ne permet pas de réordonner les colonnes. Une
-- évolution future devra DROP VIEW + CREATE VIEW, puis REJOUER la section 4.
