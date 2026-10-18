-- ═══════════════════════════════════════════════════════════════════════════
-- 107 — NOTIFICATIONS DE LA COUR + SON PROPRE DES VIDÉOS DU FEED
-- ───────────────────────────────────────────────────────────────────────────
-- • users.notif_cour : l'interrupteur « Notifications de La Cour » (Préférences).
--   Activé par défaut ; une élève peut le couper sans couper les notifications
--   importantes (cours, cloche, messages).
-- • Index (type, created_at) sur notifications : savoir vite qui a déjà été
--   prévenue dans les 3 dernières heures (au plus une notification « La Cour »
--   toutes les 3 h par personne).
-- • community_media.son_propre : la vidéo a-t-elle SON propre son (parole,
--   musique) ? Mesuré à la publication, dans le téléphone. true → le feed garde
--   le son de la vidéo ; false (muette / bruit de fond) → musique automatique ;
--   NULL (anciennes vidéos, non mesurées) → la vidéo garde son son.
-- Aucune donnée existante n'est modifiée. Se rejoue sans dommage.
--
-- Retour arrière :
--   DROP INDEX IF EXISTS public.notifications_type_date_idx;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS notif_cour;
--   ALTER TABLE public.community_media DROP COLUMN IF EXISTS son_propre;
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notif_cour BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS notifications_type_date_idx ON public.notifications (type, created_at DESC);

ALTER TABLE public.community_media ADD COLUMN IF NOT EXISTS son_propre BOOLEAN;

NOTIFY pgrst, 'reload schema';
