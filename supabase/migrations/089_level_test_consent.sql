-- ─── TEST DE NIVEAU : LE CONSENTEMENT VOYAGE JUSQU'À ARAZZO OS ──────────────
--
-- Le test du site est désormais identique à celui de l'OS : coordonnées
-- facultatives + case « J'accepte de recevoir mon résultat et des conseils ».
-- Cette case doit remonter dans le CRM de l'OS (registre de consentement), comme
-- quand le test est passé sur l'OS. On ajoute donc UNE colonne, additive.
--
-- Rien d'autre ne change : les droits de 084 (anon = dépôt, arazzo_reader =
-- lecture + acquittement) portent sur la table entière, colonne comprise.
-- Tant que cette migration n'est pas appliquée, le site retombe sur un dépôt
-- sans la colonne : aucun passage n'est perdu.

ALTER TABLE public.level_test_leads
  ADD COLUMN IF NOT EXISTS consent boolean NOT NULL DEFAULT false;

-- Se rejoue sans dommage (IF NOT EXISTS).
-- Retour arrière (à la main) : ALTER TABLE public.level_test_leads DROP COLUMN IF EXISTS consent;
