begin;

create extension if not exists pgcrypto;

create or replace function public.set_billing_record_defaults()
returns trigger
language plpgsql
as $$
declare
  next_amount_due numeric(14,2);
begin
  new.origin := coalesce(new.origin, 'tazki');
  new.source_system := coalesce(nullif(new.source_system, ''), 'octopus_ui');
  new.document_type := coalesce(new.document_type, '33');
  new.status := coalesce(new.status, 'draft');
  new.dte_status := coalesce(new.dte_status, case when new.origin in ('manual', 'external', 'import_excel') then 'external' else 'not_sent' end);
  new.currency := coalesce(new.currency, 'CLP');
  new.exchange_rate := coalesce(new.exchange_rate, 1);
  new.payment_terms_days := coalesce(new.payment_terms_days, 0);

  if new.issue_date is not null and new.due_date is null and new.payment_terms_days >= 0 then
    new.due_date := new.issue_date + new.payment_terms_days;
  end if;

  if new.service_period_start is not null and new.service_period_end is null then
    new.service_period_end := (date_trunc('month', new.service_period_start)::date + interval '1 month - 1 day')::date;
  end if;

  new.subtotal_amount := coalesce(new.subtotal_amount, 0);
  new.tax_amount := coalesce(new.tax_amount, 0);
  new.total_amount := coalesce(new.total_amount, new.subtotal_amount + new.tax_amount, 0);
  new.amount_paid := coalesce(new.amount_paid, 0);
  next_amount_due := greatest(coalesce(new.total_amount, 0) - coalesce(new.amount_paid, 0), 0);
  new.amount_due := coalesce(new.amount_due, next_amount_due);

  new.subtotal_uf := coalesce(new.subtotal_uf, 0);
  new.tax_uf := coalesce(new.tax_uf, 0);
  new.total_uf := coalesce(new.total_uf, new.subtotal_uf + new.tax_uf, 0);
  new.amount_due_uf := coalesce(new.amount_due_uf, greatest(coalesce(new.total_uf, 0) - coalesce(new.amount_paid_uf, 0), 0));

  if coalesce(new.amount_due, 0) <= 500 then
    new.payment_status := 'paid';
  elsif coalesce(new.amount_paid, 0) > 0 then
    new.payment_status := 'partial';
  elsif new.due_date is not null and new.due_date < current_date then
    new.payment_status := 'overdue';
  else
    new.payment_status := coalesce(new.payment_status, 'unpaid');
  end if;

  new.is_manual := coalesce(new.is_manual, new.origin in ('manual', 'external', 'import_excel'));
  new.is_legacy := coalesce(new.is_legacy, false);
  new.is_deleted := coalesce(new.is_deleted, false);

  return new;
end;
$$;

create or replace function public.refresh_billing_record_payment_snapshot(target_billing_record_id uuid)
returns void
language plpgsql
as $$
declare
  paid_amount numeric(14,2);
  paid_amount_uf numeric(14,4);
begin
  select
    coalesce(sum(amount), 0),
    coalesce(sum(amount_uf), 0)
  into paid_amount, paid_amount_uf
  from public.billing_payments
  where billing_record_id = target_billing_record_id;

  update public.billing_records
  set
    amount_paid = paid_amount,
    amount_due = greatest(coalesce(total_amount, 0) - paid_amount, 0),
    amount_paid_uf = paid_amount_uf,
    amount_due_uf = greatest(coalesce(total_uf, 0) - paid_amount_uf, 0),
    payment_status = case
      when greatest(coalesce(total_amount, 0) - paid_amount, 0) <= 500 then 'paid'
      when paid_amount > 0 then 'partial'
      when due_date is not null and due_date < current_date then 'overdue'
      else 'unpaid'
    end,
    updated_at = timezone('utc', now())
  where id = target_billing_record_id;
end;
$$;

create or replace function public.handle_billing_payment_snapshot()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_billing_record_payment_snapshot(old.billing_record_id);
    return old;
  end if;

  perform public.refresh_billing_record_payment_snapshot(new.billing_record_id);

  if tg_op = 'UPDATE' and new.billing_record_id is distinct from old.billing_record_id then
    perform public.refresh_billing_record_payment_snapshot(old.billing_record_id);
  end if;

  return new;
end;
$$;

