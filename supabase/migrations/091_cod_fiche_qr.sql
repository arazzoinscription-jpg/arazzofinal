-- ─── FICHE D'INSCRIPTION (PAIEMENT À LA LIVRAISON) : QR PERSONNEL + LISTE POUR L'OS ─
--
-- Chaque commande reçoit un JETON PERSONNEL, imprimé en QR sur sa fiche :
--   https://www.formation-arazzo.store/fiche/<jeton>
-- Scanner ce QR :
--   • paiement PAS encore confirmé  → une page « paiement à la livraison en attente »,
--     AUCUN accès (la fiche voyage avec le livreur avant l'encaissement) ;
--   • paiement confirmé par l'admin → e-mail d'accès (e-mail + mot de passe) et
--     connexion directe, avec les cours de la commande.
--
-- L'OS, lui, lit la LISTE des commandes à la livraison au clic « Synchroniser »
-- (fiche CRM + liste + QR). Il ne lit PAS la table `orders` : seulement la vue
-- `cod_orders_sync`, limitée aux commandes « cod » et aux colonnes utiles.
--
-- 100 % ADDITIF : deux colonnes, un index, une vue. Aucune donnée modifiée ni
-- supprimée. Se rejoue sans dommage.

-- 1) Jeton du QR. Un DEFAULT volatil est évalué ligne par ligne : les commandes
--    EXISTANTES reçoivent leur jeton, et toute commande future aussi (y compris
--    celles créées par l'OS), sans changer une seule ligne de code de création.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fiche_token text
  DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

CREATE UNIQUE INDEX IF NOT EXISTS orders_fiche_token_uidx
  ON public.orders (fiche_token) WHERE fiche_token IS NOT NULL;

-- 2) Les identifiants d'accès ne sont envoyés qu'UNE fois par commande : cette
--    date empêche un second scan de réinitialiser le mot de passe.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fiche_access_sent_at timestamptz;

-- 3) La vue lue par l'OS (rôle arazzo_reader).
CREATE OR REPLACE VIEW public.cod_orders_sync AS
SELECT
  o.id,
  o.order_number,
  o.status,
  o.full_name,
  o.email,
  o.phone,
  o.address,
  o.wilaya,
  o.total,
  o.created_at,
  o.fiche_token,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('course_id', i.course_id, 'title', i.title))
       FROM public.order_items i WHERE i.order_id = o.id),
    '[]'::jsonb
  ) AS items
FROM public.orders o
WHERE o.payment_method = 'cod';

-- ⚠ Supabase accorde par défaut les nouveaux objets à `anon` et `authenticated`.
--   Cette vue contient des données personnelles (nom, e-mail, téléphone, adresse) et
--   s'exécute avec les droits de son propriétaire : on RETIRE tout accès public,
--   puis on n'accorde la lecture qu'à l'OS.
REVOKE ALL ON public.cod_orders_sync FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.cod_orders_sync TO arazzo_reader;

-- Se rejoue sans dommage.
