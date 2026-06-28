-- ════════════════════════════════════════════════════════════════════════
-- 043 — Workflow sur-mesure : négociation de prix + paiement + livraison fichier
-- ────────────────────────────────────────────────────────────────────────
-- Étend patron_custom_orders pour le flux complet :
--   client demande (photo) → admin propose un prix → client accepte/refuse →
--   diffusion aux patronnistes → 1er qui accepte (claim) → en_cours →
--   livraison du fichier → client dépose une preuve de paiement →
--   admin approuve → téléchargement débloqué.
-- (photo_url / video_url existent déjà — migration 036.)
-- ════════════════════════════════════════════════════════════════════════

alter table public.patron_custom_orders add column if not exists proposed_price_dzd integer;
alter table public.patron_custom_orders add column if not exists file_path           text;   -- fichier patron fini (bucket privé custom-patrons)
alter table public.patron_custom_orders add column if not exists payment_proof_path  text;   -- preuve de paiement (bucket privé proofs)
alter table public.patron_custom_orders add column if not exists delivered_at        timestamptz;
alter table public.patron_custom_orders add column if not exists paid_at             timestamptz;

-- Machine d'états élargie (on conserve les anciens libellés pour les lignes existantes).
alter table public.patron_custom_orders drop constraint if exists patron_custom_orders_statut_check;
alter table public.patron_custom_orders
  add constraint patron_custom_orders_statut_check check (statut in (
    'price_requested',      -- client a demandé, en attente du prix admin
    'price_proposed',       -- admin a proposé un prix, en attente du client
    'refused',              -- client a refusé le prix
    'awaiting_patronniste', -- client a accepté → diffusé aux patronnistes
    'en_cours',             -- patronniste a pris la commande
    'delivered',            -- fichier livré, en attente du paiement client
    'payment_review',       -- preuve de paiement déposée, en attente admin
    'completed',            -- paiement approuvé → téléchargement débloqué
    'annule',
    -- legacy (lignes antérieures)
    'en_attente', 'termine'
  ));

-- Bucket privé pour les fichiers patrons finis (accès via URL signée uniquement).
insert into storage.buckets (id, name, public)
values ('custom-patrons', 'custom-patrons', false)
on conflict (id) do nothing;
