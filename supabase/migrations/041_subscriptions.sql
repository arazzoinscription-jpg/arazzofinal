-- ════════════════════════════════════════════════════════════════════════
-- 041 — Inscription par abonnement (paiement par tranches + drip des chapitres)
-- ────────────────────────────────────────────────────────────────────────
-- Une formation peut être passée en « mode abonnement » par l'admin. L'élève
-- choisit alors, sur /offre :
--   • payer la totalité (remise = 1 mois offert) → accès complet immédiat ;
--   • payer par tranches mensuelles → le contenu s'ouvre palier par palier.
-- L'encaissement reste MANUEL (virement/Baridi + reçu + validation admin),
-- comme le flux orders/preuve existant. Chaque échéance = une commande pending.
-- ════════════════════════════════════════════════════════════════════════

-- ── courses : activation du mode abonnement + durée d'étalement ──────────────
alter table public.courses
  add column if not exists subscription_enabled boolean not null default false;
alter table public.courses
  add column if not exists duration_months integer;

-- ── course_subscriptions : un abonnement actif par (élève, formation) ────────
create table if not exists public.course_subscriptions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  course_id         uuid not null references public.courses(id) on delete cascade,
  -- active → completed (tout payé) ; cancelled (abandon)
  status            text not null default 'active' check (status in ('active','completed','cancelled')),
  total_months      integer not null,
  installments_paid integer not null default 0,
  monthly_amount_dzd integer not null default 0,
  next_due_date     date,
  last_reminded_at  timestamptz,
  started_at        timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists course_subscriptions_user_idx   on public.course_subscriptions(user_id);
create index if not exists course_subscriptions_course_idx on public.course_subscriptions(course_id);
create index if not exists course_subscriptions_due_idx    on public.course_subscriptions(next_due_date);

alter table public.course_subscriptions enable row level security;

-- L'élève lit ses propres abonnements ; le staff passe par le client admin (service-role).
drop policy if exists "course_subscriptions_read_own" on public.course_subscriptions;
create policy "course_subscriptions_read_own" on public.course_subscriptions
  for select to authenticated using (auth.uid() = user_id);

-- ── orders : rattachement d'une commande à une échéance d'abonnement ─────────
alter table public.orders
  add column if not exists subscription_id uuid references public.course_subscriptions(id) on delete set null;
alter table public.orders
  add column if not exists installment_month integer;

create index if not exists orders_subscription_idx on public.orders(subscription_id);
