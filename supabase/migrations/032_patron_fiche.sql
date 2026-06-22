-- ════════════════════════════════════════════════════════════════════════
-- 032 — Fiche patronage : dessin technique IA + fiche composée + n° modèle
-- ────────────────────────────────────────────────────────────────────────
-- dessin_technique_url : croquis technique (généré IA depuis la photo OU
--   téléversé/remplacé par le patronniste).
-- fiche_url            : image de la fiche composée (2 colonnes) prête à
--   afficher sur la page produit.
-- numero              : référence modèle affichée sur la fiche (ex. « 1001 »).
-- ════════════════════════════════════════════════════════════════════════

alter table public.patrons add column if not exists dessin_technique_url text;
alter table public.patrons add column if not exists fiche_url text;
alter table public.patrons add column if not exists numero text;
