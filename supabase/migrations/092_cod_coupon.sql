-- ─── CODE PROMO SUR LES COMMANDES « PAIEMENT À LA LIVRAISON » ─────────────────────
--
-- La fiche d'inscription accepte maintenant un code promo : le serveur du LMS le
-- revérifie auprès d'Arazzo OS, recalcule le total, et mémorise le code sur la
-- commande. À la synchronisation, l'OS le lit (vue `cod_orders_sync`) pour
-- « consommer » le coupon quand le paiement est confirmé.
--
-- À appliquer APRÈS 091 (la vue est étendue). 100 % additif : une colonne, et deux
-- colonnes ajoutées à la fin de la vue. Aucune donnée modifiée. Se rejoue sans dommage.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code text;

-- Même vue que 091 + `coupon_code` et `discount` À LA FIN (CREATE OR REPLACE VIEW
-- n'accepte que l'ajout de colonnes finales).
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
  ) AS items,
  o.coupon_code,
  o.discount
FROM public.orders o
WHERE o.payment_method = 'cod';

-- Mêmes droits que 091 : la vue contient des données personnelles → aucun accès
-- public, lecture réservée à l'OS.
REVOKE ALL ON public.cod_orders_sync FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.cod_orders_sync TO arazzo_reader;

-- Se rejoue sans dommage.
