-- ═══════════════════════════════════════════════════════════════════════════
-- BILAN (LECTURE SEULE) : pourquoi des élèves n'apparaissent pas dans « Ma classe »
-- ───────────────────────────────────────────────────────────────────────────
-- À coller dans Supabase → SQL Editor → Run. Ne modifie RIEN (uniquement SELECT).
-- Pour vérifier une autre personne : remplacez l'e-mail sur la ligne « cible ».
--
-- Sections du résultat :
--   A · la personne recherchée : compte de connexion, profil (rôle), inscriptions,
--       groupes, et les e-mails qui lui ressemblent (faute de frappe, autre adresse) ;
--   B · la date de début du suivi pédagogique ;
--   C · élèves inscrites AVANT cette date : elles étaient cachées de « Ma classe »
--       (corrigé : la classe montre désormais toutes les inscriptions) ;
--   D · comptes inscrits à une formation mais dont le rôle n'est pas « élève »
--       (formatrice, admin…) : jamais affichés comme élèves ;
--   E · comptes élèves SANS aucune inscription (les 300 plus récents) : ils ne
--       peuvent apparaître dans aucune classe tant qu'ils ne sont pas inscrits.
-- ═══════════════════════════════════════════════════════════════════════════

WITH
cible AS (SELECT 'sousousirine1909@gmail.com'::text AS email),
reglage AS (SELECT (start_date::timestamp AT TIME ZONE 'Africa/Algiers') AS debut FROM public.student_care_settings LIMIT 1)
SELECT section, email, nom, detail FROM (

  SELECT 1 AS ordre, 'A · compte de connexion' AS section, au.email::text AS email, NULL::text AS nom,
         'créé le ' || to_char(au.created_at AT TIME ZONE 'Africa/Algiers', 'YYYY-MM-DD')
         || coalesce(' · dernière connexion ' || to_char(au.last_sign_in_at AT TIME ZONE 'Africa/Algiers', 'YYYY-MM-DD'), ' · jamais connectée') AS detail
  FROM auth.users au, cible WHERE lower(au.email) = lower(cible.email)

  UNION ALL
  SELECT 2, 'A · profil', u.email, u.nom, 'rôle : ' || coalesce(u.role, '(aucun)')
  FROM public.users u, cible WHERE lower(u.email) = lower(cible.email)

  UNION ALL
  SELECT 3, 'A · inscription', u.email, u.nom,
         coalesce(c.titre_fr, 'cours inconnu') || ' · payée le ' || to_char(e.paid_at AT TIME ZONE 'Africa/Algiers', 'YYYY-MM-DD')
         || CASE WHEN e.paid_at < (SELECT debut FROM reglage) THEN ' · AVANT la date du suivi' ELSE '' END
  FROM public.enrollments e
  JOIN public.users u ON u.id = e.user_id
  LEFT JOIN public.courses c ON c.id = e.course_id, cible
  WHERE lower(u.email) = lower(cible.email)

  UNION ALL
  SELECT 4, 'A · groupe', u.email, u.nom, g.name
  FROM public.group_members gm
  JOIN public.groups g ON g.id = gm.group_id
  JOIN public.users u ON u.id = gm.user_id, cible
  WHERE lower(u.email) = lower(cible.email)

  UNION ALL
  SELECT 5, 'A · e-mail ou nom ressemblant', u.email, u.nom, 'rôle : ' || coalesce(u.role, '(aucun)')
  FROM public.users u, cible
  WHERE (u.email ILIKE '%sousou%' OR u.email ILIKE '%sirine%' OR u.nom ILIKE '%sirine%' OR u.nom ILIKE '%sousou%')
    AND lower(u.email) <> lower(cible.email)

  UNION ALL
  SELECT 6, 'B · date de début du suivi', NULL, NULL,
         coalesce(to_char((SELECT debut FROM reglage) AT TIME ZONE 'Africa/Algiers', 'YYYY-MM-DD'), '(aucune)')

  UNION ALL
  SELECT 7, 'C · élève cachée (inscrite avant la date du suivi)', u.email, u.nom,
         string_agg(DISTINCT coalesce(c.titre_fr, '?'), ', ') || ' · dernière inscription '
         || to_char(max(e.paid_at) AT TIME ZONE 'Africa/Algiers', 'YYYY-MM-DD')
  FROM public.enrollments e
  JOIN public.users u ON u.id = e.user_id
  LEFT JOIN public.courses c ON c.id = e.course_id
  WHERE u.role = 'eleve'
  GROUP BY u.id, u.email, u.nom
  HAVING max(e.paid_at) < (SELECT debut FROM reglage)

  UNION ALL
  SELECT 8, 'D · inscrite mais rôle différent d''« élève »', u.email, u.nom, 'rôle : ' || coalesce(u.role, '(aucun)')
  FROM public.users u
  WHERE coalesce(u.role, '') <> 'eleve' AND EXISTS (SELECT 1 FROM public.enrollments e WHERE e.user_id = u.id)

  UNION ALL
  SELECT 9, 'E · compte élève sans aucune inscription', x.email, x.nom, x.detail
  FROM (
    SELECT u.email, u.nom, 'compte créé le ' || to_char(u.created_at AT TIME ZONE 'Africa/Algiers', 'YYYY-MM-DD') AS detail
    FROM public.users u
    WHERE u.role = 'eleve' AND NOT EXISTS (SELECT 1 FROM public.enrollments e WHERE e.user_id = u.id)
    ORDER BY u.created_at DESC
    LIMIT 300
  ) x

) t
ORDER BY ordre, email;
