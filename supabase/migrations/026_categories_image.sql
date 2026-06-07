-- 026 — Visuel des cartes de catégories (design Canva ou image)
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url TEXT;
