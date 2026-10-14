-- ═══════════════════════════════════════════════════════════════════════════
-- LIVES À L'HEURE POSSIBLEMENT DÉCALÉE — LECTURE SEULE (aucune écriture).
-- Fonctionne avec ou sans la migration 096.
--
-- Cause : le formulaire /formateur/sessions envoyait « 2026-10-20T19:00 » (heure saisie,
-- pensée à Alger) ; le serveur (Vercel, UTC) l'enregistrait comme 19:00 UTC = 20:00 à Alger.
-- MAIS l'ancien affichage (pages élève/formatrice) et les rappels du cron formataient
-- aussi en UTC : tout le monde a donc VU « 19:00 ». L'instant enregistré est en avance
-- d'une heure sur l'heure annoncée.
--
-- Concernés : les lives planifiés (pas les directs « Passer en direct », dont l'instant
-- est pris au clic et qui ont un jeton + un lien de diffusion), hors module /admin/lives.
--
-- Colonnes :
--   heure_enregistree_utc  valeur actuelle en base
--   heure_annoncee         ce que les pages et rappels affichaient (= saisie de la formatrice)
--   heure_si_non_corrige   ce qu'afficheraient les pages APRÈS déploiement du correctif d'affichage
--   instant_corrige_utc    proposition : enregistré − 1 h (s'affichera = heure annoncée)
--   preuve_rappel          un rappel du cron annonçant exactement l'heure_annoncee a été enregistré
-- ═══════════════════════════════════════════════════════════════════════════
SELECT
  s.id,
  s.titre,
  u.nom                                                                    AS formatrice,
  c.titre_fr                                                               AS cours,
  CASE WHEN s.starts_at > now() THEN 'À VENIR' ELSE 'passé' END           AS statut,
  to_char(s.created_at AT TIME ZONE 'Africa/Algiers', 'YYYY-MM-DD HH24:MI') AS cree_le_alger,
  to_char(s.starts_at  AT TIME ZONE 'UTC',            'YYYY-MM-DD HH24:MI') AS heure_enregistree_utc,
  to_char(s.starts_at  AT TIME ZONE 'UTC',            'YYYY-MM-DD HH24:MI') AS heure_annoncee,
  to_char(s.starts_at  AT TIME ZONE 'Africa/Algiers', 'YYYY-MM-DD HH24:MI') AS heure_si_non_corrige,
  to_char((s.starts_at - interval '1 hour') AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') AS instant_corrige_utc,
  (SELECT string_agg(r.stage, '+' ORDER BY r.stage) FROM public.session_reminders r WHERE r.session_id = s.id) AS rappels_cron,
  EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.type = 'session'
      AND n.title LIKE '%: ' || replace(replace(replace(s.titre, '\', '\\'), '%', '\%'), '_', '\_')
      AND n.body LIKE '%à ' || to_char(s.starts_at AT TIME ZONE 'UTC', 'HH24:MI') || '%'
      AND n.created_at BETWEEN s.starts_at - interval '30 hours' AND s.starts_at + interval '2 hours'
  )                                                                        AS preuve_rappel,
  CASE
    WHEN s.starts_at <= now() THEN 'Aucune action requise (passé) — à corriger seulement pour l''historique, sur décision.'
    ELSE 'Confirmer l''heure avec la formatrice, puis appliquer la correction ciblée (modèle ci-dessous).'
  END                                                                      AS methode
FROM public.live_sessions s
LEFT JOIN public.users   u ON u.id = s.formateur_id
LEFT JOIN public.courses c ON c.id = s.course_id
WHERE s.live_url IS NULL
  AND s.access_token IS NULL
  AND (to_jsonb(s) ->> 'created_via') IS DISTINCT FROM 'admin_lives'   -- colonne 096 : absente = NULL
  -- Une fois le correctif de saisie déployé, ajouter : AND s.created_at < '<date du déploiement>'
ORDER BY s.starts_at;

-- ─── CORRECTION — MODÈLE, NE PAS EXÉCUTER sans validation humaine ───────────
-- Une ligne par live VALIDÉ avec la formatrice. Le garde « starts_at = valeur lue »
-- rend la correction idempotente (relancée par erreur, elle ne décale pas de 2 h).
-- À faire DANS LA MÊME FENÊTRE que le déploiement du correctif d'affichage, sinon les
-- élèves verraient l'heure bouger d'1 h dans un sens puis dans l'autre.
--
-- BEGIN;
--   UPDATE public.live_sessions
--      SET starts_at = starts_at - interval '1 hour'
--    WHERE id = '<id validé>'
--      AND starts_at = '<heure_enregistree_utc lue>+00'::timestamptz;   -- doit toucher 1 ligne
--   -- Si le rappel J-1/H-1 du cron n'a pas encore été envoyé, il partira à la nouvelle
--   -- heure (le cron relit starts_at) ; rien à faire de plus.
-- COMMIT;
