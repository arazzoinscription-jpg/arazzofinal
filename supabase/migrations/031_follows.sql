-- ════════════════════════════════════════════════════════════════════════
-- 031 — Abonnements communauté (follow)
-- ────────────────────────────────────────────────────────────────────────
-- follower_id suit following_id. Lecture pour tout inscrit (compter abonnés /
-- savoir si je suis). Écriture/suppression réservées à ses propres abonnements.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.follows (
  follower_id  uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index if not exists follows_following_idx on public.follows(following_id);
create index if not exists follows_follower_idx on public.follows(follower_id);

alter table public.follows enable row level security;

drop policy if exists "follows_select_auth" on public.follows;
create policy "follows_select_auth" on public.follows
  for select to authenticated using (true);

drop policy if exists "follows_insert_self" on public.follows;
create policy "follows_insert_self" on public.follows
  for insert to authenticated with check (follower_id = auth.uid());

drop policy if exists "follows_delete_self" on public.follows;
create policy "follows_delete_self" on public.follows
  for delete to authenticated using (follower_id = auth.uid());
