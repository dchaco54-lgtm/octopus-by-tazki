begin;

drop policy if exists "Authenticated tazki users can write billing sync jobs" on public.billing_sync_jobs;
drop policy if exists "Authenticated tazki users can read billing sync jobs" on public.billing_sync_jobs;
drop policy if exists "Authenticated tazki users can write billing logs" on public.billing_logs;
drop policy if exists "Authenticated tazki users can read billing logs" on public.billing_logs;
drop policy if exists "Authenticated tazki users can write billing outputs" on public.billing_outputs;
drop policy if exists "Authenticated tazki users can read billing outputs" on public.billing_outputs;

drop trigger if exists refresh_billing_record_payment_snapshot_on_write on public.billing_payments;
drop trigger if exists set_billing_records_v2_defaults on public.billing_records;

drop function if exists public.handle_billing_payment_snapshot();
drop function if exists public.refresh_billing_record_payment_snapshot(uuid);
drop function if exists public.set_billing_record_defaults();

drop table if exists public.billing_sync_jobs;
drop table if exists public.billing_logs;
drop table if exists public.billing_outputs;

drop index if exists idx_billing_record_lines_sort_order;
drop index if exists idx_billing_records_company_issue_date_desc;
drop index if exists idx_billing_records_status_payment_status;
drop index if exists idx_billing_records_origin_created_at_desc;
drop index if exists idx_billing_records_document_type_number;
drop index if exists idx_billing_records_source_system;
drop index if exists idx_billing_records_payment_status;
drop index if exists idx_billing_records_dte_status;
drop index if exists idx_billing_records_issue_date;
drop index if exists idx_billing_records_document_number;
drop index if exists idx_billing_records_folio;
drop index if exists idx_billing_records_created_at;

alter table public.billing_payments drop constraint if exists billing_payments_currency_check;
alter table public.billing_payments drop constraint if exists billing_payments_origin_check;

alter table public.billing_payments
  drop column if exists currency,
  drop column if exists amount,
  drop column if exists amount_uf,
  drop column if exists bank_reference,
  drop column if exists origin,
  drop column if exists source_system,
  drop column if exists created_by;

alter table public.billing_record_lines
  drop column if exists description,
  drop column if exists accounting_account_id,
  drop column if exists tax_code,
  drop column if exists subtotal_amount,
  drop column if exists subtotal_uf;

alter table public.billing_records drop constraint if exists billing_records_origin_check;
alter table public.billing_records drop constraint if exists billing_records_status_check;
alter table public.billing_records drop constraint if exists billing_records_payment_status_check;
alter table public.billing_records drop constraint if exists billing_records_dte_status_check;
alter table public.billing_records drop constraint if exists billing_records_document_type_check;
alter table public.billing_records drop constraint if exists billing_records_currency_check;
alter table public.billing_records drop constraint if exists billing_records_service_period_check;
alter table public.billing_records drop constraint if exists billing_records_amounts_check;

alter table public.billing_records
  drop column if exists hubspot_deal_id,
  drop column if exists hubspot_object_id,
  drop column if exists source_system,
  drop column if exists document_number,
  drop column if exists folio,
  drop column if exists payment_status,
  drop column if exists exchange_rate,
  drop column if exists issue_date,
  drop column if exists service_period_start,
  drop column if exists service_period_end,
  drop column if exists payment_terms_days,
  drop column if exists reference_glosa,
  drop column if exists purchase_order_ref,
  drop column if exists hes_ref,
  drop column if exists migo_ref,
  drop column if exists edp_ref,
  drop column if exists subtotal_amount,
  drop column if exists tax_amount,
  drop column if exists total_amount,
  drop column if exists amount_paid,
  drop column if exists amount_due,
  drop column if exists subtotal_uf,
  drop column if exists tax_uf,
  drop column if exists uf_value,
  drop column if exists amount_paid_uf,
  drop column if exists amount_due_uf,
  drop column if exists pdf_url,
  drop column if exists xml_url,
  drop column if exists is_manual,
  drop column if exists is_legacy,
  drop column if exists is_deleted,
  drop column if exists created_by,
  drop column if exists updated_by;

commit;