alter table public.billing_records
  add column if not exists payer_company_id uuid references public.companies(id) on delete set null,
  add column if not exists hubspot_deal_id text,
  add column if not exists hubspot_object_id text,
  add column if not exists origin text not null default 'tazki',
  add column if not exists source_system text not null default 'octopus_ui',
  add column if not exists document_type text not null default '33',
  add column if not exists document_number text,
  add column if not exists folio text,
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists dte_status text not null default 'not_sent',
  add column if not exists currency text not null default 'CLP',
  add column if not exists exchange_rate numeric(14,6) not null default 1,
  add column if not exists issue_date date,
  add column if not exists service_period_start date,
  add column if not exists service_period_end date,
  add column if not exists payment_terms_days integer not null default 0,
  add column if not exists reference_glosa text,
  add column if not exists purchase_order_ref text,
  add column if not exists hes_ref text,
  add column if not exists migo_ref text,
  add column if not exists edp_ref text,
  add column if not exists subtotal_amount numeric(14,2) not null default 0,
  add column if not exists tax_amount numeric(14,2) not null default 0,
  add column if not exists total_amount numeric(14,2) not null default 0,
  add column if not exists amount_paid numeric(14,2) not null default 0,
  add column if not exists amount_due numeric(14,2) not null default 0,
  add column if not exists subtotal_uf numeric(14,4) not null default 0,
  add column if not exists tax_uf numeric(14,4) not null default 0,
  add column if not exists total_uf numeric(14,4) not null default 0,
  add column if not exists uf_value numeric(12,2),
  add column if not exists amount_paid_uf numeric(14,4) not null default 0,
  add column if not exists amount_due_uf numeric(14,4) not null default 0,
  add column if not exists payment_link text,
  add column if not exists pdf_url text,
  add column if not exists xml_url text,
  add column if not exists is_manual boolean not null default false,
  add column if not exists is_legacy boolean not null default false,
  add column if not exists is_deleted boolean not null default false,
  add column if not exists created_by uuid references public.user_profiles(id) on delete set null,
  add column if not exists updated_by uuid references public.user_profiles(id) on delete set null;

alter table public.billing_records
  alter column subscription_id drop not null;

alter table public.billing_records drop constraint if exists billing_records_origin_check;
alter table public.billing_records drop constraint if exists billing_records_source_system_check;
alter table public.billing_records drop constraint if exists billing_records_status_check;
alter table public.billing_records drop constraint if exists billing_records_payment_status_check;
alter table public.billing_records drop constraint if exists billing_records_dte_status_check;
alter table public.billing_records drop constraint if exists billing_records_document_type_check;
alter table public.billing_records drop constraint if exists billing_records_currency_check;
alter table public.billing_records drop constraint if exists billing_records_service_period_check;
alter table public.billing_records drop constraint if exists billing_records_amounts_check;

update public.billing_records
set
  origin = case
    when origin in ('externo', 'external') then 'external'
    when origin in ('manual', 'hubspot', 'api', 'import_excel', 'tazki') then origin
    else 'tazki'
  end,
  source_system = case
    when coalesce(nullif(source_system, ''), '') <> '' then source_system
    when origin = 'hubspot' then 'hubspot'
    when origin = 'api' then 'api'
    when origin = 'import_excel' then 'historical_migration'
    when origin in ('manual', 'external') then 'external_upload'
    else 'octopus_ui'
  end,
  document_number = coalesce(document_number, invoice_number),
  issue_date = coalesce(issue_date, actual_invoice_date, expected_invoice_date),
  service_period_start = coalesce(service_period_start, to_date(service_period || '-01', 'YYYY-MM-DD')),
  service_period_end = coalesce(
    service_period_end,
    case
      when service_period_start is not null then (date_trunc('month', service_period_start)::date + interval '1 month - 1 day')::date
      when service_period ~ '^\d{4}-\d{2}$' then (date_trunc('month', to_date(service_period || '-01', 'YYYY-MM-DD'))::date + interval '1 month - 1 day')::date
      else null
    end
  ),
  reference_glosa = coalesce(reference_glosa, reference_text),
  purchase_order_ref = coalesce(purchase_order_ref, purchase_order_reference),
  hes_ref = coalesce(hes_ref, hes_reference),
  subtotal_amount = case when subtotal_amount = 0 then coalesce(amount, 0) else subtotal_amount end,
  total_amount = case when total_amount = 0 then coalesce(amount, 0) else total_amount end,
  amount_due = case when amount_due = 0 then coalesce(outstanding_amount, amount, 0) else amount_due end,
  amount_paid = greatest(coalesce(total_amount, coalesce(amount, 0), 0) - coalesce(amount_due, outstanding_amount, amount, 0), 0),
  subtotal_uf = case when subtotal_uf = 0 then coalesce(total_uf, 0) else subtotal_uf end,
  total_uf = coalesce(total_uf, 0),
  amount_due_uf = case when amount_due_uf = 0 then coalesce(total_uf, 0) else amount_due_uf end,
  payment_terms_days = coalesce(payment_terms_days, 0),
  dte_status = case
    when lower(coalesce(dte_status, '')) in ('accepted', 'aceptado') then 'accepted'
    when lower(coalesce(dte_status, '')) in ('rejected', 'rechazado') then 'rejected'
    when lower(coalesce(dte_status, '')) in ('pending', 'pendiente', 'preparado', 'enviado') then 'pending'
    when origin in ('manual', 'external', 'import_excel') then 'external'
    else 'not_sent'
  end,
  status = case
    when status in ('cancelled', 'anulada') then 'cancelled'
    when status = 'voided' then 'voided'
    when coalesce(actual_invoice_date, issue_date) is not null or coalesce(invoice_number, document_number, folio) is not null then 'issued'
    else 'draft'
  end,
  payment_status = case
    when coalesce(amount_due, outstanding_amount, amount, 0) <= 500 then 'paid'
    when greatest(coalesce(amount, 0) - coalesce(outstanding_amount, amount, 0), 0) > 0 then 'partial'
    when coalesce(due_date, issue_date) is not null and coalesce(due_date, issue_date) < current_date then 'overdue'
    else 'unpaid'
  end,
  is_manual = coalesce(is_manual, origin in ('manual', 'external', 'import_excel')),
  is_legacy = coalesce(is_legacy, false),
  is_deleted = coalesce(is_deleted, false);

