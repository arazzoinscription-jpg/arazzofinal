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
-- users.email · diplomas.full_name, .cni_path, .phone, .address, .wilaya ·
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
GRANT SELECT (id, nom, avatar_url, ville, role, created_at)
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
-- Il reste à fabriquer un jeton qui porte ce rôle. Il se signe avec le JWT
-- Secret du projet (Supabase → Settings → API → JWT Secret).
--
-- NE COLLEZ CE SECRET NULLE PART D'AUTRE que dans la commande ci-dessous,
-- exécutée sur votre machine. Il permet de signer n'importe quel jeton, y
-- compris un `service_role`.
--
--   node -e "const c=require('crypto'),s=process.argv[1],
--     b=o=>Buffer.from(JSON.stringify(o)).toString('base64url'),
--     p=b({role:'arazzo_reader',iss:'supabase',
--          iat:Math.floor(Date.now()/1e3),
--          exp:Math.floor(Date.now()/1e3)+60*60*24*365}),
--     h=b({alg:'HS256',typ:'JWT'}),
--     g=c.createHmac('sha256',s).update(h+'.'+p).digest('base64url');
--     console.log(h+'.'+p+'.'+g)" "VOTRE_JWT_SECRET"
--
-- Puis, dans le `.env` d'Arazzo OS, remplacez la valeur de
-- ARAZZO_LMS_SUPABASE_KEY par le jeton obtenu. L'URL ne change pas.
--
-- Pour vérifier que le verrou tient, une fois branché :
--
--   npm run verify:lms   (voir arazzo-os)
--
-- Ce contrôle échoue si le jeton peut lire un e-mail ou écrire quoi que ce
-- soit — c'est-à-dire s'il reste une `service_role`.
