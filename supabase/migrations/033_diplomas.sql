-- ════════════════════════════════════════════════════════════════════════
-- 033 — Diplômes (basés sur les travaux pratiques approuvés)
-- ────────────────────────────────────────────────────────────────────────
-- Quand une élève atteint le seuil de travaux pratiques approuvés pour un
-- cours (par défaut 9), elle devient ÉLIGIBLE. On lui demande sa CNI, le prof
-- vérifie, génère le diplôme PDF (stocké sur Bunny) et l'expédie physiquement.
-- ════════════════════════════════════════════════════════════════════════

-- Seuil de travaux pratiques approuvés requis par cours (configurable).
alter table public.courses add column if not exists diploma_practicals_required int not null default 9;

create table if not exists public.diplomas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  -- eligible → cni_uploaded → generated → shipped
  status      text not null default 'eligible',
  full_name   text,
  cni_path    text,        -- chemin privé (bucket proofs) de la photo CNI
  diploma_url text,        -- URL Bunny du PDF généré
  numero      text,        -- numéro de diplôme
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists diplomas_user_idx on public.diplomas(user_id);
create index if not exists diplomas_course_idx on public.diplomas(course_id);

alter table public.diplomas enable row level security;

-- L'élève lit ses propres diplômes ; le staff passe par le client admin.
drop policy if exists "diplomas_read_own" on public.diplomas;
create policy "diplomas_read_own" on public.diplomas
  for select to authenticated using (auth.uid() = user_id);