alter table public.billing_records
  add constraint billing_records_origin_check
    check (origin in ('tazki', 'manual', 'hubspot', 'api', 'import_excel', 'external')),
  add constraint billing_records_status_check
    check (status in ('draft', 'issued', 'cancelled', 'voided')),
  add constraint billing_records_payment_status_check
    check (payment_status in ('unpaid', 'partial', 'paid', 'overdue')),
  add constraint billing_records_dte_status_check
    check (dte_status in ('not_sent', 'pending', 'accepted', 'rejected', 'external')),
  add constraint billing_records_document_type_check
    check (document_type in ('33', '34', '61')),
  add constraint billing_records_currency_check
    check (currency in ('CLP', 'UF')),
  add constraint billing_records_service_period_check
    check (service_period_start is null or service_period_end is null or service_period_start <= service_period_end),
  add constraint billing_records_amounts_check
    check (
      subtotal_amount >= 0
      and tax_amount >= 0
      and total_amount >= 0
      and amount_paid >= 0
      and amount_due >= 0
      and subtotal_uf >= 0
      and tax_uf >= 0
      and total_uf >= 0
      and amount_paid_uf >= 0
      and amount_due_uf >= 0
    );

create index if not exists idx_billing_records_company_id on public.billing_records(company_id);
create index if not exists idx_billing_records_payer_company_id on public.billing_records(payer_company_id);
create index if not exists idx_billing_records_subscription_id on public.billing_records(subscription_id);
create index if not exists idx_billing_records_origin on public.billing_records(origin);
create index if not exists idx_billing_records_source_system on public.billing_records(source_system);
create index if not exists idx_billing_records_status on public.billing_records(status);
create index if not exists idx_billing_records_payment_status on public.billing_records(payment_status);
create index if not exists idx_billing_records_dte_status on public.billing_records(dte_status);
create index if not exists idx_billing_records_issue_date on public.billing_records(issue_date);
create index if not exists idx_billing_records_due_date on public.billing_records(due_date);
create index if not exists idx_billing_records_document_type on public.billing_records(document_type);
create index if not exists idx_billing_records_document_number on public.billing_records(document_number);
create index if not exists idx_billing_records_folio on public.billing_records(folio);
create index if not exists idx_billing_records_created_at on public.billing_records(created_at);
create index if not exists idx_billing_records_company_issue_date_desc on public.billing_records(company_id, issue_date desc);
create index if not exists idx_billing_records_status_payment_status on public.billing_records(status, payment_status);
create index if not exists idx_billing_records_origin_created_at_desc on public.billing_records(origin, created_at desc);
create index if not exists idx_billing_records_document_type_number on public.billing_records(document_type, document_number);

