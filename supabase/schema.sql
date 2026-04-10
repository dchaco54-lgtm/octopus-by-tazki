create extension if not exists "pgcrypto";

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text not null unique,
  role text not null default 'basic' check (role in ('basic', 'editor', 'admin')),
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_profiles
add column if not exists must_change_password boolean not null default true;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (auth_user_id, full_name, email, role, must_change_password)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    lower(new.email),
    'basic',
    true
  )
  on conflict (auth_user_id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role
      from public.user_profiles
      where auth_user_id = auth.uid()
      limit 1
    ),
    'basic'
  );
$$;

create table if not exists public.user_view_preferences (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  view_key text not null,
  value jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (auth_user_id, view_key)
);

alter table public.user_view_preferences enable row level security;

drop policy if exists "user_view_preferences_select_own" on public.user_view_preferences;
create policy "user_view_preferences_select_own"
on public.user_view_preferences
for select
using (auth.uid() = auth_user_id);

drop policy if exists "user_view_preferences_insert_own" on public.user_view_preferences;
create policy "user_view_preferences_insert_own"
on public.user_view_preferences
for insert
with check (auth.uid() = auth_user_id);

drop policy if exists "user_view_preferences_update_own" on public.user_view_preferences;
create policy "user_view_preferences_update_own"
on public.user_view_preferences
for update
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

drop policy if exists "user_view_preferences_delete_own" on public.user_view_preferences;
create policy "user_view_preferences_delete_own"
on public.user_view_preferences
for delete
using (auth.uid() = auth_user_id);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trade_name text not null,
  rut text not null unique,
  billing_email text not null,
  admin_email text not null,
  phone text,
  address text,
  commune text,
  city text,
  country text not null default 'Chile',
  legal_representative_name text,
  legal_representative_rut text,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.companies add column if not exists internal_code text;
alter table public.companies add column if not exists payer_client_id uuid references public.companies(id) on delete set null;
alter table public.companies add column if not exists payer_client_rut text;
alter table public.companies add column if not exists customer_type text default 'Empresa';
alter table public.companies add column if not exists taxpayer_type text default 'Primera Categoria';
alter table public.companies add column if not exists mobile_phone text;
alter table public.companies add column if not exists company_email text;
alter table public.companies add column if not exists website text;
alter table public.companies add column if not exists company_category text;
alter table public.companies add column if not exists currency text default 'CLP';
alter table public.companies add column if not exists dte_email text;
alter table public.companies add column if not exists industry text;
alter table public.companies drop column if exists sales_executive;
alter table public.companies add column if not exists billing_model text default 'recurring_without_oc';
alter table public.companies add column if not exists billing_document_requirement text default 'Ninguno';
alter table public.companies add column if not exists oc_usage_type text default 'no_oc';
alter table public.companies add column if not exists is_recurring_billing boolean default true;

update public.companies
set billing_model = case
  when billing_document_requirement is not null and billing_document_requirement <> 'Ninguno' then 'recurring_with_oc_validation'
  else 'recurring_without_oc'
end
where billing_model is null;

update public.companies
set billing_document_requirement = 'Ninguno'
where billing_document_requirement is null;

update public.companies
set oc_usage_type = case
  when billing_model = 'recurring_without_oc' then 'no_oc'
  else 'annual_oc'
end
where oc_usage_type is null;

update public.companies
set is_recurring_billing = true
where is_recurring_billing is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_billing_model_check'
  ) then
    alter table public.companies
    add constraint companies_billing_model_check
    check (billing_model in ('recurring_without_oc', 'recurring_with_oc', 'recurring_with_oc_validation'));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_billing_document_requirement_check'
  ) then
    alter table public.companies
    add constraint companies_billing_document_requirement_check
    check (billing_document_requirement in ('Ninguno', 'MIGO', 'HES', 'MIGO + HES', 'Orden de Servicio', 'Otro'));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_oc_usage_type_check'
  ) then
    alter table public.companies
    add constraint companies_oc_usage_type_check
    check (oc_usage_type in ('no_oc', 'annual_oc'));
  end if;
end;
$$;

create sequence if not exists public.companies_internal_code_seq;

create or replace function public.handle_company_internal_code()
returns trigger
language plpgsql
as $$
begin
  if new.internal_code is null or length(trim(new.internal_code)) = 0 then
    new.internal_code = nextval('public.companies_internal_code_seq')::text;
  end if;
  return new;
end;
$$;

do $$
declare
  max_code bigint;
begin
  select coalesce(max((internal_code)::bigint), 0)
  into max_code
  from public.companies
  where internal_code ~ '^[0-9]+$';

  -- If there are no numeric codes yet, keep nextval() at 1 (avoid setval(0) which is out of bounds).
  perform setval(
    'public.companies_internal_code_seq',
    greatest(max_code, 1),
    max_code > 0
  );
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'companies_status_check'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table public.companies drop constraint companies_status_check;
  end if;

  alter table public.companies
    add constraint companies_status_check
    check (status in ('active', 'inactive', 'suspended', 'churned'));
end $$;

create table if not exists public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.companies(id) on delete cascade,
  internal_code text,
  contact_type text not null,
  name text not null,
  email text,
  address text,
  city text,
  phone text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.client_internal_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.companies(id) on delete cascade,
  role_type text not null check (role_type in ('sdr', 'prospector', 'sales_executive', 'ob_executive', 'csm')),
  full_name text not null,
  email text not null,
  phone text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.client_contacts add column if not exists internal_code text;

create sequence if not exists public.client_contacts_internal_code_seq;

create or replace function public.handle_client_contact_internal_code()
returns trigger
language plpgsql
as $$
begin
  if new.internal_code is null or length(trim(new.internal_code)) = 0 then
    new.internal_code = nextval('public.client_contacts_internal_code_seq')::text;
  end if;
  return new;
end;
$$;

