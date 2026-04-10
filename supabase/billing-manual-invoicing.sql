-- Billing manual invoicing + outputs + import support
-- Ejecutar en Supabase SQL Editor antes de usar todos los botones del modulo.

alter table public.billing_records add column if not exists origin text not null default 'tazki';

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

alter table public.billing_records drop constraint if exists billing_records_status_check;
alter table public.billing_records drop constraint if exists billing_records_origin_check;

alter table public.billing_records
  add constraint billing_records_status_check
  check (status in ('draft', 'issued', 'pending_payment', 'paid', 'cancelled'));

alter table public.billing_records
  add constraint billing_records_origin_check
  check (origin in ('tazki', 'externo'));

alter table public.billing_records add column if not exists payer_company_id uuid references public.companies(id) on delete set null;
alter table public.billing_records add column if not exists due_date date;
alter table public.billing_records add column if not exists total_uf numeric(14,2) not null default 0;
alter table public.billing_records add column if not exists uf_value numeric(12,2);
alter table public.billing_records add column if not exists outstanding_amount numeric(14,2) not null default 0;
alter table public.billing_records add column if not exists currency text not null default 'CLP' check (currency in ('CLP', 'UF'));
alter table public.billing_records add column if not exists document_type text not null default '33' check (document_type in ('33', '34', '61'));
alter table public.billing_records add column if not exists invoice_number text;
alter table public.billing_records add column if not exists dte_status text not null default 'Pendiente';
alter table public.billing_records add column if not exists payment_condition text;
alter table public.billing_records add column if not exists reference_text text;
alter table public.billing_records add column if not exists payment_link text;
alter table public.billing_records add column if not exists purchase_order_reference text;
alter table public.billing_records add column if not exists hes_reference text;
alter table public.billing_records add column if not exists executive_id uuid references public.user_profiles(id) on delete set null;
alter table public.billing_records add column if not exists cost_center text;
alter table public.billing_records add column if not exists hubspot_id text;
alter table public.billing_records add column if not exists dte_email text;
alter table public.billing_records add column if not exists notes text;
alter table public.billing_records add column if not exists integration_status text not null default 'pending';
alter table public.billing_records add column if not exists xml_generated_at timestamptz;
alter table public.billing_records add column if not exists pdf_generated_at timestamptz;

create table if not exists public.billing_record_lines (
  id uuid primary key default gen_random_uuid(),
  billing_record_id uuid not null references public.billing_records(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  account_code text,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  tax_rate numeric(6,2) not null default 19,
  subtotal numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.billing_record_notes (
  id uuid primary key default gen_random_uuid(),
  billing_record_id uuid not null references public.billing_records(id) on delete cascade,
  body text not null,
  author_name text not null,
  author_email text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.billing_record_logs (
  id uuid primary key default gen_random_uuid(),
  billing_record_id uuid not null references public.billing_records(id) on delete cascade,
  action_type text not null,
  description text not null,
  actor_name text not null,
  actor_email text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.billing_record_outputs (
  id uuid primary key default gen_random_uuid(),
  billing_record_id uuid not null references public.billing_records(id) on delete cascade,
  output_type text not null check (output_type in ('xml', 'pdf')),
  file_name text not null,
  mime_type text not null,
  content_text text not null,
  generated_at timestamptz not null default timezone('utc', now()),
  generated_by_name text,
  generated_by_email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (billing_record_id, output_type)
);

create index if not exists idx_billing_records_payer_company_id on public.billing_records(payer_company_id);
create index if not exists idx_billing_records_due_date on public.billing_records(due_date);
create index if not exists idx_billing_records_invoice_number on public.billing_records(invoice_number);
create index if not exists idx_billing_records_document_type on public.billing_records(document_type);
create index if not exists idx_billing_records_currency on public.billing_records(currency);
create index if not exists idx_billing_records_executive_id on public.billing_records(executive_id);
create index if not exists idx_billing_records_integration_status on public.billing_records(integration_status);

create index if not exists idx_billing_record_lines_record_id on public.billing_record_lines(billing_record_id);
create index if not exists idx_billing_record_lines_product_id on public.billing_record_lines(product_id);
create index if not exists idx_billing_record_notes_record_id on public.billing_record_notes(billing_record_id);
create index if not exists idx_billing_record_logs_record_id on public.billing_record_logs(billing_record_id);
create index if not exists idx_billing_record_logs_created_at on public.billing_record_logs(created_at);
create index if not exists idx_billing_record_outputs_record_id on public.billing_record_outputs(billing_record_id);
create index if not exists idx_billing_record_outputs_generated_at on public.billing_record_outputs(generated_at);

drop trigger if exists set_billing_record_lines_updated_at on public.billing_record_lines;
create trigger set_billing_record_lines_updated_at
before update on public.billing_record_lines
for each row execute function public.handle_updated_at();

drop trigger if exists set_billing_record_notes_updated_at on public.billing_record_notes;
create trigger set_billing_record_notes_updated_at
before update on public.billing_record_notes
for each row execute function public.handle_updated_at();

drop trigger if exists set_billing_record_outputs_updated_at on public.billing_record_outputs;
create trigger set_billing_record_outputs_updated_at
before update on public.billing_record_outputs
for each row execute function public.handle_updated_at();

alter table public.billing_record_lines enable row level security;
alter table public.billing_record_notes enable row level security;
alter table public.billing_record_logs enable row level security;
alter table public.billing_record_outputs enable row level security;

drop policy if exists "Authenticated tazki users can read billing record lines" on public.billing_record_lines;
create policy "Authenticated tazki users can read billing record lines"
on public.billing_record_lines for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write billing record lines" on public.billing_record_lines;
create policy "Authenticated tazki users can write billing record lines"
on public.billing_record_lines for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read billing record notes" on public.billing_record_notes;
create policy "Authenticated tazki users can read billing record notes"
on public.billing_record_notes for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write billing record notes" on public.billing_record_notes;
create policy "Authenticated tazki users can write billing record notes"
on public.billing_record_notes for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read billing record logs" on public.billing_record_logs;
create policy "Authenticated tazki users can read billing record logs"
on public.billing_record_logs for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write billing record logs" on public.billing_record_logs;
create policy "Authenticated tazki users can write billing record logs"
on public.billing_record_logs for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read billing record outputs" on public.billing_record_outputs;
create policy "Authenticated tazki users can read billing record outputs"
on public.billing_record_outputs for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write billing record outputs" on public.billing_record_outputs;
create policy "Authenticated tazki users can write billing record outputs"
on public.billing_record_outputs for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');
