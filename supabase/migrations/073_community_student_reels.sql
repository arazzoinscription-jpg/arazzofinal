-- ─────────────────────────────────────────────────────────────────────────────
-- 073 — Reels des élèves dans le feed communauté
-- ─────────────────────────────────────────────────────────────────────────────
-- Les élèves peuvent publier de courtes vidéos « reel » (≤ 2 min) dans le feed,
-- comme les formateurs et patronnistes. Nouveau source_type « student_reel ».

ALTER TABLE public.community_media
  DROP CONSTRAINT IF EXISTS community_media_source_type_check;

ALTER TABLE public.community_media
  ADD CONSTRAINT community_media_source_type_check
  CHECK (source_type IN ('admin', 'course_teaser', 'practical', 'patron_demo', 'student_reel'));
