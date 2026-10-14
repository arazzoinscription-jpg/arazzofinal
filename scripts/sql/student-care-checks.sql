-- ═══════════════════════════════════════════════════════════════════════════
-- Contrôles du SUIVI PÉDAGOGIQUE (migration 095) — LECTURE SEULE
-- ───────────────────────────────────────────────────────────────────────────
-- Uniquement des SELECT. Exécutés par scripts/recette/verifier-student-care.mjs
-- sur le projet de RECETTE. En production : seulement avec une autorisation
-- explicite, et seulement les contrôles marqués [info].
--
-- Convention : chaque bloc commence par
--   -- @controle CODE [vide|info] : description
-- [vide] = doit rendre ZÉRO ligne (sinon chaque ligne est un écart).
-- [info] = renseignement à lire (volumes, correspondances).
-- ═══════════════════════════════════════════════════════════════════════════

-- @controle A_NIVEAUX [info] : les 3 cours de src/lib/niveaux.ts et les slugs de scripts/build-levels.mjs
SELECT c.id, c.slug, c.titre_fr, c.published,
       CASE c.id
         WHEN '23bee490-103a-492d-9253-256178658e02' THEN 'N1 (niveaux.ts)'
         WHEN 'b100190c-4f95-4f63-bd22-7a561f9666de' THEN 'N2 (niveaux.ts)'
         WHEN 'de1da439-6dc9-4cf0-9526-e44af4c5073b' THEN 'N3 (niveaux.ts)'
         ELSE 'absent de niveaux.ts'
       END AS selon_niveaux_ts
FROM public.courses c
WHERE c.id IN ('23bee490-103a-492d-9253-256178658e02', 'b100190c-4f95-4f63-bd22-7a561f9666de', 'de1da439-6dc9-4cf0-9526-e44af4c5073b')
   OR c.slug IN ('niveau-1-bases-vetements-quotidiens', 'niveau-2-classique-soiree', 'niveau-3-soiree-moulage')
ORDER BY c.slug;

-- @controle B_DOUBLE_STRUCTURE [info] : élèves inscrites à un cours de niveau ET à d'anciens modules
SELECT count(DISTINCT e1.user_id) AS eleves_niveau_et_modules
FROM public.enrollments e1
WHERE e1.course_id IN ('23bee490-103a-492d-9253-256178658e02', 'b100190c-4f95-4f63-bd22-7a561f9666de', 'de1da439-6dc9-4cf0-9526-e44af4c5073b')
  AND EXISTS (
    SELECT 1 FROM public.enrollments e2 JOIN public.courses c2 ON c2.id = e2.course_id
    WHERE e2.user_id = e1.user_id AND (c2.titre_ar LIKE 'المحور%' OR c2.titre_fr LIKE 'المحور%')
  );

-- @controle C_COUVERTURE [info] : première ligne de chaque source (avant = donnée indisponible)
SELECT 'activity_log' AS source, min(created_at) AS premiere_ligne FROM public.activity_log
UNION ALL SELECT 'login_history', min(created_at) FROM public.login_history
UNION ALL SELECT 'video_progress', min(updated_at) FROM public.video_progress
UNION ALL SELECT 'notifications', min(created_at) FROM public.notifications
UNION ALL SELECT 'email_log', min(created_at) FROM public.email_log
UNION ALL SELECT 'progress', min(completed_at) FROM public.progress;

-- @controle D_VOLUMES [info] : volumes (dimensionnement de la pagination)
SELECT (SELECT count(*) FROM public.enrollments)      AS inscriptions,
       (SELECT count(*) FROM public.progress)         AS lecons_terminees,
       (SELECT count(*) FROM public.video_progress)   AS videos,
       (SELECT count(*) FROM public.lesson_practicals) AS travaux,
       (SELECT count(*) FROM public.quiz_attempts)    AS tentatives_quiz,
       (SELECT count(*) FROM public.users WHERE role = 'eleve') AS eleves;

-- @controle E1_LECONS [vide] : leçons terminées de la vue = comptage direct
SELECT v.enrollment_id, v.lessons_done, d.n AS direct
FROM public.student_care_enrollments v
CROSS JOIN LATERAL (
  SELECT count(*) AS n FROM public.progress p
  JOIN public.lessons l ON l.id = p.lesson_id JOIN public.chapters ch ON ch.id = l.chapter_id
  WHERE p.user_id = v.user_id AND ch.course_id = v.course_id
) d
WHERE v.lessons_done <> d.n;

-- @controle E2_MODULES [vide] : un module compté terminé a TOUTES ses leçons terminées (contrôle indépendant)
SELECT v.enrollment_id, v.chapters_done, d.n AS direct
FROM public.student_care_enrollments v
CROSS JOIN LATERAL (
  SELECT count(*) AS n FROM public.chapters ch
  WHERE ch.course_id = v.course_id
    AND EXISTS (SELECT 1 FROM public.lessons l WHERE l.chapter_id = ch.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.chapter_id = ch.id
        AND NOT EXISTS (SELECT 1 FROM public.progress p WHERE p.lesson_id = l.id AND p.user_id = v.user_id)
    )
) d
WHERE v.chapters_done <> d.n;

