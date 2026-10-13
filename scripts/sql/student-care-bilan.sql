-- ═══════════════════════════════════════════════════════════════════════════
-- BILAN après la migration 095 — LECTURE SEULE (uniquement des SELECT)
-- À coller dans Supabase → SQL Editor → Run. Un seul tableau en résultat :
-- la colonne « ecarts » doit valoir 0 sur CHAQUE ligne.
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'E1 leçons terminées = comptage direct' AS controle, count(*) AS ecarts FROM (
  SELECT v.enrollment_id FROM public.student_care_enrollments v
  CROSS JOIN LATERAL (SELECT count(*) AS n FROM public.progress p JOIN public.lessons l ON l.id = p.lesson_id
    JOIN public.chapters ch ON ch.id = l.chapter_id WHERE p.user_id = v.user_id AND ch.course_id = v.course_id) d
  WHERE v.lessons_done <> d.n) x
UNION ALL
SELECT 'E2 modules terminés = recalcul indépendant', count(*) FROM (
  SELECT v.enrollment_id FROM public.student_care_enrollments v
  CROSS JOIN LATERAL (SELECT count(*) AS n FROM public.chapters ch WHERE ch.course_id = v.course_id
    AND EXISTS (SELECT 1 FROM public.lessons l WHERE l.chapter_id = ch.id)
    AND NOT EXISTS (SELECT 1 FROM public.lessons l WHERE l.chapter_id = ch.id
      AND NOT EXISTS (SELECT 1 FROM public.progress p WHERE p.lesson_id = l.id AND p.user_id = v.user_id))) d
  WHERE v.chapters_done <> d.n) x
UNION ALL
SELECT 'E3 aucune valeur impossible', count(*) FROM public.student_care_enrollments
  WHERE lessons_done > lessons_total OR chapters_done > chapters_total
     OR practicals_approved + practicals_waiting_review + practicals_to_redo > practical_lessons
UNION ALL
SELECT 'E4 quiz épuisés = recalcul indépendant', count(*) FROM (
  SELECT v.enrollment_id FROM public.student_care_enrollments v
  CROSS JOIN LATERAL (SELECT count(*) AS n FROM public.quizzes qz JOIN public.lessons l ON l.id = qz.lesson_id
    JOIN public.chapters ch ON ch.id = l.chapter_id WHERE ch.course_id = v.course_id
    AND (SELECT count(*) FROM public.quiz_attempts a WHERE a.quiz_id = qz.id AND a.student_id = v.user_id) >= qz.max_attempts
    AND NOT EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.quiz_id = qz.id AND a.student_id = v.user_id AND a.passed)) d
  WHERE v.quizzes_exhausted <> d.n) x
UNION ALL
SELECT 'E5 travaux par leçon = recalcul indépendant', count(*) FROM (
  SELECT v.enrollment_id FROM public.student_care_enrollments v
  CROSS JOIN LATERAL (SELECT
    count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.lesson_practicals t WHERE t.lesson_id = l.id AND t.user_id = v.user_id AND t.status = 'approved')) AS ok,
    count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM public.lesson_practicals t WHERE t.lesson_id = l.id AND t.user_id = v.user_id AND t.status = 'approved')
      AND EXISTS (SELECT 1 FROM public.lesson_practicals t WHERE t.lesson_id = l.id AND t.user_id = v.user_id AND t.status = 'submitted')) AS att,
    count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM public.lesson_practicals t WHERE t.lesson_id = l.id AND t.user_id = v.user_id AND t.status IN ('approved', 'submitted'))
      AND EXISTS (SELECT 1 FROM public.lesson_practicals t WHERE t.lesson_id = l.id AND t.user_id = v.user_id AND t.status = 'reviewed')) AS ref
    FROM public.lessons l JOIN public.chapters ch ON ch.id = l.chapter_id WHERE ch.course_id = v.course_id) d
  WHERE (v.practicals_approved, v.practicals_waiting_review, v.practicals_to_redo) <> (d.ok, d.att, d.ref)) x
UNION ALL
SELECT 'E6 questions sans réponse = recalcul indépendant', count(*) FROM (
  SELECT v.enrollment_id FROM public.student_care_enrollments v
  CROSS JOIN LATERAL (SELECT count(*) AS n FROM public.lesson_questions q JOIN public.lessons l ON l.id = q.lesson_id
    JOIN public.chapters ch ON ch.id = l.chapter_id
    WHERE q.user_id = v.user_id AND q.parent_id IS NULL AND ch.course_id = v.course_id
      AND NOT EXISTS (SELECT 1 FROM public.lesson_questions r WHERE r.parent_id = q.id AND r.user_id <> q.user_id)) d
  WHERE v.questions_unanswered <> d.n) x
UNION ALL
SELECT 'E7 une ligne par inscription (ni doublon ni perte)',
  abs((SELECT count(*) FROM public.enrollments) - (SELECT count(*) FROM public.student_care_enrollments))
  + ((SELECT count(*) FROM public.student_care_enrollments) - (SELECT count(DISTINCT enrollment_id) FROM public.student_care_enrollments))
UNION ALL
SELECT 'F1 aucun droit pour anon / authenticated / arazzo_reader', count(*) FROM (
  SELECT 1 FROM (VALUES ('public.student_care_enrollments'), ('public.student_care_signals'), ('public.student_care_settings')) o(objet)
  CROSS JOIN (SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'arazzo_reader')) r
  CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) p(privilege)
  WHERE has_table_privilege(r.rolname, o.objet, p.privilege)) x
UNION ALL
SELECT 'F2 vues en security_invoker', count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('student_care_enrollments', 'student_care_signals')
    AND NOT coalesce('security_invoker=true' = ANY (c.reloptions), false)
UNION ALL
SELECT 'F3 réglages : RLS active, aucune policy, 1 seule ligne',
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'student_care_settings' AND NOT c.relrowsecurity)
  + (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_care_settings')
  + abs((SELECT count(*) FROM public.student_care_settings) - 1);
