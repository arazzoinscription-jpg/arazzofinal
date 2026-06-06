-- 016 — Lier un produit boutique à un patron (en plus de course_id)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS patron_id UUID REFERENCES public.patrons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_patron ON public.products(patron_id);
