-- ─────────────────────────────────────────────────────────────────────────────
-- 058 — Durcissement sécurité RLS (SEC-001)
-- ─────────────────────────────────────────────────────────────────────────────
-- Problème : la policy `users_update_own` (migration 001) autorisait un utilisateur
-- à modifier SA PROPRE ligne sans clause WITH CHECK ni restriction de colonnes.
-- Un élève pouvait donc s'attribuer role='admin' / roles=['admin'] via l'API
-- PostgREST (clé anon) → élévation de privilège vers Admin.
--
-- Correctif (défense en profondeur) :
--   1) Recréation de la policy UPDATE avec WITH CHECK (verrouille aussi l'id).
--   2) Trigger BEFORE UPDATE qui interdit toute modification de `role`/`roles`
--      SAUF si l'appelant est le service_role (clé serveur) ou un admin confirmé.
--
-- NB : les changements de rôle légitimes passent par le service-role
--      (admin/actions.ts, admin/demandes/actions.ts) ou par un admin authentifié
--      (admin/page.tsx) → ces flux restent autorisés par le trigger.

-- 1) Policy UPDATE explicite (USING + WITH CHECK)
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2) Trigger anti-escalade de rôle
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Rôles inchangés : rien à contrôler.
  IF NEW.role IS NOT DISTINCT FROM OLD.role
     AND NEW.roles IS NOT DISTINCT FROM OLD.roles THEN
    RETURN NEW;
  END IF;

  -- Clé service_role (contexte serveur/admin) : autorisée.
  IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Admin authentifié : autorisé (gestion des rôles depuis l'espace admin).
  IF EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  ) THEN
    RETURN NEW;
  END IF;

  -- Sinon : tentative d'auto-modification de rôle → refus.
  RAISE EXCEPTION 'Modification du rôle non autorisée (SEC-001).';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation ON public.users;
CREATE TRIGGER trg_prevent_role_self_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_self_escalation();
