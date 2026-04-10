begin;

create table if not exists public.currency_rates (
  id uuid primary key default gen_random_uuid(),
  currency_code text not null,
  period_year integer not null,
  period_month integer not null,
  reference_date date not null,
  rate_value numeric(18,6) not null,
  source_type text not null default 'manual',
  source_note text,
  is_active boolean not null default true,
  created_by uuid references public.user_profiles(id) on delete set null,
  updated_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint currency_rates_currency_code_check check (currency_code in ('UF', 'CLP')),
  constraint currency_rates_period_year_check check (period_year between 2000 and 2100),
  constraint currency_rates_period_month_check check (period_month between 1 and 12),
  constraint currency_rates_rate_value_positive_check check (rate_value > 0),
  constraint currency_rates_source_type_check check (source_type in ('manual', 'api')),
  constraint currency_rates_period_unique unique (currency_code, period_year, period_month)
);

create index if not exists idx_currency_rates_period on public.currency_rates(currency_code, period_year desc, period_month desc);
create index if not exists idx_currency_rates_active on public.currency_rates(is_active);

drop trigger if exists set_currency_rates_updated_at on public.currency_rates;
create trigger set_currency_rates_updated_at
before update on public.currency_rates
for each row execute function public.handle_updated_at();

alter table public.billing_records
  add column if not exists currency_rate_id uuid references public.currency_rates(id) on delete set null,
  add column if not exists uf_value_used numeric(18,6),
  add column if not exists net_clp numeric(18,2),
  add column if not exists tax_clp numeric(18,2),
  add column if not exists total_clp numeric(18,2);

update public.billing_records
set
  uf_value_used = coalesce(uf_value_used, uf_value),
  total_clp = coalesce(total_clp, amount),
  net_clp = coalesce(net_clp, amount),
  tax_clp = coalesce(tax_clp, 0)
where uf_value_used is null
   or total_clp is null
   or net_clp is null
   or tax_clp is null;

commit;
