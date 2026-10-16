-- ═══════════════════════════════════════════════════════════════════════════
-- 104 — MESSAGERIE : photos, messages vocaux et vidéos rondes
-- ───────────────────────────────────────────────────────────────────────────
-- Un message peut porter UNE pièce : une photo, un message vocal (2 min max) ou une
-- vidéo ronde « face caméra » (1 min max).
-- Les fichiers vont dans un stockage PRIVÉ « messages » : seuls les deux membres
-- de la conversation les voient, par des liens temporaires créés par le serveur
-- (même principe que les preuves de paiement). Rien n'est public.
-- Une photo, un vocal ou une vidéo peut n'avoir aucun texte (body = '').
-- Aucune donnée existante n'est modifiée. Se rejoue sans dommage.
--
-- Retour arrière :
--   ALTER TABLE public.messages DROP COLUMN IF EXISTS piece_kind, DROP COLUMN IF EXISTS piece_path,
--     DROP COLUMN IF EXISTS piece_duree;
--   (le stockage « messages » peut être vidé puis supprimé depuis Supabase → Storage)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS piece_kind TEXT CHECK (piece_kind IN ('image', 'audio', 'video'));
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS piece_path TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS piece_duree INTEGER CHECK (piece_duree IS NULL OR piece_duree BETWEEN 1 AND 180);

-- Stockage privé (lu et écrit par le serveur uniquement, clé de service).
INSERT INTO storage.buckets (id, name, public)
VALUES ('messages', 'messages', FALSE)
ON CONFLICT (id) DO NOTHING;
