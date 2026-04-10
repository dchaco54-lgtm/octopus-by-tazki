insert into public.companies (
  id, legal_name, trade_name, rut, billing_email, admin_email, phone, address, commune, city, country,
  legal_representative_name, legal_representative_rut, status, notes
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Tazki Servicios SpA',
    'Tazki',
    '76.111.111-1',
    'billing@tazki.cl',
    'ops@tazki.cl',
    '+56 9 1111 1111',
    'Apoquindo 3000',
    'Las Condes',
    'Santiago',
    'Chile',
    'Camila Rojas',
    '15.123.456-7',
    'active',
    'Cliente ancla para operaciones internas.'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Logistica Austral Ltda',
    'Austral',
    '76.222.222-2',
    'facturas@austral.cl',
    'admin@austral.cl',
    '+56 9 2222 2222',
    'Blanco 1450',
    'Puerto Montt',
    'Puerto Montt',
    'Chile',
    'Luis Moreno',
    '12.345.678-5',
    'active',
    'Cliente con renovacion en Q2.'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Retail Pacifico S.A.',
    'Pacifico Retail',
    '76.333.333-3',
    'billing@pacifico.cl',
    'it@pacifico.cl',
    '+56 9 3333 3333',
    'Av. del Mar 890',
    'Viña del Mar',
    'Viña del Mar',
    'Chile',
    'Sofia Martinez',
    '16.987.654-3',
    'suspended',
    'Suspendido por documentos pendientes.'
  )
on conflict (id) do nothing;

insert into public.products (
  id, code, name, description, product_type, billing_type, base_price, currency, is_active, allow_upsell, allow_cross_sell
)
values
  (
    '44444444-4444-4444-4444-444444444444',
    'OCT-CORE',
    'Octopus Core',
    'Suite principal de operaciones y revenue.',
    'subscription',
    'recurrente',
    20.00,
    'UF',
    true,
    true,
    true
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'OCT-BILL',
    'Octopus Billing Ops',
    'Modulo avanzado de billing y control documental.',
    'addon',
    'recurrente',
    6.00,
    'UF',
    true,
    true,
    true
  )
on conflict (id) do nothing;

insert into public.sales_channels (
  id, channel_code, name, description, is_active
)
values
  (
    '14141414-1414-1414-1414-141414141414',
    'INBOUND',
    'Inbound',
    'Origen inbound (web / referidos / contenido).',
    true
  ),
  (
    '15151515-1515-1515-1515-151515151515',
    'OUTBOUND',
    'Outbound',
    'Prospeccion y pipeline outbound.',
    true
  ),
  (
    '16161616-1616-1616-1616-161616161616',
    'PARTNER',
    'Partner',
    'Canal de partners y alianzas.',
    true
)
on conflict (id) do nothing;

insert into public.currency_rates (
  id,
  currency_code,
  period_year,
  period_month,
  reference_date,
  rate_value,
  source_type,
  source_note,
  is_active
)
values
  (
    '21212121-2121-2121-2121-212121212121',
    'UF',
    2026,
    3,
    '2026-03-01',
    39412.180000,
    'manual',
    'Carga operativa inicial para Billing demo.',
    true
  ),
  (
    '22212121-2121-2121-2121-212121212121',
    'UF',
    2026,
    4,
    '2026-04-01',
    39841.720000,
    'manual',
    'Valor de referencia manual para abril 2026.',
    true
  )
on conflict (currency_code, period_year, period_month) do update
set
  reference_date = excluded.reference_date,
  rate_value = excluded.rate_value,
  source_type = excluded.source_type,
  source_note = excluded.source_note,
  is_active = excluded.is_active;

insert into public.pricing_variables (
  id, variable_code, name, description, variable_type, unit, is_active
)
values
  (
    '17171717-1717-1717-1717-171717171717',
    'COST_CENTERS',
    'Centros de costo',
    'Cantidad de centros de costo adicionales.',
    'number',
    'unidad',
    true
  ),
  (
    '18181818-1818-1818-1818-181818181818',
    'ADMIN_USERS',
    'Administradores',
    'Cantidad de administradores para pricing por asiento.',
    'number',
    'usuario',
    true
  )
on conflict (id) do nothing;

insert into public.pricing_strategies (
  id, code, name, description, is_active
)
values
  (
    '12121212-1212-1212-1212-121212121212',
    'STD-UF',
    'Standard UF',
    'Plan recurrente base en UF con facturacion mensual.',
    true
  ),
  (
    '13131313-1313-1313-1313-131313131313',
    'ENT-UF',
    'Enterprise UF',
    'Estrategia enterprise con addons y expansion mensual.',
    true
  )
