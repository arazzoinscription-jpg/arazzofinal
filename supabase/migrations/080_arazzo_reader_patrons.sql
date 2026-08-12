-- ─── LA BOUTIQUE, EN LECTURE, POUR ARAZZO OS ────────────────────────────────
--
-- Chaque mois un patron numérique arrive en boutique, et il faut l'annoncer.
-- Aujourd'hui c'est un travail à la main : ouvrir la fiche, recopier le titre,
-- le prix, les tailles, choisir une photo, écrire la légende. Arazzo OS peut le
-- préparer — la fiche contient déjà tout.
--
-- Cette migration ouvre la table `patrons` au rôle `arazzo_reader`, dans le
-- même esprit que la migration 079 : colonne par colonne, jamais table par
-- table.
--
-- ── LA COLONNE QUI N'EST PAS ICI ──
--
--   patrons.fichier_url
--
-- C'est le patron lui-même. Le fichier que vos clientes paient. Un système qui
-- « prend la fiche et la partage » pourrait, un jour, publier cette adresse —
-- pas par malveillance, mais parce qu'une requête aura été élargie, ou qu'un
-- champ aura été ajouté à un gabarit sans qu'on y pense.
--
-- La protection ne repose donc pas sur le soin du code lecteur : la BASE
-- refusera. Arazzo OS ne peut pas publier ce qu'il ne peut pas lire.
--
-- Même raisonnement pour :
--
--   patrons.fiche_url      statut incertain — inclus dans l'achat ou non. Tant
--                          que la question n'est pas tranchée, on ne l'ouvre
--                          pas. L'ajouter plus tard coûte une ligne ; l'avoir
--                          publié par erreur ne se rattrape pas.
--   patrons.formateur_id   désigne une personne. Une annonce de patron n'en a
--                          aucun besoin.
--
-- ── CE QUI EST OUVERT, ET POURQUOI ──
--
--   titre, numero, description, conseils   le texte de l'annonce
--   prix_dzd, prix_eur                     le prix, qui est l'information
--                                          qu'on vient chercher
--   tailles, tissu, genre, type_vetement,
--   format, nb_pages                       les faits d'une fiche produit
--   images[], preview_url,
--   dessin_technique_url                   les pages d'une Story, déjà prêtes
--   video_url                              un Reel, déjà prêt
--   course_id                              la formation liée : c'est par elle
--                                          que les deux familles de produits
--                                          se tiennent
--   created_at                             « nouveau » se déduit de là
--
-- ── CE QUE CETTE MIGRATION NE FAIT PAS ──
--
-- Elle n'autorise aucune écriture, et ne publie rien. Elle rend une fiche
-- LISIBLE. La décision d'annoncer un patron reste un geste humain : la table
-- n'a aucun indicateur « en vente », et une ligne peut exister pendant que vous
-- préparez encore le produit.

-- 1. Lecture, colonne par colonne.
GRANT SELECT (
  id, numero, titre, description, conseils,
  prix_dzd, prix_eur,
  tailles, tissu, genre, type_vetement, format, nb_pages,
  images, preview_url, dessin_technique_url, video_url,
  course_id, created_at
) ON public.patrons TO arazzo_reader;

-- Le nom de la formation liée, et rien d'autre. Sans lui, `course_id` n'est
-- qu'un identifiant : on ne pourrait pas écrire « patron de la formation
-- Corset » sans une seconde requête que ce rôle n'aurait pas le droit de faire.
--
-- Les deux langues, parce que l'annonce se fait dans les deux : `titre_ar` est
-- ce que le public lit, `titre_fr` ce que l'écran d'administration affiche.
-- Ni le prix, ni la description, ni le formateur — une annonce de patron n'a
-- besoin que du NOM de la formation à laquelle il se rattache.
GRANT SELECT (id, titre_fr, titre_ar, slug, published) ON public.courses TO arazzo_reader;

-- 2. RLS. Ces tables l'ont activé, et leurs politiques reposent sur
--    `auth.uid()` — nul pour ce rôle, qui ne représente personne. Sans
--    politique dédiée, il verrait zéro ligne.
DO $$
BEGIN
  -- Un patron sans aucune image ni vidéo n'est pas annonçable : il n'y aurait
  -- rien à montrer. L'écarter ICI évite de proposer une annonce vide, et de
  -- devoir l'expliquer plus tard dans l'interface.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='patrons' AND policyname='arazzo_reader_patrons') THEN
    CREATE POLICY "arazzo_reader_patrons" ON public.patrons
      FOR SELECT TO arazzo_reader
      USING (
        COALESCE(array_length(images, 1), 0) > 0
        OR preview_url IS NOT NULL
        OR video_url IS NOT NULL
      );
  END IF;

  -- Seules les formations PUBLIÉES. Une formation en préparation porte souvent
  -- un titre de travail, et l'annoncer à côté d'un patron reviendrait à
  -- dévoiler ce qui n'est pas prêt. Le filtre est ici, dans la base : le code
  -- lecteur n'a plus à y penser.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='courses' AND policyname='arazzo_reader_formations') THEN
    CREATE POLICY "arazzo_reader_formations" ON public.courses
      FOR SELECT TO arazzo_reader USING (published = TRUE);
  END IF;
END $$;

-- 3. Ce fichier se rejoue sans dommage.
--
--    `GRANT` réaccorde ce qui est déjà accordé, et chaque politique est gardée
--    par un `IF NOT EXISTS`. Une première tentative interrompue en cours de
--    route — c'est arrivé : `courses.title` n'existe pas, la colonne s'appelle
--    `titre_fr` — se rattrape en relançant le tout.

-- 4. Vérification, à lancer après application. Elle doit rendre des lignes
--    SANS jamais faire apparaître `fichier_url` :
--
--      SET ROLE arazzo_reader;
--      SELECT titre, prix_eur, tailles, created_at FROM public.patrons LIMIT 5;
--      SELECT fichier_url FROM public.patrons LIMIT 1;   -- doit ÉCHOUER
--      RESET ROLE;
--
--    Le second SELECT doit répondre « permission denied for column
--    fichier_url ». S'il rend une valeur, cette migration n'a pas fait son
--    travail et il ne faut pas brancher la lecture.
