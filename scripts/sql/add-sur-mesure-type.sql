-- ─────────────────────────────────────────────────────────────────────────────
-- Optionnel : faire du type de prestation sur mesure une vraie COLONNE.
--
-- Sans cette migration, le code fonctionne déjà : le type (patron | placement)
-- est lu depuis un marqueur en tête de `note` (voir src/app/dashboard/sur-mesure/
-- constants.ts → orderType / buildSurMesureNote / displayNote).
--
-- Cette migration ajoute une colonne propre et rétro-remplit les commandes
-- existantes à partir du marqueur. Idempotente (IF NOT EXISTS).
--
-- Appliquer (depuis le dossier arazzo) :
--   SUPA_PW="<mot_de_passe_db>" node scripts/apply-pooler.mjs scripts/sql/add-sur-mesure-type.sql
--   -- ou --
--   DATABASE_URL="postgresql://..." node scripts/apply-sql.mjs scripts/sql/add-sur-mesure-type.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.patron_custom_orders
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'patron'
  CHECK (type IN ('patron', 'placement'));

-- Rétro-remplissage depuis le marqueur de note des commandes déjà créées.
UPDATE public.patron_custom_orders
   SET type = 'placement'
 WHERE type = 'patron'
   AND note LIKE '[[placement]]%';

-- Après application, pour faire de la colonne la source unique (facultatif) :
--   1) ajouter "type" aux select() des pages sur-mesure (client / admin / patronniste) ;
--   2) dans placeCustomOrder (actions.ts), insérer aussi { type } ;
--   3) buildSurMesureNote peut alors ne plus préfixer la note.
-- Le helper orderType() privilégie déjà la colonne `type` quand elle est présente.
