-- 021 — Corrige la récursion infinie des policies entre groups <-> group_members
-- En utilisant des fonctions SECURITY DEFINER qui contournent la RLS dans les sous-requêtes.

CREATE OR REPLACE FUNCTION public.is_group_member(gid uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = gid AND user_id = uid);
$$;

CREATE OR REPLACE FUNCTION public.is_group_creator(gid uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.groups WHERE id = gid AND creator_id = uid);
$$;

-- groups : lecture sans référencer group_members directement
DROP POLICY IF EXISTS "groups_read" ON public.groups;
CREATE POLICY "groups_read" ON public.groups FOR SELECT USING (
  creator_id = auth.uid()
  OR public.is_group_member(id, auth.uid())
  OR public.is_admin()
);

-- group_members : lecture sans référencer groups directement
DROP POLICY IF EXISTS "gm_read" ON public.group_members;
CREATE POLICY "gm_read" ON public.group_members FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_group_creator(group_id, auth.uid())
  OR public.is_admin()
);

-- group_members : gestion (insert/update/delete) par le créateur du groupe ou admin
DROP POLICY IF EXISTS "gm_manage" ON public.group_members;
CREATE POLICY "gm_manage" ON public.group_members FOR ALL USING (
  public.is_group_creator(group_id, auth.uid())
  OR public.is_admin()
);
