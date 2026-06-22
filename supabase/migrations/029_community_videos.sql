-- ════════════════════════════════════════════════════════════════════════
-- 029 — Communauté : feed vertical type TikTok (4 sources de contenu)
-- ────────────────────────────────────────────────────────────────────────
-- Un « média communauté » = un post (réutilise author/likes/comments) auquel
-- on rattache UNE ligne community_media.
--
-- 4 sources (source_type) :
--   admin          → vidéo publiée par l'admin (upload Bunny)
--   course_teaser  → teaser d'une formation par le formateur (upload Bunny) → CTA inscription
--   practical      → travail pratique d'un élève DÉJÀ téléversé (réutilise lesson_practicals) → encouragements
--   patron_demo    → démo d'un patron par le patronniste (upload Bunny) → CTA achat
--
-- Média : soit une vidéo hébergée sur Bunny (bunny_video_id), soit un fichier
-- déjà téléversé réutilisé tel quel (media_url) — photo OU vidéo (media_kind).
-- Feed réservé aux inscrits (lecture = authenticated).
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.community_media (
  id              uuid primary key default gen_random_uuid(),
  post_id         uuid not null references public.posts(id) on delete cascade,

  source_type     text not null check (source_type in ('admin','course_teaser','practical','patron_demo')),
  media_kind      text not null default 'video' check (media_kind in ('video','image')),

  -- Vidéo hébergée Bunny Stream (admin / course_teaser / patron_demo, ou pratique vidéo)
  bunny_video_id  text,
  -- OU fichier déjà téléversé réutilisé tel quel (pratique élève : photo/vidéo)
  media_url       text,

  duration_seconds int,           -- vidéos : ≤ 180
  thumbnail_url   text,
  status          text not null default 'ready' check (status in ('processing','ready','failed')),

  -- Cibles de CTA / liens (selon la source)
  course_id       uuid references public.courses(id) on delete set null,   -- teaser & pratique
  product_id      uuid references public.products(id) on delete set null,  -- patron_demo
  practical_id    uuid references public.lesson_practicals(id) on delete cascade, -- pratique partagée

  created_at      timestamptz not null default now(),

  -- Au moins une source de média
  constraint community_media_has_media check (bunny_video_id is not null or media_url is not null)
);

create index if not exists community_media_post_id_idx  on public.community_media(post_id);
create index if not exists community_media_source_idx    on public.community_media(source_type);
create index if not exists community_media_created_idx    on public.community_media(created_at desc);
create unique index if not exists community_media_bunny_uidx on public.community_media(bunny_video_id) where bunny_video_id is not null;
-- Un même travail pratique n'est partagé qu'une fois sur le feed
create unique index if not exists community_media_practical_uidx on public.community_media(practical_id) where practical_id is not null;

alter table public.community_media enable row level security;

-- Lecture : tout utilisateur authentifié (communauté réservée aux inscrits).
drop policy if exists "community_media_select_auth" on public.community_media;
create policy "community_media_select_auth" on public.community_media
  for select to authenticated using (true);

-- Insertion : uniquement l'auteur du post parent (les rôles autorisés par source
-- sont vérifiés côté serveur dans les Server Actions).
drop policy if exists "community_media_insert_author" on public.community_media;
create policy "community_media_insert_author" on public.community_media
  for insert to authenticated
  with check (exists (
    select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()
  ));

-- Suppression : auteur du post ou admin.
drop policy if exists "community_media_delete_owner" on public.community_media;
create policy "community_media_delete_owner" on public.community_media
  for delete to authenticated
  using (
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
    or public.is_admin()
  );

-- ── Profil : infos de base supplémentaires ────────────────────────────────
alter table public.users add column if not exists bio       text;
alter table public.users add column if not exists username  text;

create unique index if not exists users_username_uidx
  on public.users (lower(username)) where username is not null;
