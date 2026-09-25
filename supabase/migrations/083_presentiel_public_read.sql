-- ─── LA LANDING PRÉSENTIELLE LIT EN ANON (clé publique) ─────────────────────
--
-- La landing `/presentiel/[slug]` lisait l'instantané via la clé service-role.
-- Or cette clé n'est pas fiable côté hébergement public (Vercel) → la page
-- affichait « offre non ouverte » alors que la donnée existait. L'instantané est
-- une donnée PUBLIQUE (c'est ce qui s'affiche sur la landing), donc on l'ouvre
-- en lecture au rôle `anon` (la clé publique NEXT_PUBLIC_SUPABASE_ANON_KEY, qui
-- fonctionne déjà partout sur le site). Le formulaire, lui, INSÈRE un prospect
-- en anon (jamais lire/modifier) : la personne ne peut que déposer sa demande.
--
-- Sécurité : `anon` peut LIRE l'instantané (public) et INSÉRER un prospect
-- (dépôt seul). Il ne peut NI lire NI modifier les prospects déjà déposés
-- (aucune policy SELECT/UPDATE pour anon sur presentiel_leads) → les
-- coordonnées des prospects ne sont jamais exposées publiquement. L'OS
-- (arazzo_reader) garde ses droits de lecture/acquittement des 082.

-- Instantané : lecture publique.
GRANT SELECT ON public.presentiel_snapshots TO anon, authenticated;

-- Prospect : dépôt public (INSERT seul), pas de lecture ni de modification.
GRANT INSERT ON public.presentiel_leads TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='presentiel_snapshots' AND policyname='anon_read_snapshots') THEN
    CREATE POLICY "anon_read_snapshots" ON public.presentiel_snapshots
      FOR SELECT TO anon, authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='presentiel_leads' AND policyname='anon_insert_leads') THEN
    CREATE POLICY "anon_insert_leads" ON public.presentiel_leads
      FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

-- Se rejoue sans dommage (grants ré-accordables, policies gardées par IF NOT EXISTS).
