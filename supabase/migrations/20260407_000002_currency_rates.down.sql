begin;

drop trigger if exists set_currency_rates_updated_at on public.currency_rates;

alter table public.billing_records
  drop column if exists total_clp,
  drop column if exists tax_clp,
  drop column if exists net_clp,
  drop column if exists uf_value_used,
  drop column if exists currency_rate_id;

drop table if exists public.currency_rates;

commit;
