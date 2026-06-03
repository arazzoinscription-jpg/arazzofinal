-- ════════════════════════════════════════════════════════════════════════
-- 012 — Panier persistant (utilisateur connecté) + buckets de stockage privés
-- Infrastructure nécessaire aux Server Actions e-commerce. Non destructif.
-- ════════════════════════════════════════════════════════════════════════

-- Panier côté DB (les invités utilisent un cookie ; fusion au login)
CREATE TABLE IF NOT EXISTS public.cart_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity    INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON public.cart_items(user_id);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cart_items' AND policyname='cart_items_own') THEN
    CREATE POLICY "cart_items_own" ON public.cart_items FOR ALL
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Buckets privés (preuves de paiement + factures PDF) — accès via URL signée
INSERT INTO storage.buckets (id, name, public) VALUES ('proofs', 'proofs', FALSE)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', FALSE)
  ON CONFLICT (id) DO NOTHING;
