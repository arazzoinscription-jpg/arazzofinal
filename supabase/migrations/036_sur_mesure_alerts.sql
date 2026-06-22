-- Commandes sur mesure : médias du modèle + mécanisme d'alerte/attribution aux patronnistes.
-- - photo_url / video_url : référence visuelle du modèle (stockées côté client dans le bucket public `practicals`, dossier sur-mesure/).
-- - claimed_at : quand un patronniste a pris la commande (patronniste_id devient le responsable).
-- - second_signal_at : quand la 2ᵉ alerte (après 24 h sans preneur) a été envoyée aux autres patronnistes.
ALTER TABLE public.patron_custom_orders ADD COLUMN IF NOT EXISTS photo_url        TEXT;
ALTER TABLE public.patron_custom_orders ADD COLUMN IF NOT EXISTS video_url        TEXT;
ALTER TABLE public.patron_custom_orders ADD COLUMN IF NOT EXISTS claimed_at       TIMESTAMPTZ;
ALTER TABLE public.patron_custom_orders ADD COLUMN IF NOT EXISTS second_signal_at TIMESTAMPTZ;

-- Index pour retrouver vite les commandes non attribuées (alerte) et les retardataires (24 h).
CREATE INDEX IF NOT EXISTS idx_pco_unclaimed ON public.patron_custom_orders (created_at)
  WHERE patronniste_id IS NULL;
