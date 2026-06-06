-- ─────────────────────────────────────────────────────────────────────────────
-- 015 — Demandes de changement de rôle (élève → formateur / patronniste)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.role_requests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('formateur','patronniste')),
  message        TEXT,
  statut         TEXT NOT NULL DEFAULT 'en_attente'
                 CHECK (statut IN ('en_attente','approuve','refuse')),
  reviewed_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Une seule demande en attente par (utilisateur, rôle)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_role_request_pending
  ON public.role_requests (user_id, requested_role)
  WHERE statut = 'en_attente';

CREATE INDEX IF NOT EXISTS idx_role_requests_statut ON public.role_requests(statut);

ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rr_select_own" ON public.role_requests;
CREATE POLICY "rr_select_own" ON public.role_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "rr_insert_own" ON public.role_requests;
CREATE POLICY "rr_insert_own" ON public.role_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "rr_admin_all" ON public.role_requests;
CREATE POLICY "rr_admin_all" ON public.role_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
