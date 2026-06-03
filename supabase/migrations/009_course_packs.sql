-- ════════════════════════════════════════════════════════════════════
-- 009 — Packs de cours (bundles)
-- Un pack regroupe plusieurs cours vendus ensemble à un tarif unique.
-- Idempotent : CREATE ... IF NOT EXISTS + garde DO pour les policies.
-- ════════════════════════════════════════════════════════════════════

-- Pack de cours
CREATE TABLE IF NOT EXISTS public.course_packs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre_fr        TEXT NOT NULL,
  titre_ar        TEXT,
  slug            TEXT NOT NULL UNIQUE,
  description_fr  TEXT,
  description_ar  TEXT,
  prix_dzd        INTEGER NOT NULL DEFAULT 0,
  prix_eur        NUMERIC(10,2) NOT NULL DEFAULT 0,
  thumbnail       TEXT,
  formateur_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  published       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_packs_slug ON public.course_packs(slug);
CREATE INDEX IF NOT EXISTS idx_course_packs_formateur ON public.course_packs(formateur_id);
CREATE INDEX IF NOT EXISTS idx_course_packs_published ON public.course_packs(published);

-- Cours inclus dans un pack (relation N-N)
CREATE TABLE IF NOT EXISTS public.course_pack_items (
  pack_id    UUID NOT NULL REFERENCES public.course_packs(id) ON DELETE CASCADE,
  course_id  UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  PRIMARY KEY (pack_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_pack_items_pack ON public.course_pack_items(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_items_course ON public.course_pack_items(course_id);

-- ── RLS ──
ALTER TABLE public.course_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_pack_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Lecture : pack publié pour tous, sinon le formateur propriétaire
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='course_packs' AND policyname='packs_read') THEN
    CREATE POLICY "packs_read" ON public.course_packs FOR SELECT
      USING (published = TRUE OR auth.uid() = formateur_id);
  END IF;

  -- Création : seul le formateur propriétaire
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='course_packs' AND policyname='packs_insert') THEN
    CREATE POLICY "packs_insert" ON public.course_packs FOR INSERT
      WITH CHECK (auth.uid() = formateur_id);
  END IF;

  -- Mise à jour : le formateur propriétaire
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='course_packs' AND policyname='packs_update') THEN
    CREATE POLICY "packs_update" ON public.course_packs FOR UPDATE
      USING (auth.uid() = formateur_id);
  END IF;

  -- Suppression : le formateur propriétaire
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='course_packs' AND policyname='packs_delete') THEN
    CREATE POLICY "packs_delete" ON public.course_packs FOR DELETE
      USING (auth.uid() = formateur_id);
  END IF;

  -- Items : lisibles si le pack est lisible
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='course_pack_items' AND policyname='pack_items_read') THEN
    CREATE POLICY "pack_items_read" ON public.course_pack_items FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.course_packs p
                     WHERE p.id = pack_id AND (p.published OR p.formateur_id = auth.uid())));
  END IF;

  -- Items : gérés par le formateur propriétaire du pack
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='course_pack_items' AND policyname='pack_items_manage') THEN
    CREATE POLICY "pack_items_manage" ON public.course_pack_items FOR ALL
      USING (EXISTS (SELECT 1 FROM public.course_packs p
                     WHERE p.id = pack_id AND p.formateur_id = auth.uid()));
  END IF;
END $$;
