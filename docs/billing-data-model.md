# Billing V2 Data Model

Este documento define el modelo objetivo de base de datos para Billing en Octopus.

No reemplaza automaticamente el esquema actual del repo.
La fuente de verdad para el rollout de este modelo es:

- `supabase/migrations/20260407_000001_billing_v2_model.up.sql`
- `supabase/migrations/20260407_000001_billing_v2_model.down.sql`
- `supabase/seeds/billing-v2-demo.sql`

## Objetivo

Billing V2 separa claramente:

- ciclo de vida del documento: `status`
- ciclo de cobranza: `payment_status`
- origen del documento: `origin`
- sistema de procedencia exacto: `source_system`

Con esto el mismo modelo soporta:

- facturas creadas en Octopus
- carga manual
- importacion Excel
- sync desde HubSpot
- creacion por API
- migraciones historicas

## Tablas cubiertas

### `billing_records`

Documento principal.

Incluye:

- origen funcional: `origin`
- procedencia tecnica: `source_system`
- estado documental: `status`
- estado de pago: `payment_status`
- estado DTE: `dte_status`
- montos CLP y UF
- saldo, pagos, links, PDF/XML
- banderas de legacy, borrado logico y manualidad

### `billing_record_lines`

Lineas de detalle del documento.

Se amplian los campos existentes con:

- `description`
- `accounting_account_id`
- `tax_code`
- `subtotal_amount`
- `subtotal_uf`

### `billing_payments`

Pagos aplicados a la factura.

Incluye:

- `origin`
- `source_system`
- `amount`
- `amount_uf`
- `bank_reference`
- `created_by`

### `billing_outputs`

Nueva tabla canonica para outputs y archivos.

Casos soportados:

- PDF
- XML
- payment link
- outputs externos

### `billing_logs`

Nueva tabla canonica de trazabilidad.

Permite guardar:

- evento
- mensaje
- snapshot anterior
- snapshot nuevo
- actor

### `billing_sync_jobs`

Bitacora tecnica de integraciones.

Pensada para:

- HubSpot
- API
- Libredte
- Wasabi
- migraciones historicas

## Enums operativos

### `billing_records.origin`

- `tazki`
- `manual`
- `hubspot`
- `api`
- `import_excel`
- `external`

### `billing_records.status`

- `draft`
- `issued`
- `cancelled`
- `voided`

### `billing_records.payment_status`

- `unpaid`
- `partial`
- `paid`
- `overdue`

### `billing_records.dte_status`

- `not_sent`
- `pending`
- `accepted`
- `rejected`
- `external`

## Reglas automáticas incluidas en la migración

La migracion agrega triggers para:

- normalizar defaults de `billing_records`
- calcular `amount_due`
- calcular `payment_status`
- recalcular saldo y pagos cuando cambia `billing_payments`

Regla clave:

- si `amount_due <= 500` => `paid`
- si hay abono y queda saldo => `partial`
- si no hay abono y vencio => `overdue`
- en el resto => `unpaid`

## Rollout sugerido

### Localhost / staging

1. Aplicar `supabase/schema.sql` como base actual del proyecto.
2. Aplicar `supabase/billing-bootstrap.sql` solo si el staging local ya tenia Billing viejo.
3. Aplicar `supabase/billing-manual-invoicing.sql` si necesitas compatibilidad con el modulo actual.
4. Aplicar `supabase/migrations/20260407_000001_billing_v2_model.up.sql` en un branch o proyecto de staging.
5. Opcional: aplicar `supabase/seeds/billing-v2-demo.sql`.
6. Validar UI, importacion, HubSpot y pagos sobre el esquema nuevo.

### Produccion

1. Crear backup o snapshot de la base.
2. Aplicar la migracion `up.sql`.
3. Ejecutar smoke tests de:
   - creacion Tazki
   - carga manual
   - importacion Excel
   - pago parcial
   - lectura de outputs
4. Si algo falla, usar `down.sql` solo en ventana controlada.

## Entornos

Para mantener el mismo esquema en localhost, staging y prod:

- usar exactamente las mismas migraciones SQL
- separar solo variables de entorno y credenciales
- no editar el schema a mano en un entorno y en otro no
- promover a prod solo migraciones ya validadas en staging

Configuracion recomendada por entorno:

- local: `.env.local`
- staging subdominio: variables del proyecto Supabase/Vercel de staging
- prod subdominio: variables del proyecto Supabase/Vercel de produccion

El schema debe ser identico; lo unico que cambia es el proyecto/credenciales.
