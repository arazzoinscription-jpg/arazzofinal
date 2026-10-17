-- ═══════════════════════════════════════════════════════════════════════════
-- 105 — STORIES : une vidéo LONGUE découpée en plusieurs stories
-- ───────────────────────────────────────────────────────────────────────────
-- • stories.debut_s : départ (en secondes) de cette story dans la vidéo Bunny.
--   Exemple : une vidéo de 1 min 05 = UNE vidéo envoyée, 3 stories à la suite
--   (départ 0 s, 22 s, 43 s), chacune de 30 s au plus, publiées ensemble.
-- • 0 par défaut : les stories existantes ne changent pas. Aucune donnée
--   existante n'est modifiée. Se rejoue sans dommage.
-- Prérequis : migration 099 (table stories).
--
-- Retour arrière :
--   ALTER TABLE public.stories DROP COLUMN IF EXISTS debut_s;
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS debut_s INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_debut_s_check;
ALTER TABLE public.stories ADD CONSTRAINT stories_debut_s_check CHECK (debut_s >= 0 AND debut_s <= 3600);

NOTIFY pgrst, 'reload schema';
