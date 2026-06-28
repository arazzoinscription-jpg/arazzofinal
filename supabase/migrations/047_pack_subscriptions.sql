-- ════════════════════════════════════════════════════════════════════════
-- 047 — Abonnement par tranches pour les PACKS de formation
-- ────────────────────────────────────────────────────────────────────────
-- Même principe que l'abonnement d'un cours (migration 041) mais pour un pack
-- (bundle de plusieurs cours) :
--   • payer la totalité → 1 mois offert (prix × (M-1)/M), accès complet ;
--   • payer par tranches → montant mensuel = prix / M, et les chapitres de TOUS
--     les cours du pack s'ouvrent palier par palier sur les M mois.
-- Encaissement MANUEL (virement + reçu + validation admin), comme les cours.
-- ════════════════════════════════════════════════════════════════════════

-- ── course_packs : activation du mode abonnement + durée d'étalement ─────────
alter table public.course_packs
  add column if not exists subscription_enabled boolean not null default false;
alter table public.course_packs
  add column if not exists duration_months integer;

-- ── pack_subscriptions : un abonnement actif par (élève, pack) ───────────────
create table if not exists public.pack_subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  pack_id            uuid not null references public.course_packs(id) on delete cascade,
  status             text not null default 'active' check (status in ('active','completed','cancelled')),
  total_months       integer not null,
  installments_paid  integer not null default 0,
  monthly_amount_dzd integer not null default 0,
  next_due_date      date,
  last_reminded_at   timestamptz,
  started_at         timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  unique (user_id, pack_id)
);

create index if not exists pack_subscriptions_user_idx on public.pack_subscriptions(user_id);
create index if not exists pack_subscriptions_pack_idx on public.pack_subscriptions(pack_id);
create index if not exists pack_subscriptions_due_idx  on public.pack_subscriptions(next_due_date);

alter table public.pack_subscriptions enable row level security;

drop policy if exists "pack_subscriptions_read_own" on public.pack_subscriptions;
create policy "pack_subscriptions_read_own" on public.pack_subscriptions
  for select to authenticated using (auth.uid() = user_id);

-- ── orders : rattachement d'une commande à un pack / une échéance pack ───────
alter table public.orders
  add column if not exists pack_id uuid references public.course_packs(id) on delete set null;
alter table public.orders
  add column if not exists pack_subscription_id uuid references public.pack_subscriptions(id) on delete set null;

create index if not exists orders_pack_subscription_idx on public.orders(pack_subscription_id);