-- @controle E3_BORNES [vide] : aucune valeur impossible (fait ≤ total, compteurs ≥ 0)
SELECT enrollment_id, lessons_done, lessons_total, chapters_done, chapters_total
FROM public.student_care_enrollments
WHERE lessons_done > lessons_total OR chapters_done > chapters_total
   OR lessons_done < 0 OR quiz_attempts < 0 OR practical_lessons < 0
   OR practicals_approved + practicals_waiting_review + practicals_to_redo > practical_lessons;

-- @controle E4_QUIZ_EPUISES [vide] : quiz épuisés = recalcul indépendant
SELECT v.enrollment_id, v.quizzes_exhausted, d.n AS direct
FROM public.student_care_enrollments v
CROSS JOIN LATERAL (
  SELECT count(*) AS n FROM (
    SELECT qz.id FROM public.quizzes qz
    JOIN public.lessons l ON l.id = qz.lesson_id JOIN public.chapters ch ON ch.id = l.chapter_id
    WHERE ch.course_id = v.course_id
      AND (SELECT count(*) FROM public.quiz_attempts a WHERE a.quiz_id = qz.id AND a.student_id = v.user_id) >= qz.max_attempts
      AND NOT EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.quiz_id = qz.id AND a.student_id = v.user_id AND a.passed)
  ) x
) d
WHERE v.quizzes_exhausted <> d.n;

-- @controle E5_TRAVAUX [vide] : états des travaux PAR LEÇON = recalcul indépendant
SELECT v.enrollment_id, v.practicals_approved, v.practicals_waiting_review, v.practicals_to_redo, d.*
FROM public.student_care_enrollments v
CROSS JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.lesson_practicals t WHERE t.lesson_id = l.id AND t.user_id = v.user_id AND t.status = 'approved')) AS valides,
    count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM public.lesson_practicals t WHERE t.lesson_id = l.id AND t.user_id = v.user_id AND t.status = 'approved')
                       AND EXISTS (SELECT 1 FROM public.lesson_practicals t WHERE t.lesson_id = l.id AND t.user_id = v.user_id AND t.status = 'submitted')) AS a_corriger,
    count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM public.lesson_practicals t WHERE t.lesson_id = l.id AND t.user_id = v.user_id AND t.status IN ('approved', 'submitted'))
                       AND EXISTS (SELECT 1 FROM public.lesson_practicals t WHERE t.lesson_id = l.id AND t.user_id = v.user_id AND t.status = 'reviewed')) AS a_refaire
  FROM public.lessons l JOIN public.chapters ch ON ch.id = l.chapter_id
  WHERE ch.course_id = v.course_id
) d
WHERE (v.practicals_approved, v.practicals_waiting_review, v.practicals_to_redo) <> (d.valides, d.a_corriger, d.a_refaire);

-- @controle E6_QUESTIONS [vide] : questions sans réponse d'une autre personne = recalcul indépendant
SELECT v.enrollment_id, v.questions_unanswered, d.n AS direct
FROM public.student_care_enrollments v
CROSS JOIN LATERAL (
  SELECT count(*) AS n FROM public.lesson_questions q
  JOIN public.lessons l ON l.id = q.lesson_id JOIN public.chapters ch ON ch.id = l.chapter_id
  WHERE q.user_id = v.user_id AND q.parent_id IS NULL AND ch.course_id = v.course_id
    AND (SELECT count(*) FROM public.lesson_questions r WHERE r.parent_id = q.id AND r.user_id <> q.user_id) = 0
) d
WHERE v.questions_unanswered <> d.n;

-- @controle E7_UNE_LIGNE_PAR_INSCRIPTION [vide] : la vue ne duplique ni ne perd aucune inscription
SELECT 'ecart' AS probleme, (SELECT count(*) FROM public.enrollments) AS inscriptions,
       (SELECT count(*) FROM public.student_care_enrollments) AS lignes_vue,
       (SELECT count(DISTINCT enrollment_id) FROM public.student_care_enrollments) AS distinctes
WHERE (SELECT count(*) FROM public.enrollments) <> (SELECT count(*) FROM public.student_care_enrollments)
   OR (SELECT count(*) FROM public.student_care_enrollments) <> (SELECT count(DISTINCT enrollment_id) FROM public.student_care_enrollments);

-- @controle F1_DROITS [vide] : aucun droit pour anon / authenticated / arazzo_reader
SELECT r.rolname, o.objet, p.privilege
FROM (VALUES ('public.student_care_enrollments'), ('public.student_care_signals'), ('public.student_care_settings')) AS o(objet)
CROSS JOIN (SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'arazzo_reader')) r
CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) AS p(privilege)
WHERE has_table_privilege(r.rolname, o.objet, p.privilege);

-- @controle F2_SECURITY_INVOKER [vide] : les deux vues s'exécutent avec les droits de l'appelant
SELECT c.relname
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('student_care_enrollments', 'student_care_signals')
  AND NOT coalesce('security_invoker=true' = ANY (c.reloptions), false);

-- @controle F3_REGLAGES_RLS [vide] : RLS active et AUCUNE policy sur les réglages ; une seule ligne
SELECT 'rls_inactive' AS probleme FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'student_care_settings' AND NOT c.relrowsecurity
UNION ALL
SELECT 'policy_presente:' || policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_care_settings'
UNION ALL
SELECT 'nombre_de_lignes:' || count(*) FROM public.student_care_settings HAVING count(*) <> 1;
