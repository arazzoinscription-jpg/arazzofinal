-- ════════════════════════════════════════════════════════════════════════
-- 042 — Demandes d'enrôlement (collecte d'intérêt + enrôlement en masse)
-- ────────────────────────────────────────────────────────────────────────
-- Bouton public « Demande d'enrôlement » sur les formations : le visiteur laisse
-- son nom + email pour une formation précise. L'admin voit ainsi quelles
-- formations attirent le plus, et peut enrôler en masse les intéressés à partir
-- des emails collectés. Aucune obligation de paiement (simple lead/intérêt).
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.enrollment_requests (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  full_name   text,
  email       text not null,
  phone       text,
  wilaya      text,
  -- pending → enrolled (admin a inscrit) | dismissed (écarté)
  status      text not null default 'pending' check (status in ('pending','enrolled','dismissed')),
  created_at  timestamptz not null default now(),
  -- une seule demande par (formation, email)
  unique (course_id, email)
);

create index if not exists enrollment_requests_course_idx on public.enrollment_requests(course_id);
create index if not exists enrollment_requests_status_idx on public.enrollment_requests(status);
create index if not exists enrollment_requests_email_idx  on public.enrollment_requests(email);

-- RLS activé : aucune policy publique → seul le service-role (client admin) y accède
-- (insertion via Server Action, lecture/gestion côté admin).
alter table public.enrollment_requests enable row level security;
