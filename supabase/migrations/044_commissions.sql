-- ════════════════════════════════════════════════════════════════════════
-- 044 — Commission de la plateforme (taux global, décidé par l'admin)
-- ────────────────────────────────────────────────────────────────────────
-- L'admin fixe UN taux de commission appliqué à toutes les ventes (patrons de
-- la boutique + commandes sur-mesure). Le gain du patronniste = prix × (1 − taux).
-- Le taux est modifiable à tout moment ; les gains sont calculés à la volée
-- avec le taux courant.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.platform_config (
  id              integer primary key default 1,
  commission_rate numeric(5,2) not null default 30 check (commission_rate >= 0 and commission_rate <= 100),
  updated_at      timestamptz not null default now(),
  constraint platform_config_singleton check (id = 1)
);

-- Ligne unique de configuration (idempotent).
insert into public.platform_config (id, commission_rate) values (1, 30)
on conflict (id) do nothing;

-- RLS : lecture autorisée à tous les connectés (le patronniste a besoin du taux) ;
-- écriture réservée au service-role (client admin via Server Action).
alter table public.platform_config enable row level security;
drop policy if exists "platform_config_read" on public.platform_config;
create policy "platform_config_read" on public.platform_config
  for select to authenticated using (true);
