-- ═══════════════════════════════════════════════════════════════════════════
-- 108 — COMMENTAIRES VOCAUX DANS LE FEED (La Cour)
-- ───────────────────────────────────────────────────────────────────────────
-- • comments.audio_path : le fichier du commentaire vocal (stockage public
--   « posts », dossier commentaires-vocaux/<personne>/…) ; NULL = commentaire écrit.
-- • comments.audio_duree : sa durée en secondes (1 minute au plus).
-- Aucune donnée existante n'est modifiée. Se rejoue sans dommage.
--
-- Retour arrière :
--   ALTER TABLE public.comments DROP COLUMN IF EXISTS audio_path, DROP COLUMN IF EXISTS audio_duree;
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS audio_path TEXT;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS audio_duree INTEGER;
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_audio_duree_check;
ALTER TABLE public.comments ADD CONSTRAINT comments_audio_duree_check CHECK (audio_duree IS NULL OR audio_duree BETWEEN 1 AND 60);

NOTIFY pgrst, 'reload schema';
