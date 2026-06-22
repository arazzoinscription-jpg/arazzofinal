-- ════════════════════════════════════════════════════════════════════════
-- 030 — Communauté : lien vers un patron (source patron_demo)
-- ────────────────────────────────────────────────────────────────────────
-- Les patrons vivent dans la table `patrons` (≠ `products`) et s'achètent sur
-- /patrons/[id]. La démo du patronniste (source_type='patron_demo') doit donc
-- pointer vers un patron, pas un produit boutique.
-- ════════════════════════════════════════════════════════════════════════

alter table public.community_media
  add column if not exists patron_id uuid references public.patrons(id) on delete set null;

create index if not exists community_media_patron_idx on public.community_media(patron_id);
