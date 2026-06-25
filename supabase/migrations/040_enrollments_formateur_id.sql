-- Ajoute le formateur sur les inscriptions et remplit les lignes existantes
ALTER TABLE public.enrollments
ADD COLUMN IF NOT EXISTS formateur_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Remplissage depuis le formateur du cours lié
UPDATE public.enrollments e
SET formateur_id = c.formateur_id
FROM public.courses c
WHERE e.course_id = c.id
  AND e.formateur_id IS NULL
  AND c.formateur_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_enrollments_formateur
ON public.enrollments(formateur_id);