create table if not exists public.billing_record_lines (
  id uuid primary key default gen_random_uuid(),
  billing_record_id uuid not null references public.billing_records(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text,
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

alter table public.billing_record_lines
  add column if not exists description text,
  add column if not exists accounting_account_id uuid,
  add column if not exists tax_code text not null default 'IVA',
  add column if not exists subtotal_amount numeric(14,2) not null default 0,
  add column if not exists subtotal_uf numeric(14,4) not null default 0;

update public.billing_record_lines
set
  description = coalesce(description, product_name),
  subtotal_amount = case when subtotal_amount = 0 then coalesce(subtotal, 0) else subtotal_amount end,
  subtotal_uf = coalesce(subtotal_uf, 0);

create index if not exists idx_billing_record_lines_record_id on public.billing_record_lines(billing_record_id);
create index if not exists idx_billing_record_lines_sort_order on public.billing_record_lines(billing_record_id, sort_order);

drop trigger if exists set_billing_record_lines_updated_at on public.billing_record_lines;
create trigger set_billing_record_lines_updated_at
before update on public.billing_record_lines
for each row execute function public.handle_updated_at();

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

alter table public.billing_payments
  add column if not exists currency text not null default 'CLP',
  add column if not exists amount numeric(14,2) not null default 0,
  add column if not exists amount_uf numeric(14,4) not null default 0,
  add column if not exists bank_reference text,
  add column if not exists origin text not null default 'tazki',
  add column if not exists source_system text not null default 'octopus_ui',
  add column if not exists created_by uuid references public.user_profiles(id) on delete set null;

update public.billing_payments
set
  amount = case when amount = 0 then coalesce(total_paid, 0) else amount end,
  amount_uf = coalesce(amount_uf, 0),
  origin = case when origin in ('tazki', 'manual', 'hubspot', 'api', 'import_excel', 'external') then origin else 'tazki' end,
  source_system = case when coalesce(nullif(source_system, ''), '') <> '' then source_system else 'octopus_ui' end,
  currency = case when currency in ('CLP', 'UF') then currency else 'CLP' end;

alter table public.billing_payments drop constraint if exists billing_payments_currency_check;
alter table public.billing_payments drop constraint if exists billing_payments_origin_check;

alter table public.billing_payments
  add constraint billing_payments_currency_check
    check (currency in ('CLP', 'UF')),
  add constraint billing_payments_origin_check
    check (origin in ('tazki', 'manual', 'hubspot', 'api', 'import_excel', 'external'));

create index if not exists idx_billing_payments_billing_record_id on public.billing_payments(billing_record_id);
create index if not exists idx_billing_payments_payment_date on public.billing_payments(payment_date);

create table if not exists public.billing_outputs (
  id uuid primary key default gen_random_uuid(),
  billing_record_id uuid not null references public.billing_records(id) on delete cascade,
  output_type text not null check (output_type in ('pdf', 'xml', 'payment_link', 'json', 'other')),
  file_url text,
  external_url text,
  status text not null default 'pending' check (status in ('pending', 'generated', 'uploaded', 'failed', 'external')),
  generated_at timestamptz,
  generated_by uuid references public.user_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_billing_outputs_record_id on public.billing_outputs(billing_record_id);
create index if not exists idx_billing_outputs_generated_at on public.billing_outputs(generated_at desc);

create table if not exists public.billing_logs (
  id uuid primary key default gen_random_uuid(),
  billing_record_id uuid not null references public.billing_records(id) on delete cascade,
  event_type text not null,
  message text not null,
  old_values jsonb,
  new_values jsonb,
  actor_user_id uuid references public.user_profiles(id) on delete set null,
  actor_email text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_billing_logs_record_id on public.billing_logs(billing_record_id);
create index if not exists idx_billing_logs_created_at_desc on public.billing_logs(created_at desc);

create table if not exists public.billing_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  billing_record_id uuid references public.billing_records(id) on delete set null,
  integration_name text not null,
  action_type text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'success', 'failed', 'cancelled')),
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb,
  error_message text,
  executed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_billing_sync_jobs_record_id on public.billing_sync_jobs(billing_record_id);
create index if not exists idx_billing_sync_jobs_status on public.billing_sync_jobs(status);
create index if not exists idx_billing_sync_jobs_created_at_desc on public.billing_sync_jobs(created_at desc);

drop trigger if exists set_billing_records_v2_defaults on public.billing_records;
create trigger set_billing_records_v2_defaults
before insert or update on public.billing_records
for each row execute function public.set_billing_record_defaults();

drop trigger if exists refresh_billing_record_payment_snapshot_on_write on public.billing_payments;
create trigger refresh_billing_record_payment_snapshot_on_write
after insert or update or delete on public.billing_payments
for each row execute function public.handle_billing_payment_snapshot();

alter table public.billing_record_lines enable row level security;
alter table public.billing_outputs enable row level security;
alter table public.billing_logs enable row level security;
alter table public.billing_sync_jobs enable row level security;

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

drop policy if exists "Authenticated tazki users can read billing outputs" on public.billing_outputs;
create policy "Authenticated tazki users can read billing outputs"
on public.billing_outputs for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write billing outputs" on public.billing_outputs;
create policy "Authenticated tazki users can write billing outputs"
on public.billing_outputs for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read billing logs" on public.billing_logs;
create policy "Authenticated tazki users can read billing logs"
on public.billing_logs for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write billing logs" on public.billing_logs;
create policy "Authenticated tazki users can write billing logs"
on public.billing_logs for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read billing sync jobs" on public.billing_sync_jobs;
create policy "Authenticated tazki users can read billing sync jobs"
on public.billing_sync_jobs for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write billing sync jobs" on public.billing_sync_jobs;
create policy "Authenticated tazki users can write billing sync jobs"
on public.billing_sync_jobs for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

commit;