create table if not exists public.client_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.companies(id) on delete cascade,
  purchase_order_number text not null,
  valid_from date,
  valid_to date,
  status text not null default 'vigente' check (status in ('vigente', 'vencida', 'futura', 'anulada')),
  notes text,
  attachment_path text,
  attachment_filename text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.client_purchase_orders add column if not exists attachment_path text;
alter table public.client_purchase_orders add column if not exists attachment_filename text;

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.companies(id) on delete cascade,
  author_name text,
  author_email text,
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.client_activity_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.companies(id) on delete cascade,
  action_type text not null,
  description text not null,
  actor_name text,
  actor_email text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  role text,
  area text,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  category text not null default 'plan',
  billing_type text not null default 'recurrente',
  affects_mrr boolean not null default true,
  affects_revenue boolean not null default true,
  base_price_uf numeric(12,2) not null default 0,
  is_active boolean not null default true,
  allow_manual_override boolean not null default true,
  depends_on_plan boolean not null default false,
  is_legacy boolean not null default false,
  allow_upsell boolean not null default true,
  allow_cross_sell boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.products add column if not exists affects_mrr boolean not null default true;
alter table public.products add column if not exists affects_revenue boolean not null default true;
alter table public.products add column if not exists base_price_uf numeric(12,2) not null default 0;
alter table public.products add column if not exists allow_manual_override boolean not null default true;
alter table public.products add column if not exists depends_on_plan boolean not null default false;
alter table public.products add column if not exists is_legacy boolean not null default false;
alter table public.products add column if not exists category text not null default 'plan';
alter table public.products add column if not exists billing_type text not null default 'recurrente';
alter table public.products add column if not exists allow_upsell boolean not null default true;
alter table public.products add column if not exists allow_cross_sell boolean not null default true;

update public.products
set category = case
  when lower(coalesce(category, '')) in ('plan', 'addon', 'service', 'implementation', 'support', 'one_time', 'legacy') then category
  else 'service'
end
where category is null or length(trim(category)) = 0;

update public.products
set billing_type = case
  when lower(coalesce(billing_type, '')) in ('recurrente', 'no_recurrente') then billing_type
  when lower(coalesce(billing_type, '')) in ('monthly', 'recurring', 'recurrent') then 'recurrente'
  when lower(coalesce(billing_type, '')) in ('one_time', 'onetime', 'non_recurring', 'nonrecurrent', 'no_recurrente') then 'no_recurrente'
  else 'recurrente'
end
where billing_type is null or length(trim(billing_type)) = 0 or lower(billing_type) not in ('recurrente', 'no_recurrente');

update public.products
set affects_mrr = case when billing_type = 'no_recurrente' then false else affects_mrr end
where affects_mrr is true and billing_type = 'no_recurrente';

