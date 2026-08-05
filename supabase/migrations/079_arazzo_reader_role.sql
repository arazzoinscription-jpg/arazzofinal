-- ─── RÔLE DE LECTURE POUR ARAZZO OS (Stories AI) ────────────────────────────
--
-- Arazzo OS lit ce LMS pour raconter le parcours des étudiantes. Il le faisait
-- jusqu'ici avec la clé `service_role`, qui contourne toutes les règles de
-- sécurité et peut TOUT écrire — y compris supprimer les 247 comptes.
--
-- Ce rôle ne peut que lire, et seulement ce qui sert à écrire une Story.
--
-- La différence n'est pas théorique. Le jour où un fichier `.env` traîne dans
-- une capture d'écran, dans un dépôt public ou sur une machine prêtée, elle
-- décide entre « quelqu'un a pu lire cinq tables » et « quelqu'un a pu vider
-- la base ».
--
-- ── PORTÉE COLONNE PAR COLONNE ──
--
-- Les droits sont donnés colonne par colonne, pas table par table. Ce n'est pas
-- de la coquetterie : si un jour une requête d'Arazzo OS demande `email`,
-- `phone` ou `cni_path` — par erreur, par évolution ou par négligence — la BASE
-- refusera. La protection ne dépend plus du soin apporté au code lecteur.
--
-- ── CE QUI N'EST PAS ACCESSIBLE ──
--
-- users.email, users.nom, users.avatar_url ·
-- diplomas.full_name, .cni_path, .phone, .address, .wilaya ·
-- invoices · payments · payment_proofs · telegram_payment_proofs · messages ·
-- login_history · user_2fa · et les 60 autres tables.
--
-- Une Story n'a besoin d'aucune de ces informations. Ce qu'on ne peut pas lire
-- ne peut pas fuiter.

