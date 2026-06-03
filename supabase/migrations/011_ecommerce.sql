-- ════════════════════════════════════════════════════════════════════════
-- 011 — E-COMMERCE (produits, commandes, paiements CCP/PayPal/COD/virement,
--        preuves de paiement, factures, configuration CCP)
--
-- Règles respectées :
--   • Aucun DROP, aucune modification destructive.
--   • Les tables déjà existantes `payments` (002) et `enrollments` (001) ne
--     sont PAS redéfinies :
--       - le paiement e-commerce lié aux commandes vit dans `order_payments`
--         (la table `payments` existante a un schéma incompatible et est
--          référencée par `refunds`) ;
--       - `enrollments` est seulement ÉTENDUE (order_id, enrolled_at,
--         expires_at) — `student_id` correspond à la colonne existante
--         `user_id`, et la RLS existante reste inchangée.
--   • Idempotent : CREATE ... IF NOT EXISTS, ADD COLUMN IF NOT EXISTS,
--     gardes DO pour les policies.
-- ════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────
-- Helpers
-- ────────────────────────────────────────────────────────────────────────

-- Vrai si l'utilisateur courant est administrateur (SECURITY DEFINER pour
-- contourner la RLS `users_read_own` sans risque de récursion de policy).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$;

-- Compteur séquentiel par type et par année (remis à zéro chaque année).
-- Utilisé pour générer CMD-YYYY-00001 et FACT-YYYY-00001 de façon atomique.
CREATE TABLE IF NOT EXISTS public.sequence_counters (
  kind        TEXT NOT NULL,
  year        INT  NOT NULL,
  last_value  INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, year)
);

CREATE OR REPLACE FUNCTION public.next_counter(p_kind TEXT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year  INT := EXTRACT(YEAR FROM NOW())::INT;
  v_value INT;
BEGIN
  INSERT INTO public.sequence_counters (kind, year, last_value)
  VALUES (p_kind, v_year, 1)
  ON CONFLICT (kind, year)
  DO UPDATE SET last_value = public.sequence_counters.last_value + 1
  RETURNING last_value INTO v_value;
  RETURN v_value;
END;
$$;

-- Met à jour automatiquement la colonne updated_at.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────
-- products — catalogue (formation, fichier numérique, patron PDF, bundle)
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  description    TEXT,
  type           TEXT NOT NULL CHECK (type IN ('course','digital_file','patron_pdf','bundle')),
  price          NUMERIC(12,2) NOT NULL DEFAULT 0,
  compare_price  NUMERIC(12,2),
  images         TEXT[] NOT NULL DEFAULT '{}',
  files          TEXT[] NOT NULL DEFAULT '{}',
  course_id      UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  stock          INT,                          -- NULL = stock illimité (produit numérique)
  slug           TEXT NOT NULL UNIQUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_type ON public.products(type);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_course ON public.products(course_id);

-- ────────────────────────────────────────────────────────────────────────
-- orders — commandes
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    TEXT UNIQUE,                 -- CMD-YYYY-00001 (rempli par trigger)
  customer_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','payment_pending','payment_review',
                                      'confirmed','shipped','delivered','cancelled','refunded')),
  full_name       TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  city            TEXT,
  wilaya          TEXT,
  country         TEXT DEFAULT 'Algérie',
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method  TEXT CHECK (payment_method IN ('ccp','paypal','cod','transfer')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);

