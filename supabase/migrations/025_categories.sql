-- 025 — Catégories / sous-catégories des formations (arborescence) + liaison aux cours

CREATE TABLE IF NOT EXISTS public.categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id  UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  name_fr    TEXT NOT NULL,
  name_ar    TEXT,
  slug       TEXT NOT NULL UNIQUE,
  ordre      INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);

CREATE TABLE IF NOT EXISTS public.course_categories (
  course_id   UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, category_id)
);
CREATE INDEX IF NOT EXISTS idx_cc_category ON public.course_categories(category_id);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='categories_read') THEN
    CREATE POLICY "categories_read" ON public.categories FOR SELECT USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='course_categories' AND policyname='cc_read') THEN
    CREATE POLICY "cc_read" ON public.course_categories FOR SELECT USING (TRUE);
  END IF;
END $$;

-- ── Seed de l'arborescence ──
-- Catégories racines
INSERT INTO public.categories (name_fr, slug, ordre) VALUES
  ('Modélisme', 'modelisme', 1),
  ('Stylisme', 'stylisme', 2),
  ('Artisanat', 'artisanat', 3),
  ('Accessoire', 'accessoire', 4),
  ('Modélisme industriel', 'modelisme-industriel', 5),
  ('Prêt-à-porter', 'pret-a-porter', 6),
  ('Haute couture', 'haute-couture', 7)
ON CONFLICT (slug) DO NOTHING;

-- Sous-groupes du Modélisme
INSERT INTO public.categories (parent_id, name_fr, slug, ordre)
SELECT c.id, x.name, x.slug, x.ordre
FROM public.categories c
CROSS JOIN (VALUES
  ('Modélisme femme', 'modelisme-femme', 1),
  ('Modélisme homme', 'modelisme-homme', 2),
  ('Modélisme enfants', 'modelisme-enfants', 3),
  ('Patron numérique', 'patron-numerique', 4)
) AS x(name, slug, ordre)
WHERE c.slug = 'modelisme'
ON CONFLICT (slug) DO NOTHING;

-- Niveaux : Femme 1→5
INSERT INTO public.categories (parent_id, name_fr, slug, ordre)
SELECT c.id, 'Niveau ' || g, 'modelisme-femme-niveau-' || g, g
FROM public.categories c, generate_series(1, 5) g
WHERE c.slug = 'modelisme-femme'
ON CONFLICT (slug) DO NOTHING;

-- Niveaux : Homme 1→3 (gradation)
INSERT INTO public.categories (parent_id, name_fr, slug, ordre)
SELECT c.id, 'Niveau ' || g || ' (gradation)', 'modelisme-homme-niveau-' || g, g
FROM public.categories c, generate_series(1, 3) g
WHERE c.slug = 'modelisme-homme'
ON CONFLICT (slug) DO NOTHING;

-- Niveaux : Enfants 1→3 (gradation)
INSERT INTO public.categories (parent_id, name_fr, slug, ordre)
SELECT c.id, 'Niveau ' || g || ' (gradation)', 'modelisme-enfants-niveau-' || g, g
FROM public.categories c, generate_series(1, 3) g
WHERE c.slug = 'modelisme-enfants'
ON CONFLICT (slug) DO NOTHING;

-- Niveaux : Patron numérique 1→3
INSERT INTO public.categories (parent_id, name_fr, slug, ordre)
SELECT c.id, 'Niveau ' || g, 'patron-numerique-niveau-' || g, g
FROM public.categories c, generate_series(1, 3) g
WHERE c.slug = 'patron-numerique'
ON CONFLICT (slug) DO NOTHING;
