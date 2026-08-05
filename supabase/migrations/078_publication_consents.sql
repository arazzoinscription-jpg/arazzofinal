-- ─── CONSENTEMENT DE PUBLICATION ────────────────────────────────────────────
--
-- Autoriser l'école à montrer son prénom, sa photo et ses travaux sur les
-- réseaux sociaux. C'est une question distincte de tout le reste : s'inscrire
-- à une formation de couture n'est pas accepter de devenir une affiche.
--
-- Trois choix de conception qui ne sont pas des détails.
--
-- 1. AUCUNE MISE À JOUR, QUE DES AJOUTS. Chaque décision — accord comme
--    retrait — crée une ligne. On ne remplace jamais la précédente : écraser
--    un accord par un retrait effacerait la preuve qu'il avait été donné, et
--    inversement. L'état courant est la ligne la plus récente.
--
-- 2. LE TEXTE ACCEPTÉ EST COPIÉ DANS LA LIGNE. Pas une référence à un texte
--    modifiable ailleurs. Si l'école reformule sa demande dans six mois, les
--    accords déjà donnés gardent la formulation d'origine — sans quoi on
--    élargirait rétroactivement ce que des dizaines de femmes ont accepté en
--    changeant une phrase.
--
-- 3. PERSONNE NE PEUT DÉCIDER À LA PLACE D'UNE ÉTUDIANTE. La politique
--    d'insertion exige `user_id = auth.uid()`. Ni la formatrice, ni une
--    administratrice ne peuvent cocher pour elle. C'est le seul moyen que ce
--    registre veuille dire quelque chose.

CREATE TABLE IF NOT EXISTS public.publication_consents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- TRUE = accord donné, FALSE = accord retiré.
  granted     BOOLEAN NOT NULL,
  -- Le texte exact affiché au moment de la décision.
  consent_text TEXT NOT NULL,
  -- Ce qui a été autorisé, pour que l'accord reste vérifiable si la demande
  -- évolue : par ex. ["prenom","photos_travaux","commentaires_formatrice"].
  scope       TEXT[] NOT NULL DEFAULT '{}',
  -- D'où vient la décision : 'profil' aujourd'hui, autre chose demain.
  source      TEXT NOT NULL DEFAULT 'profil',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pubconsent_user
  ON public.publication_consents(user_id, created_at DESC);

ALTER TABLE public.publication_consents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Chacune voit son propre historique. Une administratrice le voit aussi :
  -- elle doit pouvoir répondre à « qu'avez-vous enregistré sur moi ? ».
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='publication_consents' AND policyname='pubconsent_read') THEN
    CREATE POLICY "pubconsent_read" ON public.publication_consents FOR SELECT USING (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );
  END IF;

  -- Seule l'étudiante décide pour elle-même. Pas d'exception pour l'admin :
  -- une porte « au cas où » est une porte, et elle finit par servir.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='publication_consents' AND policyname='pubconsent_insert') THEN
    CREATE POLICY "pubconsent_insert" ON public.publication_consents FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- Ni modification ni suppression : l'historique est une preuve. Aucune
  -- politique UPDATE ou DELETE n'est créée, donc RLS les refuse toutes.
END $$;

-- Vue de l'état courant : la dernière décision de chacune.
-- Elle existe pour éviter que chaque lecteur réinvente le « plus récent »,
-- et se trompe un jour d'ordre de tri.
--
-- `security_invoker = true` n'est PAS un détail. Sans lui, une vue s'exécute
-- avec les droits de son propriétaire et contourne donc le RLS de la table :
-- toute personne connectée pourrait lire les décisions de toutes les autres à
-- travers cette vue, alors que la table elle-même le lui refuse. Une vue est
-- une porte, et celle-ci doit obéir aux mêmes règles que la pièce.
CREATE OR REPLACE VIEW public.publication_consent_status
WITH (security_invoker = true) AS
SELECT DISTINCT ON (user_id)
  user_id, granted, consent_text, scope, source, created_at AS decided_at
FROM public.publication_consents
ORDER BY user_id, created_at DESC;
