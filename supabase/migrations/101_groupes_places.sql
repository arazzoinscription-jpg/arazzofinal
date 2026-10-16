-- ═══════════════════════════════════════════════════════════════════════════
-- 101 — GROUPES EN LIGNE À PLACES (inscription ouverte, places sur la landing)
-- ───────────────────────────────────────────────────────────────────────────
-- Dans l'espace formatrice, un groupe peut avoir un NIVEAU (cours), un NOMBRE
-- DE PLACES, une date de début, et « inscription ouverte ».
-- Une place est PRISE quand l'élève est inscrite au cours (paiement validé :
-- c'est à la validation que l'inscription est créée) : à chaque nouvelle
-- inscription au cours, elle est ajoutée AUTOMATIQUEMENT au groupe ouvert de ce
-- niveau qui a encore de la place (le plus ancien d'abord).
-- La landing lit les groupes ouverts : places prises (rouges) / restantes.
-- Aucune donnée existante n'est modifiée (colonnes ajoutées, « fermé » par défaut).
-- Se rejoue sans dommage.
--
-- Retour arrière :
--   DROP TRIGGER IF EXISTS enrollments_groupe_ouvert ON public.enrollments;
--   DROP FUNCTION IF EXISTS public.ajouter_au_groupe_ouvert();
--   ALTER TABLE public.groups DROP COLUMN IF EXISTS capacite, DROP COLUMN IF EXISTS inscription_ouverte,
--     DROP COLUMN IF EXISTS course_id, DROP COLUMN IF EXISTS debut;
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS capacite INTEGER;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS inscription_ouverte BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS debut DATE;

DO $$ BEGIN
  ALTER TABLE public.groups ADD CONSTRAINT groups_capacite_valide CHECK (capacite IS NULL OR capacite BETWEEN 1 AND 500);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS groups_ouverts_idx ON public.groups (course_id, created_at) WHERE inscription_ouverte;

-- Nouvelle inscription au cours → ajout au groupe ouvert de ce niveau qui a encore de la place.
CREATE OR REPLACE FUNCTION public.ajouter_au_groupe_ouvert() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g RECORD;
BEGIN
  -- Déjà dans un groupe ouvert de ce niveau : rien à faire.
  IF EXISTS (
    SELECT 1 FROM public.group_members gm JOIN public.groups gr ON gr.id = gm.group_id
    WHERE gm.user_id = NEW.user_id AND gr.course_id = NEW.course_id AND gr.inscription_ouverte
  ) THEN
    RETURN NEW;
  END IF;

  FOR g IN
    SELECT gr.id, gr.capacite FROM public.groups gr
    WHERE gr.inscription_ouverte AND gr.course_id = NEW.course_id
    ORDER BY gr.debut NULLS LAST, gr.created_at
    FOR UPDATE
  LOOP
    IF g.capacite IS NULL OR (SELECT count(*) FROM public.group_members WHERE group_id = g.id) < g.capacite THEN
      INSERT INTO public.group_members (group_id, user_id) VALUES (g.id, NEW.user_id)
      ON CONFLICT (group_id, user_id) DO NOTHING;
      RETURN NEW;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS enrollments_groupe_ouvert ON public.enrollments;
CREATE TRIGGER enrollments_groupe_ouvert
  AFTER INSERT ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.ajouter_au_groupe_ouvert();
