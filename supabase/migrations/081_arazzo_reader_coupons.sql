-- ─── LES CODES PROMO, EN LECTURE, POUR ARAZZO OS ────────────────────────────
--
-- Arazzo OS doit savoir si une promotion est en cours avant d'en proposer une
-- autre. Sans cette lecture, il proposerait des remises pendant qu'une remise
-- tourne déjà — c'est exactement ce que l'école veut éviter.
--
-- ── CE QUE CETTE TABLE NE CONTIENT PAS ──
--
-- Aucune donnée personnelle : ni acheteuse, ni montant payé, ni moyen de
-- paiement. Un coupon est une règle commerciale, pas une transaction. Les
-- tables voisines — `payments`, `invoices`, `refunds` — restent fermées, et le
-- resteront : Arazzo OS n'a aucun usage de l'argent nominatif.
--
-- ── CE QU'ELLE NE PERMET PAS, ET QU'IL FAUT SAVOIR ──
--
-- Un coupon n'est rattaché à AUCUN produit : `coupons` n'a ni `course_id` ni
-- `patron_id`. Un code s'applique donc à tout, ou à rien de précis. Arazzo OS
-- ne pourra pas dire « cette promo concerne le Niveau 1 » — il dira « une promo
-- est en cours », ce qui est tout ce que la base permet d'affirmer.
--
-- Le jour où l'école voudra des promotions par produit, c'est ICI que la
-- colonne manquera — pas dans Arazzo OS.

-- 1. Lecture, colonne par colonne. `code` en fait partie : c'est lui qu'on
--    affiche pour dire laquelle est en cours.
GRANT SELECT (
  id, code, type, value, max_uses, used_count, expires_at, active, created_at
) ON public.coupons TO arazzo_reader;

-- 2. RLS. Seuls les coupons ACTIFS : un code désactivé ne se propose pas, et
--    l'écarter dans la base évite d'y penser dans le code lecteur.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='coupons' AND policyname='arazzo_reader_coupons') THEN
    CREATE POLICY "arazzo_reader_coupons" ON public.coupons
      FOR SELECT TO arazzo_reader USING (active = TRUE);
  END IF;
END $$;

-- 3. Vérification, après application :
--
--      SET ROLE arazzo_reader;
--      SELECT code, type, value, expires_at FROM public.coupons LIMIT 5;
--      SELECT * FROM public.payments LIMIT 1;   -- doit ÉCHOUER
--      RESET ROLE;
--
--    Le second doit répondre « permission denied for table payments ».
