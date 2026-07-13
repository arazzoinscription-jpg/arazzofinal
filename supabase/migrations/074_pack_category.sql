-- ─────────────────────────────────────────────────────────────────────────────
-- 074 — Catégorie d'un pack de cours (affichage dans l'offre)
-- ─────────────────────────────────────────────────────────────────────────────
-- Permet de ranger un pack sous une catégorie (ex. « Modélisme femme ») pour
-- qu'il apparaisse dans la page Offre quand on clique sur cette catégorie.
-- NULL = pack non rangé (n'apparaît pas dans une catégorie de l'offre).

ALTER TABLE public.course_packs
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_course_packs_category ON public.course_packs(category_id);
