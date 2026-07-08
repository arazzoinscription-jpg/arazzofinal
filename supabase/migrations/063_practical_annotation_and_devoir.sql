-- ─────────────────────────────────────────────────────────────────────────────
-- 063 — Annotation des travaux pratiques + devoir bilingue + idées pratiques
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Image d'annotation (la photo corrigée par le formateur, dessin par-dessus).
ALTER TABLE public.lesson_practicals
  ADD COLUMN IF NOT EXISTS annotation_url TEXT;

-- 2) Devoir standard bilingue (FR + AR) + une IDÉE PRATIQUE différente par leçon.
--    On ne met à jour QUE les leçons portant le texte par défaut de la migration
--    062 (les devoirs personnalisés par le formateur sont préservés).
DO $$
DECLARE
  old_default text := 'Résumer le cours + dessiner le patron + vidéo de montage d''une pièce.';
  base_fr text := 'Résumé du cours + dessin du patron (s''il y en a un dans la leçon) + vidéo d''une pièce que vous avez cousue.';
  base_ar text := 'تلخيص الدرس مع رسم الباترون إن وُجد في الدرس مع فيديو لقطعة قمت بخياطتها.';
  ideas text[] := ARRAY[
    'Réaliser un ourlet propre et le filmer en vidéo.',
    'Faire un essayage sur toile (tissu d''essayage) et photographier le résultat.',
    'Coudre une pince et montrer l''endroit et l''envers.',
    'Poser une fermeture éclair invisible.',
    'Monter une manche et filmer l''emmanchure.',
    'Réaliser une boutonnière et coudre un bouton.',
    'Assembler une couture anglaise et la surfiler.',
    'Poser un biais sur une encolure courbe.'
  ];
BEGIN
  WITH ordered AS (
    SELECT l.id,
           (row_number() OVER (PARTITION BY ch.course_id ORDER BY ch.ordre, l.ordre)) AS rn
    FROM public.lessons l
    JOIN public.chapters ch ON ch.id = l.chapter_id
  )
  UPDATE public.lessons l
  SET devoir = base_fr || E'\n' || base_ar
             || E'\n\n💡 Idée pratique : ' || ideas[((o.rn - 1) % array_length(ideas, 1)) + 1]
  FROM ordered o
  WHERE l.id = o.id
    AND (l.devoir = old_default OR l.devoir IS NULL OR btrim(l.devoir) = '');
END $$;
