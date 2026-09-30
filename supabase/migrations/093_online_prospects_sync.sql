-- ─── LES PROSPECTS EN LIGNE (FORMULAIRE SANS PREUVE) REMONTENT AU CRM DE L'OS ─────
--
-- Jusqu'ici l'OS ne rapatriait une demande en ligne que lorsqu'elle portait déjà une
-- PREUVE de paiement : une personne qui remplit le formulaire mais n'envoie pas (encore)
-- son reçu restait invisible dans le CRM. On ajoute un second repère, distinct de
-- `synced_at` (qui signifie « preuve rapatriée, demande close ») :
--
--   prospect_synced_at : la PERSONNE est déjà dans le CRM de l'OS (demande « en attente
--                        de preuve »). La demande reste relue à la synchro suivante pour
--                        recevoir sa preuve, une fois jointe, sur la MÊME fiche OS.
--
-- 100 % additif : une colonne nullable + un index partiel. Aucune donnée modifiée.
-- Tant que cette migration n'est pas appliquée, l'OS retombe sur l'ancien comportement
-- (demandes avec preuve seulement). Se rejoue sans dommage.

ALTER TABLE public.online_enrollment_leads
  ADD COLUMN IF NOT EXISTS prospect_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS online_enrollment_leads_prospect_idx
  ON public.online_enrollment_leads (created_at)
  WHERE synced_at IS NULL AND prospect_synced_at IS NULL;

-- Les droits de l'OS (SELECT, UPDATE sur la table entière — migration 087) couvrent déjà
-- la nouvelle colonne.
