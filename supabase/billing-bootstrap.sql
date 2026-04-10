-- Billing bootstrap migration
-- Ejecutar en Supabase SQL Editor cuando exista una base previa sin todas las columnas base de Billing.
-- Este script es idempotente: agrega lo faltante sin borrar datos.

create extension if not exists pgcrypto;

create table if not exists public.billing_records (
  id uuid primary key default gen_random_uuid(),
  origin text not null default 'tazki',
  company_id uuid references public.companies(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  service_period text,
  expected_invoice_date date,
  actual_invoice_date date,
  amount numeric(12,2) not null default 0,
  status text not null default 'draft',
  blocked_by_oc boolean not null default false,
  blocked_by_hes boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.billing_records add column if not exists origin text not null default 'tazki';
alter table public.billing_records add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.billing_records add column if not exists subscription_id uuid references public.subscriptions(id) on delete cascade;
alter table public.billing_records add column if not exists service_period text;
alter table public.billing_records add column if not exists service_period_start date;
alter table public.billing_records add column if not exists service_period_end date;
alter table public.billing_records add column if not exists expected_invoice_date date;
alter table public.billing_records add column if not exists actual_invoice_date date;
alter table public.billing_records add column if not exists amount numeric(12,2) not null default 0;
alter table public.billing_records add column if not exists status text not null default 'draft';
alter table public.billing_records add column if not exists blocked_by_oc boolean not null default false;
alter table public.billing_records add column if not exists blocked_by_hes boolean not null default false;
alter table public.billing_records add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.billing_records add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.billing_records add column if not exists invoice_number text;
alter table public.billing_records add column if not exists due_date date;
alter table public.billing_records add column if not exists total_uf numeric(12,2);
alter table public.billing_records add column if not exists uf_value numeric(12,2);
alter table public.billing_records add column if not exists outstanding_amount numeric(14,2);
alter table public.billing_records add column if not exists notes text;

update public.billing_records
set service_period = coalesce(
  nullif(service_period, ''),
  to_char(coalesce(expected_invoice_date, actual_invoice_date, current_date), 'YYYY-MM')
)
where service_period is null or btrim(service_period) = '';

update public.billing_records
set origin = 'tazki'
where origin is null or origin not in ('tazki', 'externo');

update public.billing_records
set status = case
  when status = 'billed' then 'issued'
  when status in ('pending', 'blocked') then 'draft'
  when status in ('draft', 'issued', 'pending_payment', 'paid', 'cancelled') then status
  else 'draft'
end;

update public.billing_records
set service_period_start = to_date(service_period || '-01', 'YYYY-MM-DD')
where service_period_start is null
  and service_period ~ '^\d{4}-\d{2}$';

update public.billing_records
set service_period_end = (date_trunc('month', service_period_start)::date + interval '1 month - 1 day')::date
where service_period_end is null
  and service_period_start is not null;

alter table public.billing_records drop constraint if exists billing_records_status_check;
alter table public.billing_records drop constraint if exists billing_records_origin_check;

alter table public.billing_records
  add constraint billing_records_status_check
  check (status in ('draft', 'issued', 'pending_payment', 'paid', 'cancelled'));

alter table public.billing_records
  add constraint billing_records_origin_check
  check (origin in ('tazki', 'externo'));

create index if not exists idx_billing_records_company_id on public.billing_records(company_id);
create index if not exists idx_billing_records_status on public.billing_records(status);
create index if not exists idx_billing_records_actual_invoice_date on public.billing_records(actual_invoice_date);
create index if not exists idx_billing_records_expected_invoice_date on public.billing_records(expected_invoice_date);

create table if not exists public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  billing_record_id uuid not null references public.billing_records(id) on delete cascade,
  payment_date date not null,
  payment_method text not null,
  total_paid numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.billing_payments add column if not exists billing_record_id uuid references public.billing_records(id) on delete cascade;
alter table public.billing_payments add column if not exists payment_date date;
alter table public.billing_payments add column if not exists payment_method text;
alter table public.billing_payments add column if not exists total_paid numeric(14,2) not null default 0;
alter table public.billing_payments add column if not exists notes text;
alter table public.billing_payments add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.billing_payments add column if not exists updated_at timestamptz not null default timezone('utc', now());