on conflict (id) do nothing;

insert into public.pricing_rules (
  id,
  pricing_strategy_id,
  target_type,
  target_product_id,
  pricing_mode,
  value_uf,
  is_active
)
values
  (
    '19191919-1919-1919-1919-191919191919',
    '12121212-1212-1212-1212-121212121212',
    'plan',
    '44444444-4444-4444-4444-444444444444',
    'fixed',
    20.00,
    true
  ),
  (
    '20202020-2020-2020-2020-202020202020',
    '12121212-1212-1212-1212-121212121212',
    'addon',
    '55555555-5555-5555-5555-555555555555',
    'fixed',
    6.00,
    true
  )
on conflict (id) do nothing;

insert into public.subscriptions (
  id, subscription_code, company_id, customer_id, product_id, start_date, end_date, billing_period, amount, currency, included_users, active_users,
  requires_oc, requires_hes, payment_terms_days, billing_day, next_billing_date, last_billing_date, status, suspension_reason, churn_risk,
  contracted_at, sales_owner_name, previous_subscription_id, change_type, cancellation_reason, suspended_at, internal_comments, documentation_blocked, health_score,
  hubspot_deal_id, close_reason, pricing_strategy_id, billing_type, recurrence, channel, suspension_date, payer_name, payer_rut, total_mrr_uf,
  middleware_sync_status, middleware_last_event, hubspot_sync_status
)
values
  (
    '66666666-6666-6666-6666-666666666666',
    'SUB001',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444',
    '2026-01-01',
    null,
    'monthly',
    26.00,
    'UF',
    120,
    98,
    false,
    false,
    30,
    5,
    '2026-04-05',
    '2026-03-05',
    'active',
    null,
    'low',
    '2025-12-20',
    'Camila Rojas',
    null,
    'new',
    null,
    null,
    'Cuenta estrategica con uso estable.',
    false,
    84,
    'HS-1001',
    null,
    '12121212-1212-1212-1212-121212121212',
    'recurrente',
    'mensual',
    'Inbound',
    null,
    'Tazki',
    '76.111.111-1',
    26.00,
    'sent',
    'activate_services',
    'sent'
  ),
  (
    '77777777-7777-7777-7777-777777777776',
    'SUB002',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    '2025-08-01',
    '2026-01-31',
    'monthly',
    24.00,
    'UF',
    110,
    94,
    true,
    false,
    45,
    5,
    '2026-01-05',
    '2025-12-05',
    'closed',
    null,
    'medium',
    '2025-07-20',
    'Luis Moreno',
    null,
    'upsell',
    'Migrada a una suscripcion con mayor MRR',
    null,
    'Suscripcion historica cerrada por expansion comercial.',
    false,
    67,
    'HS-2000',
    'upsell',
    '12121212-1212-1212-1212-121212121212',
    'recurrente',
    'mensual',
    'Outbound',
    null,
    'Austral',
    '76.222.222-2',
    24.00,
    'sent',
    'deactivate_services',
    'sent'
  ),
  (
    '77777777-7777-7777-7777-777777777777',
    'SUB003',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    '2026-02-01',
    null,
    'monthly',
    31.00,
    'UF',
    150,
    130,
    true,
    false,
    45,
    5,
    '2026-04-05',
    '2026-03-05',
    'active',
    null,
    'medium',
    '2026-01-15',
    'Luis Moreno',
    '77777777-7777-7777-7777-777777777776',
    'upsell',
    null,
    null,
    'Proceso de expansion comercial en curso.',
    true,
    71,
    'HS-2001',
    null,
    '13131313-1313-1313-1313-131313131313',
    'recurrente',
    'mensual',
    'Outbound',
    null,
    'Austral',
    '76.222.222-2',
    31.00,
    'pending',
    'activate_services',
    'pending'
  ),
  (
    '88888888-8888-8888-8888-888888888888',
    'SUB004',
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    '55555555-5555-5555-5555-555555555555',
    '2025-06-01',
    '2026-03-31',
    'monthly',
    8.00,
    'UF',
    40,
    24,
    true,
    true,
    30,
    20,
    '2026-04-20',
    '2026-03-20',
    'closed',
    'Pendiente OC y HES',
    'high',
    '2025-05-15',
    'Sofia Martinez',
    null,
    'downsell',
    'Pendiente documentacion para continuidad',
    '2026-03-20',
    'Cliente en pausa operativa por aprobaciones internas.',
    true,
    42,
    'HS-3001',
    'churn',
    '12121212-1212-1212-1212-121212121212',
    'no_recurrente',
    'custom',
    'Partner',
    '2026-03-20',
    'Pacifico Retail',
    '76.333.333-3',
    8.00,
    'failed',
    'deactivate_services',
    'sent'
  )