-- 1. Le rôle. NOLOGIN : on n'y entre pas par mot de passe, seulement par un
--    jeton signé (voir la note d'application en fin de fichier).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'arazzo_reader') THEN
    CREATE ROLE arazzo_reader NOLOGIN NOINHERIT;
  END IF;
END $$;

-- 2. PostgREST se connecte en `authenticator` puis bascule vers le rôle porté
--    par le jeton. Sans ce GRANT, la bascule est refusée.
GRANT arazzo_reader TO authenticator;

GRANT USAGE ON SCHEMA public TO arazzo_reader;

-- 3. Lecture, colonne par colonne. Rien d'autre n'est accordé — ni INSERT, ni
--    UPDATE, ni DELETE, sur aucune table.
-- `username` (le pseudo), et surtout PAS `nom` ni `avatar_url`.
--
-- Une Story designe une etudiante par le pseudo qu'elle a choisi et par ses
-- travaux — jamais par son etat civil ni par son visage. L'interdire ici
-- signifie qu'aucune evolution du code lecteur ne pourra revenir dessus par
-- commodite : la base refusera.
GRANT SELECT (id, username, ville, role, created_at)
  ON public.users TO arazzo_reader;

GRANT SELECT (id, user_id, photo_url, video_url, note, feedback, status, created_at)
  ON public.lesson_practicals TO arazzo_reader;

GRANT SELECT (id, user_id, issued_at)
  ON public.certificates TO arazzo_reader;

-- Diplômes : la date et le statut. Ni nom complet, ni pièce d'identité, ni
-- téléphone, ni adresse.
GRANT SELECT (id, user_id, status, created_at)
  ON public.diplomas TO arazzo_reader;

GRANT SELECT (id, user_id, lesson_id, completed_at)
  ON public.progress TO arazzo_reader;

-- Medias de communaute : rattaches a un travail, donc a une etudiante. Ni
-- `post_id` ni les identifiants de produit ne sont accordes : ce qui
-- interesse une Story, c'est la realisation, pas le fil social autour.
GRANT SELECT (id, practical_id, media_kind, media_url, status, created_at)
  ON public.community_media TO arazzo_reader;

GRANT SELECT (id, user_id, granted, consent_text, scope, created_at)
  ON public.publication_consents TO arazzo_reader;
GRANT SELECT ON public.publication_consent_status TO arazzo_reader;

-- 4. RLS : ces tables l'ont activé, et leurs politiques reposent sur
--    `auth.uid()` — nul pour ce rôle, qui ne représente personne. Sans
--    politique dédiée, il verrait zéro ligne. On lui en donne, explicitement.
DO $$
BEGIN
  -- Seules les élèves. Le parcours de la formatrice ne se raconte pas, et
  -- l'interdire ICI vaut mieux que de compter sur un `role=eq.eleve` que le
  -- code lecteur pourrait oublier un jour.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='users' AND policyname='arazzo_reader_eleves') THEN
    CREATE POLICY "arazzo_reader_eleves" ON public.users
      FOR SELECT TO arazzo_reader USING (role = 'eleve');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='lesson_practicals' AND policyname='arazzo_reader_travaux') THEN
    CREATE POLICY "arazzo_reader_travaux" ON public.lesson_practicals
      FOR SELECT TO arazzo_reader USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='certificates' AND policyname='arazzo_reader_certificats') THEN
    CREATE POLICY "arazzo_reader_certificats" ON public.certificates
      FOR SELECT TO arazzo_reader USING (true);
  END IF;

  -- Diplômes : seuls ceux réellement délivrés. Une demande en cours ne regarde
  -- pas un moteur de contenu.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='diplomas' AND policyname='arazzo_reader_diplomes') THEN
    CREATE POLICY "arazzo_reader_diplomes" ON public.diplomas
      FOR SELECT TO arazzo_reader
      USING (status IN ('issued', 'delivered', 'approved'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='progress' AND policyname='arazzo_reader_progression') THEN
    CREATE POLICY "arazzo_reader_progression" ON public.progress
      FOR SELECT TO arazzo_reader USING (true);
  END IF;

  -- Medias de communaute : seuls ceux prets. Un media encore en traitement
  -- n'est pas publiable, et l'ecarter ICI evite de compter dessus.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='community_media' AND policyname='arazzo_reader_communaute') THEN
    CREATE POLICY "arazzo_reader_communaute" ON public.community_media
      FOR SELECT TO arazzo_reader USING (status = 'ready');
  END IF;

  -- L'accord de publication : lisible, jamais modifiable. Aucune politique
  -- d'écriture n'existe pour ce rôle, et il n'a de toute façon pas le droit.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='publication_consents' AND policyname='arazzo_reader_accords') THEN
    CREATE POLICY "arazzo_reader_accords" ON public.publication_consents
      FOR SELECT TO arazzo_reader USING (true);
  END IF;
END $$;

-- 5. Filet : si une table est ajoutée plus tard, ce rôle n'y aura AUCUN droit
--    par défaut. On le rend explicite pour que ce soit un choix, pas un oubli.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM arazzo_reader;

-- ─── APRÈS CETTE MIGRATION ──────────────────────────────────────────────────
--
-- Il reste a fabriquer un jeton qui porte ce role. Ne recopiez pas de commande
-- a la main : cote arazzo-os, un fichier s'en charge.
--
--   double-cliquez   arazzo-os\poser-le-verrou-lms.bat
--
-- Il vous demandera le JWT Secret du projet (Supabase > Settings > API > JWT
-- Settings), fabriquera le jeton sans jamais l'afficher ni l'enregistrer,
-- proposera de remplacer ARAZZO_LMS_SUPABASE_KEY dans le .env apres
-- sauvegarde, puis verifiera que le verrou tient.
--
-- Le controle echoue si le jeton peut ecrire, ou lire un e-mail, un nom, une
-- photo de profil ou une piece d'identite — c'est-a-dire s'il reste une
-- `service_role`.
