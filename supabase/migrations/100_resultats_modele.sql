-- ═══════════════════════════════════════════════════════════════════════════
-- 100 — RÉSULTAT DU MODÈLE (« Mon modèle est en cours » → « Voir mon résultat »)
-- ───────────────────────────────────────────────────────────────────────────
-- L'élève publie la photo (ou la vidéo) de son modèle terminé : c'est une
-- publication de la communauté d'un nouveau type « student_result ».
-- Pendant 24 h, le feed affiche une alerte « Bravo ! … a terminé son modèle »
-- (calculée à l'affichage d'après created_at) ; ensuite, c'est une publication
-- comme les autres sur son profil.
-- Seule la contrainte des types de source est élargie (les valeurs existantes
-- restent valides). Se rejoue sans dommage.
--
-- Retour arrière (seulement s'il n'existe aucune ligne 'student_result') :
--   ALTER TABLE public.community_media DROP CONSTRAINT IF EXISTS community_media_source_type_check;
--   ALTER TABLE public.community_media ADD CONSTRAINT community_media_source_type_check
--     CHECK (source_type IN ('admin', 'course_teaser', 'practical', 'patron_demo', 'student_reel'));
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.community_media
  DROP CONSTRAINT IF EXISTS community_media_source_type_check;

ALTER TABLE public.community_media
  ADD CONSTRAINT community_media_source_type_check
  CHECK (source_type IN ('admin', 'course_teaser', 'practical', 'patron_demo', 'student_reel', 'student_result'));