update public.products
set affects_revenue = true
where affects_revenue is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_billing_type_check'
  ) then
    alter table public.products
      add constraint products_billing_type_check
      check (billing_type in ('recurrente', 'no_recurrente'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_category_check'
  ) then
    alter table public.products
      add constraint products_category_check
      check (category in ('plan', 'addon', 'service', 'implementation', 'support', 'one_time', 'legacy'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_base_price_uf_non_negative_check'
  ) then
    alter table public.products
      add constraint products_base_price_uf_non_negative_check
      check (base_price_uf >= 0);
  end if;
end $$;

create table if not exists public.pricing_strategies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.pricing_strategies add column if not exists version integer not null default 1;
alter table public.pricing_strategies add column if not exists valid_from date;
alter table public.pricing_strategies add column if not exists valid_to date;

create table if not exists public.pricing_variables (
  id uuid primary key default gen_random_uuid(),
  variable_code text not null unique,
  name text not null,
  description text,
  variable_type text not null,
  unit text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pricing_variables_variable_type_check'
  ) then
    alter table public.pricing_variables
      add constraint pricing_variables_variable_type_check
      check (variable_type in ('number', 'boolean', 'select', 'text'));
  end if;
end $$;

create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  pricing_strategy_id uuid not null references public.pricing_strategies(id) on delete cascade,
  target_type text not null,
  target_product_id uuid references public.products(id) on delete cascade,
  target_variable_id uuid references public.pricing_variables(id) on delete cascade,
  pricing_mode text not null,
  value_uf numeric(12,2),
  min_value numeric(12,2),
  max_value numeric(12,2),
  formula_text text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pricing_rules_target_type_check'
  ) then
    alter table public.pricing_rules
      add constraint pricing_rules_target_type_check
      check (target_type in ('plan', 'addon', 'service', 'variable'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pricing_rules_pricing_mode_check'
  ) then
    alter table public.pricing_rules
      add constraint pricing_rules_pricing_mode_check
      check (pricing_mode in ('fixed', 'per_unit', 'formula', 'range'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pricing_rules_target_id_check'
  ) then
    alter table public.pricing_rules
      add constraint pricing_rules_target_id_check
      check (
        (target_type = 'variable' and target_variable_id is not null and target_product_id is null)
        or (target_type <> 'variable' and target_product_id is not null and target_variable_id is null)
      );
  end if;
end $$;

create table if not exists public.sales_channels (
  id uuid primary key default gen_random_uuid(),
  channel_code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  start_date date not null,
  end_date date,
  billing_period text not null,
  amount numeric(12,2) not null,
  currency text not null default 'CLP',
  included_users integer not null default 0,
  active_users integer not null default 0,
  requires_oc boolean not null default false,
  requires_hes boolean not null default false,
  payment_terms_days integer not null default 30,
  billing_day integer,
  next_billing_date date,
  last_billing_date date,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended', 'cancelled')),
  suspension_reason text,
  churn_risk text,
  contracted_at date,
  sales_owner_name text,
  previous_subscription_id uuid references public.subscriptions(id) on delete set null,
  change_type text not null default 'new' check (change_type in ('upsell', 'downsell', 'renewal', 'new')),
  cancellation_reason text,
  suspended_at date,
  internal_comments text,
  documentation_blocked boolean not null default false,
  health_score integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Legacy compatibility: older projects may have subscriptions without product_id or with it being optional.
alter table public.subscriptions add column if not exists product_id uuid references public.products(id) on delete restrict;
alter table public.subscriptions alter column product_id drop not null;

alter table public.subscriptions add column if not exists contracted_at date;
alter table public.subscriptions add column if not exists sales_owner_name text;
alter table public.subscriptions add column if not exists previous_subscription_id uuid references public.subscriptions(id) on delete set null;
alter table public.subscriptions add column if not exists change_type text not null default 'new';
alter table public.subscriptions add column if not exists cancellation_reason text;
alter table public.subscriptions add column if not exists suspended_at date;
alter table public.subscriptions add column if not exists internal_comments text;
alter table public.subscriptions add column if not exists documentation_blocked boolean not null default false;
alter table public.subscriptions add column if not exists health_score integer;
alter table public.subscriptions add column if not exists subscription_code text;
alter table public.subscriptions add column if not exists customer_id uuid references public.companies(id) on delete cascade;
alter table public.subscriptions add column if not exists hubspot_deal_id text;
alter table public.subscriptions add column if not exists close_reason text;
alter table public.subscriptions add column if not exists pricing_strategy_id uuid references public.pricing_strategies(id) on delete set null;
alter table public.subscriptions add column if not exists billing_type text default 'recurrente';
alter table public.subscriptions add column if not exists recurrence text default 'mensual';
alter table public.subscriptions add column if not exists sales_executive_id uuid references public.user_profiles(id) on delete set null;
alter table public.subscriptions add column if not exists channel text;
alter table public.subscriptions add column if not exists suspension_date date;
alter table public.subscriptions add column if not exists payer_name text;
alter table public.subscriptions add column if not exists payer_rut text;
alter table public.subscriptions add column if not exists total_mrr_uf numeric(12,2) not null default 0;
alter table public.subscriptions add column if not exists middleware_sync_status text not null default 'pending';
alter table public.subscriptions add column if not exists middleware_last_event text;
alter table public.subscriptions add column if not exists middleware_last_synced_at timestamptz;
alter table public.subscriptions add column if not exists hubspot_sync_status text not null default 'pending';
alter table public.subscriptions add column if not exists hubspot_last_synced_at timestamptz;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_status_check'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions drop constraint subscriptions_status_check;
  end if;

  alter table public.subscriptions
    add constraint subscriptions_status_check
    check (status in ('demo', 'active', 'closed'));
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_change_type_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_change_type_check
      check (change_type in ('upsell', 'downsell', 'renewal', 'new'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_close_reason_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_close_reason_check
      check (close_reason in ('churn', 'downsell', 'upsell', 'new') or close_reason is null);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_billing_type_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_billing_type_check
      check (billing_type in ('recurrente', 'no_recurrente'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_recurrence_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_recurrence_check
      check (recurrence in ('mensual', 'trimestral', 'semestral', 'anual', 'custom'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_sync_status_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_sync_status_check
      check (
        middleware_sync_status in ('pending', 'queued', 'sent', 'failed')
        and hubspot_sync_status in ('pending', 'queued', 'sent', 'failed')
      );
  end if;
end $$;

create table if not exists public.subscription_items (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text,
  plan_name text,
  description text,
  quantity integer not null default 1,
  unit_price_uf numeric(12,2) not null default 0,
  total_price_uf numeric(12,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Legacy compatibility: older projects may have subscription_items without these columns.
alter table public.subscription_items add column if not exists product_name text;
alter table public.subscription_items add column if not exists plan_name text;
alter table public.subscription_items add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.subscription_items add column if not exists description text;
alter table public.subscription_items add column if not exists unit_price_uf numeric(12,2);
alter table public.subscription_items add column if not exists total_price_uf numeric(12,2);
alter table public.subscription_items add column if not exists quantity integer;

update public.subscription_items
set description = coalesce(nullif(trim(description), ''), concat_ws(' · ', nullif(trim(product_name), ''), nullif(trim(plan_name), '')))
where description is null or length(trim(description)) = 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscription_items_quantity_positive_check'
  ) then
    alter table public.subscription_items
      add constraint subscription_items_quantity_positive_check
      check (quantity > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscription_items_unit_price_uf_positive_check'
  ) then
    alter table public.subscription_items
      add constraint subscription_items_unit_price_uf_positive_check
      check (unit_price_uf >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscription_items_total_price_uf_positive_check'
  ) then
    alter table public.subscription_items
      add constraint subscription_items_total_price_uf_positive_check
      check (total_price_uf >= 0);
  end if;
end $$;

create table if not exists public.subscription_logs (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  event_type text not null,
  field_changed text,
  old_value text,
  new_value text,
  changed_by text,
  delta_uf numeric(12,2),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscription_sync_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  provider text not null,
  event_type text not null,
  status text not null default 'pending',
  payload jsonb,
  response_payload jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscription_sync_events_provider_check'
  ) then
    alter table public.subscription_sync_events
      add constraint subscription_sync_events_provider_check
      check (provider in ('middleware', 'hubspot'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscription_sync_events_status_check'
  ) then
    alter table public.subscription_sync_events
      add constraint subscription_sync_events_status_check
      check (status in ('pending', 'queued', 'sent', 'failed'));
  end if;
end $$;

create sequence if not exists public.subscription_code_seq;

create or replace function public.handle_subscription_code()
returns trigger
language plpgsql
as $$
begin
  if new.subscription_code is null or length(trim(new.subscription_code)) = 0 then
    new.subscription_code = 'SUB' || lpad(nextval('public.subscription_code_seq')::text, 3, '0');
  end if;
  return new;
end;
$$;

create or replace function public.handle_subscription_defaults()
returns trigger
language plpgsql
as $$
declare
  base_date date;
  target_day integer;
  candidate_date date;
begin
  if new.customer_id is null and new.company_id is not null then
    new.customer_id = new.company_id;
  elsif new.company_id is null and new.customer_id is not null then
    new.company_id = new.customer_id;
  end if;

  if new.billing_type is null or length(trim(new.billing_type)) = 0 then
    new.billing_type = 'recurrente';
  end if;

  if new.recurrence is null or length(trim(new.recurrence)) = 0 then
    new.recurrence = 'mensual';
  end if;

  if new.next_billing_date is null then
    base_date = coalesce(new.start_date, current_date);
    target_day = case when new.billing_type = 'no_recurrente' then 20 else 5 end;
    candidate_date = date_trunc('month', base_date)::date + (target_day - 1);

    if candidate_date < base_date then
      candidate_date = (date_trunc('month', base_date) + interval '1 month')::date + (target_day - 1);
    end if;

    new.next_billing_date = candidate_date;
  end if;

  return new;
end;
$$;

do $$
declare
  max_code bigint;
begin
  select coalesce(max((substring(subscription_code from 4))::bigint), 0)
  into max_code
  from public.subscriptions
  where subscription_code ~ '^SUB[0-9]+$';

  -- If there are no codes yet, keep nextval() at 1 (avoid setval(0) which is out of bounds).
  perform setval(
    'public.subscription_code_seq',
    greatest(max_code, 1),
    max_code > 0
  );
end $$;

create or replace function public.rollup_subscription_total_mrr_uf()
returns trigger
language plpgsql
as $$
declare
  target_subscription_id uuid;
begin
  target_subscription_id = coalesce(new.subscription_id, old.subscription_id);

  update public.subscriptions
  set total_mrr_uf = coalesce((
    select sum(coalesce(total_price_uf, subtotal, 0))
    from public.subscription_items
    where subscription_id = target_subscription_id
  ), 0)
  where id = target_subscription_id;

  return coalesce(new, old);
end;
$$;

create or replace function public.log_subscription_mutations()
returns trigger
language plpgsql
as $$
declare
  actor_label text;
  delta numeric(12,2);
begin
  actor_label = coalesce(
    (
      select email
      from public.user_profiles
      where auth_user_id = auth.uid()
      limit 1
    ),
    'system'
  );

  if tg_op = 'INSERT' then
    insert into public.subscription_logs (
      subscription_id,
      event_type,
      field_changed,
      new_value,
      changed_by,
      delta_uf
    )
    values (
      new.id,
      'create',
      'status',
      new.status,
      actor_label,
      new.total_mrr_uf
    );

    return new;
  end if;

  if old.status is distinct from new.status then
    insert into public.subscription_logs (
      subscription_id,
      event_type,
      field_changed,
      old_value,
      new_value,
      changed_by,
      delta_uf
    )
    values (
      new.id,
      case
        when new.status = 'closed' and coalesce(new.close_reason, '') = 'churn' then 'churn'
        when new.status = 'active' and old.status <> 'active' then 'activate'
        else 'status_change'
      end,
      'status',
      old.status,
      new.status,
      actor_label,
      coalesce(new.total_mrr_uf, 0) - coalesce(old.total_mrr_uf, 0)
    );
  end if;

  if old.total_mrr_uf is distinct from new.total_mrr_uf then
    delta = coalesce(new.total_mrr_uf, 0) - coalesce(old.total_mrr_uf, 0);

    insert into public.subscription_logs (
      subscription_id,
      event_type,
      field_changed,
      old_value,
      new_value,
      changed_by,
      delta_uf
    )
    values (
      new.id,
      case
        when delta > 0 then 'upsell'
        when delta < 0 then 'downsell'
        else 'update'
      end,
      'total_mrr_uf',
      old.total_mrr_uf::text,
      new.total_mrr_uf::text,
      actor_label,
      delta
    );
  end if;

  if old.suspension_date is distinct from new.suspension_date then
    insert into public.subscription_logs (
      subscription_id,
      event_type,
      field_changed,
      old_value,
      new_value,
      changed_by
    )
    values (
      new.id,
      case when new.suspension_date is null then 'unsuspend' else 'suspend' end,
      'suspension_date',
      old.suspension_date::text,
      new.suspension_date::text,
      actor_label
    );
  end if;

  if old.next_billing_date is distinct from new.next_billing_date then
    insert into public.subscription_logs (
      subscription_id,
      event_type,
      field_changed,
      old_value,
      new_value,
      changed_by
    )
    values (
      new.id,
      'update',
      'next_billing_date',
      old.next_billing_date::text,
      new.next_billing_date::text,
      actor_label
    );
  end if;

  return new;
end;
$$;

create or replace function public.prevent_subscription_logs_mutation()
returns trigger
language plpgsql
as $$
begin
  -- Logs are immutable by default (no update/delete).
  -- Exception: allow delete only when explicitly hard-deleting a subscription via our RPC,
  -- which sets a session flag for the duration of the transaction.
  if tg_op = 'DELETE' and coalesce(current_setting('octopus.allow_log_delete', true), '') = 'on' then
    return old;
  end if;
  raise exception 'subscription_logs is immutable';
end;
$$;

create or replace function public.hard_delete_subscription(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Allow cascading deletes to remove logs only inside this controlled flow.
  perform set_config('octopus.allow_log_delete', 'on', true);

  delete from public.subscriptions where id = target_id;
end;
$$;

create or replace function public.queue_subscription_sync_events()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'active' then
      insert into public.subscription_sync_events (subscription_id, provider, event_type, status, payload)
      values (
        new.id,
        'middleware',
        'activate_services',
        'pending',
        jsonb_build_object('status', new.status, 'subscription_code', new.subscription_code)
      );
    elsif new.status = 'closed' then
      insert into public.subscription_sync_events (subscription_id, provider, event_type, status, payload)
      values (
        new.id,
        'middleware',
        'deactivate_services',
        'pending',
        jsonb_build_object('status', new.status, 'close_reason', new.close_reason, 'subscription_code', new.subscription_code)
      );
    end if;

    if new.suspension_date is not null then
      insert into public.subscription_sync_events (subscription_id, provider, event_type, status, payload)
      values (
        new.id,
        'middleware',
        'suspend_subscription',
        'pending',
        jsonb_build_object('suspension_date', new.suspension_date, 'subscription_code', new.subscription_code)
      );
    end if;

    if new.hubspot_deal_id is not null and length(trim(new.hubspot_deal_id)) > 0 then
      insert into public.subscription_sync_events (subscription_id, provider, event_type, status, payload)
      values (
        new.id,
        'hubspot',
        'sync_subscription',
        'pending',
        jsonb_build_object('hubspot_deal_id', new.hubspot_deal_id, 'subscription_code', new.subscription_code)
      );
    end if;

    return new;
  end if;

  if old.suspension_date is distinct from new.suspension_date then
    insert into public.subscription_sync_events (subscription_id, provider, event_type, status, payload)
    values (
      new.id,
      'middleware',
      case when new.suspension_date is null then 'unsuspend_subscription' else 'suspend_subscription' end,
      'pending',
      jsonb_build_object('old_value', old.suspension_date, 'new_value', new.suspension_date)
    );
  end if;

  if old.status is distinct from new.status then
    if new.status = 'closed' then
      insert into public.subscription_sync_events (subscription_id, provider, event_type, status, payload)
      values (
        new.id,
        'middleware',
        'deactivate_services',
        'pending',
        jsonb_build_object('old_status', old.status, 'new_status', new.status, 'close_reason', new.close_reason)
      );
    elsif new.status = 'active' and old.status <> 'active' then
      insert into public.subscription_sync_events (subscription_id, provider, event_type, status, payload)
      values (
        new.id,
        'middleware',
        'activate_services',
        'pending',
        jsonb_build_object('old_status', old.status, 'new_status', new.status)
      );
    end if;
  end if;

  if old.hubspot_deal_id is distinct from new.hubspot_deal_id and new.hubspot_deal_id is not null and length(trim(new.hubspot_deal_id)) > 0 then
    insert into public.subscription_sync_events (subscription_id, provider, event_type, status, payload)
    values (
      new.id,
      'hubspot',
      'sync_subscription',
      'pending',
      jsonb_build_object('old_value', old.hubspot_deal_id, 'new_value', new.hubspot_deal_id)
    );
  end if;

  return new;
end;
$$;

create table if not exists public.billing_records (
  id uuid primary key default gen_random_uuid(),
  origin text not null default 'tazki' check (origin in ('tazki', 'externo')),
  company_id uuid not null references public.companies(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  service_period text not null,
  expected_invoice_date date,
  actual_invoice_date date,
  amount numeric(12,2) not null,
  status text not null default 'draft' check (status in ('draft', 'issued', 'pending_payment', 'paid', 'cancelled')),
  blocked_by_oc boolean not null default false,
  blocked_by_hes boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.billing_records add column if not exists invoice_number text;
alter table public.billing_records add column if not exists due_date date;
alter table public.billing_records add column if not exists total_uf numeric(12,2);
alter table public.billing_records add column if not exists uf_value numeric(12,2);
alter table public.billing_records add column if not exists outstanding_amount numeric(14,2);
alter table public.billing_records add column if not exists notes text;
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
  unique (currency_code, period_year, period_month),
  constraint currency_rates_currency_code_check check (currency_code in ('UF', 'CLP')),
  constraint currency_rates_period_year_check check (period_year between 2000 and 2100),
  constraint currency_rates_period_month_check check (period_month between 1 and 12),
  constraint currency_rates_rate_value_positive_check check (rate_value > 0),
  constraint currency_rates_source_type_check check (source_type in ('manual', 'api'))
);

create index if not exists idx_currency_rates_period on public.currency_rates(currency_code, period_year desc, period_month desc);
create index if not exists idx_currency_rates_active on public.currency_rates(is_active);

alter table public.billing_records add column if not exists currency_rate_id uuid references public.currency_rates(id) on delete set null;
alter table public.billing_records add column if not exists uf_value_used numeric(18,6);
alter table public.billing_records add column if not exists net_clp numeric(18,2);
alter table public.billing_records add column if not exists tax_clp numeric(18,2);
alter table public.billing_records add column if not exists total_clp numeric(18,2);

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

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  opportunity_type text not null,
  estimated_value numeric(12,2) not null default 0,
  probability numeric(5,2) not null default 0,
  stage text not null default 'open',
  owner_email text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  user_name text not null,
  message text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_companies_status on public.companies(status);
create unique index if not exists idx_companies_internal_code_unique on public.companies(internal_code) where internal_code is not null;
create index if not exists idx_companies_payer_client_id on public.companies(payer_client_id);
create index if not exists idx_contacts_company_id on public.contacts(company_id);
create index if not exists idx_user_profiles_auth_user_id on public.user_profiles(auth_user_id);
create index if not exists idx_user_profiles_role on public.user_profiles(role);
create index if not exists idx_user_view_preferences_auth_user_id on public.user_view_preferences(auth_user_id);
create index if not exists idx_user_view_preferences_view_key on public.user_view_preferences(view_key);
create index if not exists idx_client_contacts_client_id on public.client_contacts(client_id);
create index if not exists idx_client_contacts_contact_type on public.client_contacts(contact_type);
create index if not exists idx_client_internal_contacts_client_id on public.client_internal_contacts(client_id);
create index if not exists idx_client_internal_contacts_role_type on public.client_internal_contacts(role_type);
create index if not exists idx_client_purchase_orders_client_id on public.client_purchase_orders(client_id);
create index if not exists idx_client_purchase_orders_status on public.client_purchase_orders(status);
create index if not exists idx_client_notes_client_id on public.client_notes(client_id);
create index if not exists idx_client_activity_logs_client_id on public.client_activity_logs(client_id);
create index if not exists idx_client_activity_logs_created_at on public.client_activity_logs(created_at);
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_is_active on public.products(is_active);
create index if not exists idx_pricing_variables_is_active on public.pricing_variables(is_active);
create index if not exists idx_pricing_rules_pricing_strategy_id on public.pricing_rules(pricing_strategy_id);
create index if not exists idx_pricing_rules_target_product_id on public.pricing_rules(target_product_id);
create index if not exists idx_pricing_rules_target_variable_id on public.pricing_rules(target_variable_id);
create index if not exists idx_sales_channels_is_active on public.sales_channels(is_active);
create index if not exists idx_subscriptions_company_id on public.subscriptions(company_id);
create unique index if not exists idx_subscriptions_subscription_code_unique on public.subscriptions(subscription_code) where subscription_code is not null;
create index if not exists idx_subscriptions_customer_id on public.subscriptions(customer_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
create index if not exists idx_subscriptions_close_reason on public.subscriptions(close_reason);
create index if not exists idx_subscriptions_previous_subscription_id on public.subscriptions(previous_subscription_id);
create index if not exists idx_subscriptions_pricing_strategy_id on public.subscriptions(pricing_strategy_id);
create index if not exists idx_subscriptions_sales_executive_id on public.subscriptions(sales_executive_id);
create index if not exists idx_subscriptions_next_billing_date on public.subscriptions(next_billing_date);
create index if not exists idx_pricing_strategies_is_active on public.pricing_strategies(is_active);
create index if not exists idx_subscription_items_subscription_id on public.subscription_items(subscription_id);
create index if not exists idx_subscription_items_product_id on public.subscription_items(product_id);
create index if not exists idx_subscription_logs_subscription_id on public.subscription_logs(subscription_id);
create index if not exists idx_subscription_logs_created_at on public.subscription_logs(created_at);
create index if not exists idx_subscription_sync_events_subscription_id on public.subscription_sync_events(subscription_id);
create index if not exists idx_subscription_sync_events_provider on public.subscription_sync_events(provider);
create index if not exists idx_subscription_sync_events_status on public.subscription_sync_events(status);
create index if not exists idx_billing_records_company_id on public.billing_records(company_id);
create index if not exists idx_billing_records_status on public.billing_records(status);
create index if not exists idx_billing_records_actual_invoice_date on public.billing_records(actual_invoice_date);
create index if not exists idx_billing_records_expected_invoice_date on public.billing_records(expected_invoice_date);
create index if not exists idx_billing_payments_billing_record_id on public.billing_payments(billing_record_id);
create index if not exists idx_billing_payments_payment_date on public.billing_payments(payment_date);
create index if not exists idx_opportunities_company_id on public.opportunities(company_id);
create index if not exists idx_opportunities_stage on public.opportunities(stage);
create index if not exists idx_support_messages_created_at on public.support_messages(created_at);

-- Search performance (Subscriptions / Companies / HubSpot)
create extension if not exists pg_trgm;

create index if not exists idx_subscriptions_subscription_code_trgm on public.subscriptions using gin (subscription_code gin_trgm_ops);
create index if not exists idx_subscriptions_hubspot_deal_id_trgm on public.subscriptions using gin (hubspot_deal_id gin_trgm_ops);
create index if not exists idx_subscriptions_channel_trgm on public.subscriptions using gin (channel gin_trgm_ops);

create index if not exists idx_companies_trade_name_trgm on public.companies using gin (trade_name gin_trgm_ops);
create index if not exists idx_companies_legal_name_trgm on public.companies using gin (legal_name gin_trgm_ops);
create index if not exists idx_companies_rut_trgm on public.companies using gin (rut gin_trgm_ops);
create index if not exists idx_companies_internal_code_trgm on public.companies using gin (internal_code gin_trgm_ops);
create index if not exists idx_companies_company_email_trgm on public.companies using gin (company_email gin_trgm_ops);
create index if not exists idx_companies_phone_trgm on public.companies using gin (phone gin_trgm_ops);
create index if not exists idx_companies_mobile_phone_trgm on public.companies using gin (mobile_phone gin_trgm_ops);

create index if not exists idx_contacts_first_name_trgm on public.contacts using gin (first_name gin_trgm_ops);
create index if not exists idx_contacts_last_name_trgm on public.contacts using gin (last_name gin_trgm_ops);
create index if not exists idx_contacts_email_trgm on public.contacts using gin (email gin_trgm_ops);
create index if not exists idx_contacts_phone_trgm on public.contacts using gin (phone gin_trgm_ops);

create index if not exists idx_pricing_strategies_name_trgm on public.pricing_strategies using gin (name gin_trgm_ops);
create index if not exists idx_pricing_strategies_code_trgm on public.pricing_strategies using gin (code gin_trgm_ops);

create index if not exists idx_user_profiles_full_name_trgm on public.user_profiles using gin (full_name gin_trgm_ops);
create index if not exists idx_user_profiles_email_trgm on public.user_profiles using gin (email gin_trgm_ops);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.handle_updated_at();

drop trigger if exists set_user_view_preferences_updated_at on public.user_view_preferences;
create trigger set_user_view_preferences_updated_at
before update on public.user_view_preferences
for each row execute function public.handle_updated_at();

drop trigger if exists set_companies_updated_at on public.companies;
create trigger set_companies_updated_at
before update on public.companies
for each row execute function public.handle_updated_at();

drop trigger if exists set_companies_internal_code on public.companies;
create trigger set_companies_internal_code
before insert on public.companies
for each row execute function public.handle_company_internal_code();

drop trigger if exists set_contacts_updated_at on public.contacts;
create trigger set_contacts_updated_at
before update on public.contacts
for each row execute function public.handle_updated_at();

drop trigger if exists set_client_contacts_updated_at on public.client_contacts;
create trigger set_client_contacts_updated_at
before update on public.client_contacts
for each row execute function public.handle_updated_at();

drop trigger if exists set_client_contacts_internal_code on public.client_contacts;
create trigger set_client_contacts_internal_code
before insert on public.client_contacts
for each row execute function public.handle_client_contact_internal_code();

drop trigger if exists set_client_internal_contacts_updated_at on public.client_internal_contacts;
create trigger set_client_internal_contacts_updated_at
before update on public.client_internal_contacts
for each row execute function public.handle_updated_at();

drop trigger if exists set_client_purchase_orders_updated_at on public.client_purchase_orders;
create trigger set_client_purchase_orders_updated_at
before update on public.client_purchase_orders
for each row execute function public.handle_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.handle_updated_at();

drop trigger if exists set_pricing_strategies_updated_at on public.pricing_strategies;
create trigger set_pricing_strategies_updated_at
before update on public.pricing_strategies
for each row execute function public.handle_updated_at();

drop trigger if exists set_pricing_variables_updated_at on public.pricing_variables;
create trigger set_pricing_variables_updated_at
before update on public.pricing_variables
for each row execute function public.handle_updated_at();

drop trigger if exists set_pricing_rules_updated_at on public.pricing_rules;
create trigger set_pricing_rules_updated_at
before update on public.pricing_rules
for each row execute function public.handle_updated_at();

drop trigger if exists set_sales_channels_updated_at on public.sales_channels;
create trigger set_sales_channels_updated_at
before update on public.sales_channels
for each row execute function public.handle_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.handle_updated_at();

drop trigger if exists set_subscriptions_defaults on public.subscriptions;
create trigger set_subscriptions_defaults
before insert or update on public.subscriptions
for each row execute function public.handle_subscription_defaults();

drop trigger if exists set_subscriptions_subscription_code on public.subscriptions;
create trigger set_subscriptions_subscription_code
before insert on public.subscriptions
for each row execute function public.handle_subscription_code();

drop trigger if exists log_subscriptions_mutation on public.subscriptions;
create trigger log_subscriptions_mutation
after insert or update on public.subscriptions
for each row execute function public.log_subscription_mutations();

drop trigger if exists queue_subscription_sync_events on public.subscriptions;
create trigger queue_subscription_sync_events
after insert or update on public.subscriptions
for each row execute function public.queue_subscription_sync_events();

drop trigger if exists set_subscription_items_updated_at on public.subscription_items;
create trigger set_subscription_items_updated_at
before update on public.subscription_items
for each row execute function public.handle_updated_at();

drop trigger if exists sync_subscription_items_mrr_after_insert on public.subscription_items;
create trigger sync_subscription_items_mrr_after_insert
after insert on public.subscription_items
for each row execute function public.rollup_subscription_total_mrr_uf();

drop trigger if exists sync_subscription_items_mrr_after_update on public.subscription_items;
create trigger sync_subscription_items_mrr_after_update
after update on public.subscription_items
for each row execute function public.rollup_subscription_total_mrr_uf();

drop trigger if exists sync_subscription_items_mrr_after_delete on public.subscription_items;
create trigger sync_subscription_items_mrr_after_delete
after delete on public.subscription_items
for each row execute function public.rollup_subscription_total_mrr_uf();

drop trigger if exists prevent_subscription_logs_update on public.subscription_logs;
create trigger prevent_subscription_logs_update
before update on public.subscription_logs
for each row execute function public.prevent_subscription_logs_mutation();

drop trigger if exists prevent_subscription_logs_delete on public.subscription_logs;
create trigger prevent_subscription_logs_delete
before delete on public.subscription_logs
for each row execute function public.prevent_subscription_logs_mutation();

drop trigger if exists set_billing_records_updated_at on public.billing_records;
create trigger set_billing_records_updated_at
before update on public.billing_records
for each row execute function public.handle_updated_at();

drop trigger if exists set_currency_rates_updated_at on public.currency_rates;
create trigger set_currency_rates_updated_at
before update on public.currency_rates
for each row execute function public.handle_updated_at();

drop trigger if exists set_billing_payments_updated_at on public.billing_payments;
create trigger set_billing_payments_updated_at
before update on public.billing_payments
for each row execute function public.handle_updated_at();

drop trigger if exists set_opportunities_updated_at on public.opportunities;
create trigger set_opportunities_updated_at
before update on public.opportunities
for each row execute function public.handle_updated_at();

alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.client_contacts enable row level security;
alter table public.client_internal_contacts enable row level security;
alter table public.client_purchase_orders enable row level security;
alter table public.client_notes enable row level security;
alter table public.client_activity_logs enable row level security;
alter table public.products enable row level security;
alter table public.pricing_strategies enable row level security;
alter table public.pricing_variables enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.sales_channels enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_records enable row level security;
alter table public.billing_payments enable row level security;
alter table public.opportunities enable row level security;
alter table public.user_profiles enable row level security;
alter table public.support_messages enable row level security;
alter table public.subscription_items enable row level security;
alter table public.subscription_logs enable row level security;
alter table public.subscription_sync_events enable row level security;

drop policy if exists "Authenticated users can read own profile" on public.user_profiles;
create policy "Authenticated users can read own profile"
on public.user_profiles for select
to authenticated
using (auth.uid() = auth_user_id);

drop policy if exists "Authenticated users can update own profile" on public.user_profiles;
create policy "Authenticated users can update own profile"
on public.user_profiles for update
to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

drop policy if exists "Authenticated tazki users can read companies" on public.companies;
create policy "Authenticated tazki users can read companies"
on public.companies for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write companies" on public.companies;
create policy "Authenticated tazki users can write companies"
on public.companies for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read contacts" on public.contacts;
create policy "Authenticated tazki users can read contacts"
on public.contacts for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write contacts" on public.contacts;
create policy "Authenticated tazki users can write contacts"
on public.contacts for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read client contacts" on public.client_contacts;
create policy "Authenticated tazki users can read client contacts"
on public.client_contacts for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write client contacts" on public.client_contacts;
create policy "Authenticated tazki users can write client contacts"
on public.client_contacts for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read client internal contacts" on public.client_internal_contacts;
create policy "Authenticated tazki users can read client internal contacts"
on public.client_internal_contacts for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write client internal contacts" on public.client_internal_contacts;
create policy "Authenticated tazki users can write client internal contacts"
on public.client_internal_contacts for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read client purchase orders" on public.client_purchase_orders;
create policy "Authenticated tazki users can read client purchase orders"
on public.client_purchase_orders for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write client purchase orders" on public.client_purchase_orders;
create policy "Authenticated tazki users can write client purchase orders"
on public.client_purchase_orders for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read client notes" on public.client_notes;
create policy "Authenticated tazki users can read client notes"
on public.client_notes for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write client notes" on public.client_notes;
create policy "Authenticated tazki users can write client notes"
on public.client_notes for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read client activity logs" on public.client_activity_logs;
create policy "Authenticated tazki users can read client activity logs"
on public.client_activity_logs for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write client activity logs" on public.client_activity_logs;
create policy "Authenticated tazki users can write client activity logs"
on public.client_activity_logs for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read products" on public.products;
create policy "Authenticated tazki users can read products"
on public.products for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write products" on public.products;
create policy "Authenticated tazki users can write products"
on public.products for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read pricing strategies" on public.pricing_strategies;
create policy "Authenticated tazki users can read pricing strategies"
on public.pricing_strategies for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write pricing strategies" on public.pricing_strategies;
create policy "Authenticated tazki users can write pricing strategies"
on public.pricing_strategies for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read pricing variables" on public.pricing_variables;
create policy "Authenticated tazki users can read pricing variables"
on public.pricing_variables for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write pricing variables" on public.pricing_variables;
create policy "Authenticated tazki users can write pricing variables"
on public.pricing_variables for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read pricing rules" on public.pricing_rules;
create policy "Authenticated tazki users can read pricing rules"
on public.pricing_rules for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write pricing rules" on public.pricing_rules;
create policy "Authenticated tazki users can write pricing rules"
on public.pricing_rules for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read sales channels" on public.sales_channels;
create policy "Authenticated tazki users can read sales channels"
on public.sales_channels for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write sales channels" on public.sales_channels;
create policy "Authenticated tazki users can write sales channels"
on public.sales_channels for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read subscriptions" on public.subscriptions;
create policy "Authenticated tazki users can read subscriptions"
on public.subscriptions for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write subscriptions" on public.subscriptions;
create policy "Authenticated tazki users can write subscriptions"
on public.subscriptions for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read subscription items" on public.subscription_items;
create policy "Authenticated tazki users can read subscription items"
on public.subscription_items for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write subscription items" on public.subscription_items;
create policy "Authenticated tazki users can write subscription items"
on public.subscription_items for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read subscription logs" on public.subscription_logs;
create policy "Authenticated tazki users can read subscription logs"
on public.subscription_logs for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can insert subscription logs" on public.subscription_logs;
create policy "Authenticated tazki users can insert subscription logs"
on public.subscription_logs for insert
to authenticated
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read subscription sync events" on public.subscription_sync_events;
create policy "Authenticated tazki users can read subscription sync events"
on public.subscription_sync_events for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write subscription sync events" on public.subscription_sync_events;
create policy "Authenticated tazki users can write subscription sync events"
on public.subscription_sync_events for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read billing records" on public.billing_records;
create policy "Authenticated tazki users can read billing records"
on public.billing_records for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write billing records" on public.billing_records;
create policy "Authenticated tazki users can write billing records"
on public.billing_records for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read billing payments" on public.billing_payments;
create policy "Authenticated tazki users can read billing payments"
on public.billing_payments for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write billing payments" on public.billing_payments;
create policy "Authenticated tazki users can write billing payments"
on public.billing_payments for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can read opportunities" on public.opportunities;
create policy "Authenticated tazki users can read opportunities"
on public.opportunities for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can write opportunities" on public.opportunities;
create policy "Authenticated tazki users can write opportunities"
on public.opportunities for all
to authenticated
using ((auth.jwt() ->> 'email') like '%@tazki.cl')
with check ((auth.jwt() ->> 'email') like '%@tazki.cl');

drop policy if exists "Authenticated tazki users can insert support messages" on public.support_messages;
create policy "Authenticated tazki users can insert support messages"
on public.support_messages for insert
to authenticated
with check (
  (auth.jwt() ->> 'email') like '%@tazki.cl'
  and lower(user_email) = lower(auth.jwt() ->> 'email')
);

drop policy if exists "Authenticated tazki users can read own support messages" on public.support_messages;
create policy "Authenticated tazki users can read own support messages"
on public.support_messages for select
to authenticated
using (lower(user_email) = lower(auth.jwt() ->> 'email'));

insert into storage.buckets (id, name, public)
values ('client-purchase-orders', 'client-purchase-orders', false)
on conflict (id) do nothing;

drop policy if exists "Authenticated tazki users can upload purchase order pdfs" on storage.objects;
create policy "Authenticated tazki users can upload purchase order pdfs"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'client-purchase-orders'
  and (auth.jwt() ->> 'email') like '%@tazki.cl'
);

drop policy if exists "Authenticated tazki users can read purchase order pdfs" on storage.objects;
create policy "Authenticated tazki users can read purchase order pdfs"
on storage.objects for select
to authenticated
using (
  bucket_id = 'client-purchase-orders'
  and (auth.jwt() ->> 'email') like '%@tazki.cl'
);

drop policy if exists "Authenticated tazki users can update purchase order pdfs" on storage.objects;
create policy "Authenticated tazki users can update purchase order pdfs"
on storage.objects for update
to authenticated
using (
  bucket_id = 'client-purchase-orders'
  and (auth.jwt() ->> 'email') like '%@tazki.cl'
)
with check (
  bucket_id = 'client-purchase-orders'
  and (auth.jwt() ->> 'email') like '%@tazki.cl'
);