on conflict (id) do nothing;

insert into public.subscription_items (
  id, subscription_id, product_id, product_name, plan_name, description, quantity, unit_price, subtotal, unit_price_uf, total_price_uf, users_included, users_active
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '66666666-6666-6666-6666-666666666666',
    '44444444-4444-4444-4444-444444444444',
    'Octopus Core',
    'Core Enterprise',
    'Core operativo base',
    1,
    20.00,
    20.00,
    20.00,
    20.00,
    120,
    98
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '66666666-6666-6666-6666-666666666666',
    '55555555-5555-5555-5555-555555555555',
    'Octopus Billing Ops',
    'Billing Add-on',
    'Billing ops y control documental',
    1,
    6.00,
    6.00,
    6.00,
    6.00,
    120,
    98
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    '77777777-7777-7777-7777-777777777776',
    '44444444-4444-4444-4444-444444444444',
    'Octopus Core',
    'Core Growth',
    'Contrato historico antes del upsell',
    1,
    24.00,
    24.00,
    24.00,
    24.00,
    110,
    94
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    '77777777-7777-7777-7777-777777777777',
    '44444444-4444-4444-4444-444444444444',
    'Octopus Core',
    'Core Scale',
    'Suite core expandida',
    1,
    24.00,
    24.00,
    24.00,
    24.00,
    150,
    130
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5',
    '77777777-7777-7777-7777-777777777777',
    '55555555-5555-5555-5555-555555555555',
    'Octopus Billing Ops',
    'Billing Expansion',
    'Addon operativo de expansion',
    1,
    7.00,
    7.00,
    7.00,
    7.00,
    150,
    130
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6',
    '88888888-8888-8888-8888-888888888888',
    '55555555-5555-5555-5555-555555555555',
    'Octopus Billing Ops',
    'Billing Add-on',
    'Operacion documental previa al churn',
    1,
    8.00,
    8.00,
    8.00,
    8.00,
    40,
    24
  )
on conflict (id) do nothing;

insert into public.contacts (
  id, company_id, first_name, last_name, email, phone, role, area, is_primary, is_active
)
values
  (
    '99999999-9999-9999-9999-999999999991',
    '11111111-1111-1111-1111-111111111111',
    'Daniela',
    'Perez',
    'daniela.perez@tazki.cl',
    '+56 9 4444 4444',
    'Head of Ops',
    'Operations',
    true,
    true
  ),
  (
    '99999999-9999-9999-9999-999999999992',
    '11111111-1111-1111-1111-111111111111',
    'Matias',
    'Fuentes',
    'matias.fuentes@tazki.cl',
    '+56 9 4444 5555',
    'Finance Analyst',
    'Finance',
    false,
    true
  ),
  (
    '99999999-9999-9999-9999-999999999993',
    '22222222-2222-2222-2222-222222222222',
    'Claudia',
    'Silva',
    'claudia@austral.cl',
    '+56 9 5555 1111',
    'Gerente Finanzas',
    'Finance',
    true,
    true
  ),
  (
    '99999999-9999-9999-9999-999999999994',
    '22222222-2222-2222-2222-222222222222',
    'Hector',
    'Leiva',
    'hector@austral.cl',
    '+56 9 5555 2222',
    'Jefe TI',
    'IT',
    false,
    true
  ),
  (
    '99999999-9999-9999-9999-999999999995',
    '33333333-3333-3333-3333-333333333333',
    'Valentina',
    'Araya',
    'valentina@pacifico.cl',
    '+56 9 6666 6666',
    'Billing Lead',
    'Finance',
    true,
    true
  )
on conflict (id) do nothing;

insert into public.billing_records (
  company_id, subscription_id, service_period, expected_invoice_date, actual_invoice_date, amount, status, blocked_by_oc, blocked_by_hes
)
values
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', '2026-03', '2026-03-05', '2026-03-05', 26.00, 'issued', false, false),
  ('22222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777', '2026-03', '2026-03-05', null, 31.00, 'draft', true, false),
  ('33333333-3333-3333-3333-333333333333', '88888888-8888-8888-8888-888888888888', '2026-03', '2026-03-20', null, 8.00, 'blocked', true, true);

insert into public.opportunities (
  company_id, subscription_id, opportunity_type, estimated_value, probability, stage, owner_email
)
values
  ('22222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777', 'upsell', 7.00, 60, 'proposal', 'revops@tazki.cl'),
  ('33333333-3333-3333-3333-333333333333', '88888888-8888-8888-8888-888888888888', 'reactivation', 8.00, 35, 'open', 'customer@tazki.cl');
