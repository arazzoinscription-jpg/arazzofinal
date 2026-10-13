-- ═══════════════════════════════════════════════════════════════════════════
-- BILAN après la migration 096 (lives pédagogiques) — LECTURE SEULE
-- Un seul tableau : la colonne « ecarts » doit valoir 0 sur chaque ligne marquée
-- [0 attendu]. Les lignes [info] renseignent sans être des erreurs.
-- ═══════════════════════════════════════════════════════════════════════════
SELECT '[0 attendu] L1 aucune date de série créée deux fois' AS controle, count(*) AS ecarts FROM (
  SELECT series_id, occurrence_date FROM public.live_sessions WHERE series_id IS NOT NULL
  GROUP BY series_id, occurrence_date HAVING count(*) > 1) x
UNION ALL
SELECT '[0 attendu] L2 aucun rappel en double', count(*) FROM (
  SELECT session_id, moment, decalage_minutes, canal FROM public.live_reminders
  GROUP BY session_id, moment, decalage_minutes, canal HAVING count(*) > 1) x
UNION ALL
SELECT '[0 attendu] L3 aucun rappel « envoyé » sans confirmation', count(*) FROM public.live_reminders
  WHERE statut = 'envoye' AND (envoye_le IS NULL OR fournisseur_id IS NULL)
UNION ALL
SELECT '[0 attendu] L4 aucun rappel prévu pour un live annulé', count(*) FROM public.live_reminders r
  JOIN public.live_sessions s ON s.id = r.session_id WHERE r.statut = 'prevu' AND s.cancelled_at IS NOT NULL
UNION ALL
SELECT '[0 attendu] L5 lives du module verrouillés pour le cron existant (j1 + h1)', count(*) FROM public.live_sessions s
  WHERE s.created_via = 'admin_lives'
    AND (SELECT count(*) FROM public.session_reminders v WHERE v.session_id = s.id AND v.stage IN ('j1', 'h1')) < 2
UNION ALL
SELECT '[0 attendu] L6 niveau principal présent dans les niveaux du live', count(*) FROM public.live_sessions s
  WHERE s.created_via = 'admin_lives' AND s.course_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.live_session_courses c WHERE c.session_id = s.id AND c.course_id = s.course_id)
UNION ALL
SELECT '[0 attendu] L7 échéance des rappels prévus cohérente avec l''heure du live', count(*) FROM public.live_reminders r
  JOIN public.live_sessions s ON s.id = r.session_id
  WHERE r.statut = 'prevu' AND r.prevu_le <> CASE r.moment
    WHEN 'avant' THEN s.starts_at - make_interval(mins => r.decalage_minutes)
    WHEN 'debut' THEN s.starts_at
    ELSE s.starts_at + make_interval(mins => coalesce(s.duree_minutes, 0) + r.decalage_minutes) END
UNION ALL
SELECT '[0 attendu] L8 aucun live du module en double (même titre, même instant, non annulé)', count(*) FROM (
  SELECT titre, starts_at FROM public.live_sessions WHERE created_via = 'admin_lives' AND cancelled_at IS NULL
  GROUP BY titre, starts_at HAVING count(*) > 1) x
UNION ALL
SELECT '[0 attendu] F1 séries et rappels fermés à anon / authenticated / arazzo_reader', count(*) FROM (
  SELECT 1 FROM (VALUES ('public.live_series'), ('public.live_reminders')) o(objet)
  CROSS JOIN (SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'arazzo_reader')) r
  CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) p(privilege)
  WHERE has_table_privilege(r.rolname, o.objet, p.privilege)) x
UNION ALL
SELECT '[0 attendu] F2 niveaux d''un live : lecture seule pour les connectées, rien pour anon', count(*) FROM (
  SELECT 1 FROM (VALUES ('anon', 'SELECT'), ('anon', 'INSERT'), ('authenticated', 'INSERT'), ('authenticated', 'UPDATE'), ('authenticated', 'DELETE')) v(role, privilege)
  WHERE has_table_privilege(v.role, 'public.live_session_courses', v.privilege)) x
UNION ALL
SELECT '[0 attendu] F3 RLS active sur les 3 nouvelles tables', count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('live_series', 'live_reminders', 'live_session_courses') AND NOT c.relrowsecurity
UNION ALL
SELECT '[info] lives planifiés À VENIR par le formulaire formatrice avant le correctif (heure à vérifier : voir lives-horaires-a-verifier.sql)', count(*)
  FROM public.live_sessions WHERE created_via IS NULL AND live_url IS NULL AND access_token IS NULL AND starts_at > now();
  -- (après le déploiement du correctif de saisie, ajouter : AND created_at < '<date du déploiement>')

-- La liste détaillée (heure enregistrée, annoncée, proposée, preuve) et le modèle de
-- correction ciblée et idempotente sont dans scripts/sql/lives-horaires-a-verifier.sql.
-- Aucune heure ne doit être corrigée sans validation humaine.