-- ────────────────────────────────────────────────────────────────────────
-- order_items — lignes de commande (snapshot du produit au moment de l'achat)
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES public.products(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,                   -- snapshot du titre à l'achat
  price       NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity    INT NOT NULL DEFAULT 1,
  course_id   UUID REFERENCES public.courses(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);

-- ────────────────────────────────────────────────────────────────────────
-- order_payments — paiement lié à une commande (CCP / PayPal / COD / virement)
-- (table distincte de `payments` (002) qui a un schéma incompatible)
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  method            TEXT CHECK (method IN ('ccp','paypal','cod','transfer')),
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','submitted','approved','rejected','refunded')),
  amount            NUMERIC(12,2) NOT NULL DEFAULT 0,
  transaction_id    TEXT,
  paypal_order_id   TEXT,
  paypal_capture_id TEXT,
  verified_at       TIMESTAMPTZ,
  verified_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_payments_order ON public.order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_status ON public.order_payments(status);

-- ────────────────────────────────────────────────────────────────────────
-- payment_proofs — preuves de paiement (capture/reçu) + colonnes IA anti-fraude
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id             UUID REFERENCES public.order_payments(id) ON DELETE CASCADE,
  order_id               UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  file_url               TEXT NOT NULL,
  file_type              TEXT CHECK (file_type IN ('jpg','png','pdf')),
  file_size              INT,
  -- Champs extraits automatiquement (OCR / IA) — prêts pour un futur modèle
  extracted_amount       NUMERIC(12,2),
  extracted_date         TIMESTAMPTZ,
  extracted_transaction  TEXT,
  extracted_beneficiary  TEXT,
  ai_confidence          NUMERIC(5,4),         -- score 0.0000 → 1.0000
  ai_is_fake             BOOLEAN,              -- détection de faux (futur modèle)
  status                 TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','approved','rejected','needs_resubmit')),
  admin_note             TEXT,
  reviewed_at            TIMESTAMPTZ,
  reviewed_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_payment ON public.payment_proofs(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_order ON public.payment_proofs(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_status ON public.payment_proofs(status);

-- ────────────────────────────────────────────────────────────────────────
-- invoices — factures
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  TEXT UNIQUE,                 -- FACT-YYYY-00001 (rempli par trigger)
  order_id        UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  pdf_url         TEXT,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);

-- ────────────────────────────────────────────────────────────────────────
-- ccp_config — configuration du compte CCP / BaridiMob
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ccp_config (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number   TEXT,
  account_key      TEXT,
  beneficiary_name TEXT,
  qr_code_url      TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────
-- Extension non destructive de `enrollments` (table existante 001)
-- student_id ≡ user_id (déjà présent). On ajoute seulement les colonnes
-- e-commerce. La RLS existante n'est pas modifiée.
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS order_id   UUID REFERENCES public.orders(id) ON DELETE SET NULL;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_enrollments_order ON public.enrollments(order_id);

-- ════════════════════════════════════════════════════════════════════════
-- COMPTEURS AUTOMATIQUES (triggers BEFORE INSERT)
-- ════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'CMD-' || TO_CHAR(NOW(),'YYYY') || '-' ||
                        LPAD(public.next_counter('order')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'FACT-' || TO_CHAR(NOW(),'YYYY') || '-' ||
                          LPAD(public.next_counter('invoice')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Triggers idempotents (CREATE OR REPLACE TRIGGER, pas de DROP)
CREATE OR REPLACE TRIGGER trg_orders_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

CREATE OR REPLACE TRIGGER trg_orders_touch
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE TRIGGER trg_invoices_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_invoice_number();

-- ════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE public.products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ccp_config     ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- ── products : lecture publique des produits actifs, gestion admin ──
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='products_read') THEN
    CREATE POLICY "products_read" ON public.products FOR SELECT
      USING (is_active = TRUE OR public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='products_manage') THEN
    CREATE POLICY "products_manage" ON public.products FOR ALL
      USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  -- ── orders : SELECT/UPDATE propriétaire + admin ; INSERT propriétaire ──
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='orders_select') THEN
    CREATE POLICY "orders_select" ON public.orders FOR SELECT
      USING (customer_id = auth.uid() OR public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='orders_insert') THEN
    CREATE POLICY "orders_insert" ON public.orders FOR INSERT
      WITH CHECK (customer_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='orders_update') THEN
    CREATE POLICY "orders_update" ON public.orders FOR UPDATE
      USING (customer_id = auth.uid() OR public.is_admin());
  END IF;

  -- ── order_items : lisibles/insérables par le propriétaire de la commande, + admin ──
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='order_items_select') THEN
    CREATE POLICY "order_items_select" ON public.order_items FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id
                     AND (o.customer_id = auth.uid() OR public.is_admin())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='order_items_insert') THEN
    CREATE POLICY "order_items_insert" ON public.order_items FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id
                          AND (o.customer_id = auth.uid() OR public.is_admin())));
  END IF;

  -- ── order_payments : SELECT propriétaire + admin ; INSERT propriétaire ; UPDATE admin ──
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_payments' AND policyname='order_payments_select') THEN
    CREATE POLICY "order_payments_select" ON public.order_payments FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id
                     AND (o.customer_id = auth.uid() OR public.is_admin())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_payments' AND policyname='order_payments_insert') THEN
    CREATE POLICY "order_payments_insert" ON public.order_payments FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id
                          AND o.customer_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_payments' AND policyname='order_payments_update') THEN
    CREATE POLICY "order_payments_update" ON public.order_payments FOR UPDATE
      USING (public.is_admin());
  END IF;

  -- ── payment_proofs : INSERT propriétaire ; SELECT propriétaire + admin ; UPDATE admin ──
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payment_proofs' AND policyname='payment_proofs_insert') THEN
    CREATE POLICY "payment_proofs_insert" ON public.payment_proofs FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id
                          AND o.customer_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payment_proofs' AND policyname='payment_proofs_select') THEN
    CREATE POLICY "payment_proofs_select" ON public.payment_proofs FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id
                     AND (o.customer_id = auth.uid() OR public.is_admin())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payment_proofs' AND policyname='payment_proofs_update') THEN
    CREATE POLICY "payment_proofs_update" ON public.payment_proofs FOR UPDATE
      USING (public.is_admin());
  END IF;

  -- ── invoices : SELECT propriétaire + admin (insertion via service role) ──
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoices' AND policyname='invoices_select') THEN
    CREATE POLICY "invoices_select" ON public.invoices FOR SELECT
      USING (customer_id = auth.uid() OR public.is_admin());
  END IF;

  -- ── ccp_config : SELECT authentifié ; UPDATE admin (insertion via service role) ──
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ccp_config' AND policyname='ccp_config_select') THEN
    CREATE POLICY "ccp_config_select" ON public.ccp_config FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ccp_config' AND policyname='ccp_config_update') THEN
    CREATE POLICY "ccp_config_update" ON public.ccp_config FOR UPDATE
      USING (public.is_admin());
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════
-- Fin de la migration 011_ecommerce
-- ════════════════════════════════════════════════════════════════════════
