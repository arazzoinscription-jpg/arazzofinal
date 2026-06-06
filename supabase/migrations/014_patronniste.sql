-- ─────────────────────────────────────────────────────────────────────────────
-- 014 — Rôle « patronniste » + commandes de patrons sur mesure
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Nouveau rôle « patronniste »
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (role IN ('eleve','formateur','admin','patronniste'));

-- 2) Le patronniste peut gérer les patrons (en plus du formateur/admin)
DROP POLICY IF EXISTS "patrons_manage" ON public.patrons;
CREATE POLICY "patrons_manage" ON public.patrons FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('formateur','admin','patronniste'))
);

-- 3) Patronniste/admin peuvent voir toutes les commandes d'achat de patrons
DROP POLICY IF EXISTS "patron_purchases_staff_read" ON public.patron_purchases;
CREATE POLICY "patron_purchases_staff_read" ON public.patron_purchases FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('patronniste','admin'))
);

-- 4) Bucket Storage « patrons » (public) pour visuels + PDF
INSERT INTO storage.buckets (id, name, public)
VALUES ('patrons','patrons', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 5) Commandes de patrons SUR MESURE (table des mesures du client)
CREATE TABLE IF NOT EXISTS public.patron_custom_orders (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  patronniste_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  patron_id      UUID REFERENCES public.patrons(id) ON DELETE SET NULL,
  titre          TEXT NOT NULL,
  tissu          TEXT,
  taille         TEXT,
  mesures        JSONB NOT NULL DEFAULT '{}'::jsonb,   -- table sur mesure : { "Tour de poitrine": 92, ... }
  note           TEXT,
  statut         TEXT NOT NULL DEFAULT 'en_attente'
                 CHECK (statut IN ('en_attente','en_cours','termine','annule')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pco_client      ON public.patron_custom_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_pco_patronniste ON public.patron_custom_orders(patronniste_id);
CREATE INDEX IF NOT EXISTS idx_pco_statut      ON public.patron_custom_orders(statut);

ALTER TABLE public.patron_custom_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pco_client_select" ON public.patron_custom_orders;
CREATE POLICY "pco_client_select" ON public.patron_custom_orders FOR SELECT
  USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "pco_client_insert" ON public.patron_custom_orders;
CREATE POLICY "pco_client_insert" ON public.patron_custom_orders FOR INSERT
  WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "pco_staff_all" ON public.patron_custom_orders;
CREATE POLICY "pco_staff_all" ON public.patron_custom_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('patronniste','admin'))
);
