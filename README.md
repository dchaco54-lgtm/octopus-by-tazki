# Octopus by Tazki

Sistema interno tipo SaaS (mini ERP / CRM / Billing Ops) para operaciones Finance Ops, Revenue Ops y Customer del equipo Tazki.

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- shadcn/ui style components (locales)
- Supabase (Auth + DB + Storage)
- Deploy en Vercel

## Arquitectura

- `app/`: rutas App Router (`/login`, modulos protegidos)
- `components/`: UI reusable (`ui`, `layout`, `shared`)
- `modules/`: dominio por feature (`auth`, `companies`, `dashboard`)
- `lib/supabase/`: clientes Supabase (browser, server, proxy)
- `hooks/`: hooks reutilizables
- `services/`: acceso a datos
- `types/`: contratos de tipos
- `styles/`: tokens visuales
- `supabase/`: SQL schema + seeds

## Auth y Rutas protegidas

- Pantalla inicial: `/login`
- Todas las rutas se protegen en `proxy.ts` (Next 16 reemplaza `middleware.ts`)
- Login con Supabase Auth (`signInWithPassword`)
- Bloqueo de dominio corporativo: solo `@tazki.cl`

## Setup local

1. Instalar dependencias:

```bash
npm install
```

2. Configurar variables de entorno:

```bash
cp .env.local.example .env.local
```

3. Completar `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

4. En Supabase SQL Editor, ejecutar:

- `supabase/schema.sql`
- Si tu base ya existia desde una version anterior y Billing falla por columnas faltantes, ejecutar antes `supabase/billing-bootstrap.sql`
- Si vas a usar facturacion manual completa, ejecutar tambien `supabase/billing-manual-invoicing.sql`
- `supabase/seeds.sql`

5. Levantar el proyecto:

```bash
npm run dev
```

Alternativa mas robusta si tu terminal pierde `node/npm` del `PATH`:

```bash
./scripts/dev-safe.sh
```

Chequeo rapido de salud local:

```bash
./scripts/check-localhost.sh
```

## Troubleshooting

Si aparece un error como `Could not find the 'service_period' column of 'billing_records' in the schema cache` o un `null value in column "service_period_start"`, tu proyecto apunta a una base con Billing incompleto o desalineado.

Ejecuta en este orden dentro de Supabase SQL Editor:

```sql
-- 1) Base de Billing para instalaciones antiguas
\i supabase/billing-bootstrap.sql

-- 2) Extensiones del modulo de facturacion manual
\i supabase/billing-manual-invoicing.sql
```

Si usas el SQL Editor web y no acepta `\i`, abre ambos archivos y pega su contenido en ese mismo orden.

Si el error menciona `billing_records_status_check`, tu base todavia usa los estados antiguos de Billing.

Debes volver a ejecutar:

1. `supabase/billing-bootstrap.sql`
2. `supabase/billing-manual-invoicing.sql`

Eso agrega `origin`, corrige el constraint de `status` para aceptar `draft`, `issued`, `pending_payment`, `paid`, `cancelled`, y migra los valores antiguos como `pending` o `billed`.

## Billing V2

El modelo completo de base de datos para Billing V2 quedo preparado como migracion separada:

- `supabase/migrations/20260407_000001_billing_v2_model.up.sql`
- `supabase/migrations/20260407_000001_billing_v2_model.down.sql`
- `supabase/seeds/billing-v2-demo.sql`
- `docs/billing-data-model.md`

Esta migracion define:

- `origin` y `source_system`
- estados documentales y de pago separados
- tablas nuevas `billing_outputs`, `billing_logs`, `billing_sync_jobs`
- triggers para recalcular saldo y `payment_status`
- indices para staging y futura produccion

La recomendacion es validar primero esta migracion en localhost/staging y luego promoverla a produccion.

## Entregables MVP implementados

- Estructura completa por capas solicitada
- SQL schema completo para entidades del ERP/CRM/Billing
- Seeds iniciales (3 empresas, 2 productos, 3 suscripciones, 5 contactos)
- Auth Supabase con restriccion `@tazki.cl`
- `proxy.ts` de proteccion global
- Pantalla de login (estilo SaaS/Odoo moderno)
- Home post-login tipo selector de modulos
- Dashboard funcional con metricas y tabla de billing
- CRUD base completo de Companies (listar, filtrar, buscar, crear, editar, detalle)
- CRUD completo de Contacts (listar, filtrar, buscar, crear, editar, detalle)
- CRUD completo de Products (listar, filtrar, buscar, crear, editar, detalle)
- Componentes reutilizables (button, card, table, badge, form primitives)

## Deploy en Vercel

1. Importar repo en Vercel.
2. Configurar variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy.
