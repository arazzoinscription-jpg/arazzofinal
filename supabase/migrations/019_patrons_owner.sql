-- 019 — Attribuer les patrons sans propriétaire au compte créateur (info@formation-arazzo.com)
UPDATE public.patrons
SET formateur_id = 'd8dac593-0909-4ee4-87c0-0827c32581bf'
WHERE formateur_id IS NULL;
