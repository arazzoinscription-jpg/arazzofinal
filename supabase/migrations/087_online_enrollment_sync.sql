-- ─── LES INSCRIPTIONS EN LIGNE AVEC PREUVE, RAPATRIÉES VERS ARAZZO OS ───────
--
-- La landing en ligne (`/formation/[niveau]`) proposait « on me recontacte » ou
-- « fiche + livraison » (COD), sans jamais collecter de PREUVE de paiement. Or
-- l'école règle beaucoup de ventes par versement CCP / BaridiMob : la cliente
-- paie, puis joint son reçu. Cette preuve doit remonter dans le CRM d'Arazzo OS,
-- où le bouton « Valider » passe l'inscription au VERT (compte LMS + enrôlement
-- + e-mail de bienvenue).
--
-- Comme le LMS ne peut pas appeler l'OS en direct (tunnel bloqué), on suit le
-- MÊME patron que le présentiel (migration 082) : la landing dépose la demande
-- + la preuve ICI, et l'OS les RAPATRIE au clic « Synchroniser ». Moindre
-- privilège : `arazzo_reader` (l'OS) lit et acquitte ; `anon` (la landing) ne
-- fait que DÉPOSER ; personne d'autre ne lit les coordonnées déposées.

-- ── 1. La table des demandes en ligne (avec preuve) ──
-- Une ligne par demande laissée sur la landing. Tant que `synced_at` est nul,
-- elle n'a pas encore été importée dans le CRM de l'OS. On ne supprime rien.
CREATE TABLE IF NOT EXISTS public.online_enrollment_leads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level        text NOT NULL,          -- niveau-1 / niveau-2 / niveau-3 (slug de la landing)
  course_id    text,                   -- cours LMS visé (indicatif ; l'OS fait autorité)
  full_name    text,
  phone        text,
  email        text,
  wilaya       text,
  amount       numeric,                -- montant versé, tel que saisi (indicatif)
  method       text,                   -- ccp / baridimob / autre
  reference    text,                   -- n° de transaction (optionnel)
  proof_url    text,                   -- URL PUBLIQUE du reçu (bucket online-proofs)
  coupon_code  text,
  consent      boolean NOT NULL DEFAULT false,
  lang         text,
  source       text,
  utm          jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  synced_at    timestamptz
);

-- L'OS ne lit que les demandes pas encore importées : index partiel pour garder
-- cette lecture rapide quand la table grossit.
CREATE INDEX IF NOT EXISTS online_enrollment_leads_unsynced_idx
  ON public.online_enrollment_leads (created_at)
  WHERE synced_at IS NULL;

-- ── 2. RLS ──
-- Le service role du LMS (server actions) la contourne pour écrire la demande.
-- Seuls `anon` (dépôt) et `arazzo_reader` (lecture/acquittement) sont réglés ici.
ALTER TABLE public.online_enrollment_leads ENABLE ROW LEVEL SECURITY;

-- ── 3. Droits de la landing (anon) : DÉPÔT seul ──
-- La landing INSÈRE une demande. Elle ne peut NI lire NI modifier celles déjà
-- déposées → les coordonnées ne sont jamais exposées publiquement.
GRANT INSERT ON public.online_enrollment_leads TO anon, authenticated;

-- ── 4. Droits de l'OS (arazzo_reader) : LECTURE + ACQUITTEMENT ──
-- L'OS lit les demandes et pose `synced_at`. Il n'insère jamais, ne supprime rien.
GRANT SELECT, UPDATE ON public.online_enrollment_leads TO arazzo_reader;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='online_enrollment_leads' AND policyname='anon_insert_online_leads') THEN
    CREATE POLICY "anon_insert_online_leads" ON public.online_enrollment_leads
      FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='online_enrollment_leads' AND policyname='arazzo_reader_online_leads_read') THEN
    CREATE POLICY "arazzo_reader_online_leads_read" ON public.online_enrollment_leads
      FOR SELECT TO arazzo_reader USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='online_enrollment_leads' AND policyname='arazzo_reader_online_leads_ack') THEN
    CREATE POLICY "arazzo_reader_online_leads_ack" ON public.online_enrollment_leads
      FOR UPDATE TO arazzo_reader USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 5. Le bucket des reçus (public, en LECTURE seule via URL) ──
-- Les reçus sont déposés par la landing (URL signée générée par le service role)
-- et LUS par l'OS via une URL publique. Le nom de fichier est un UUID non
-- devinable. Bucket dédié, séparé du bucket privé `proofs` de la boutique.
INSERT INTO storage.buckets (id, name, public)
  VALUES ('online-proofs', 'online-proofs', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- Se rejoue sans dommage : table en IF NOT EXISTS, grants ré-accordables,
-- policies gardées par IF NOT EXISTS, bucket en upsert.
