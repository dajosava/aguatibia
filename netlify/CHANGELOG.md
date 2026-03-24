# Registro de cambios (Agua Tibia Forms)

Documentación de releases y despliegue junto a [`netlify.toml`](../netlify.toml) (build Vite → `dist/`, redirect SPA).

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y, cuando aplique, [versionado semántico](https://semver.org/lang/es/).

---

## Descripción del producto (visión general)

**Agua Tibia Surf School — Formularios de renta** es una aplicación web para digitalizar el **acuerdo de renta de tablas**: el cliente completa datos, elige renta y tabla desde inventario, productos de tienda opcionales, método de pago, términos y **firma digital**. Los datos viven en **Supabase** (PostgreSQL); el personal usa un **panel admin** autenticado (contratos, inventario de tablas, registro de pago, check-out).

### Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide, `react-phone-number-input`.
- **Backend:** Supabase (Postgres, Auth, cliente JS). Lógica sensible en **RPC y triggers** `SECURITY DEFINER` donde hace falta.

### Funcionalidades principales (estado actual)

| Área | Descripción |
|------|-------------|
| **Formulario público** | Datos de contacto, fechas, **búsqueda de tabla** contra inventario, tipo/duración de renta con precio, líneas de **tienda** (catálogo opcional), efectivo/tarjeta, términos, firma. El alta guarda `contract_paid = false` por defecto. |
| **Panel admin** | Login Supabase Auth; secciones **Contratos** e **Inventario**; listado con búsqueda y métricas; detalle con firma, historial de cambio de tabla, **estado de pago** (marcar pagado/pendiente); edición de acuerdo (fechas, tienda, cambio de tabla, **Registrar pago**, **check-out**). |
| **Inventario** | Tablas con marca, número, estado (Disponible / Rentada); página admin para gestión. |
| **Negocio** | Nuevo acuerdo puede marcar tabla como **Rentada**; cambio de tabla en vigencia con historial; **check-out** cierra el acuerdo y deja la tabla **Disponible**; check-out exige **pago registrado** (`contract_paid`). |

---

## [Sin publicar] — 2026-03-21

### Añadido (evolución reciente del repo)

- **Pago del contrato:** columna `contract_paid` en `rental_agreements`; UI en admin (detalle) y en modal de edición con botón **Registrar pago**; el formulario público **no** permite marcar pago (queda pendiente hasta staff).
- **Check-out:** RPC `rental_checkout_close`: acuerdo → `cerrado`, tabla del contrato → `Disponible` en inventario. Variante que exige `contract_paid` antes de cerrar (`20260321230000_rental_checkout_requires_contract_paid.sql`).
- **Inventario de tablas:** tabla `surfboard_inventory`, columna `brand`, columna `status`, `SELECT` anónimo para el formulario; trigger al insertar renta que marca tabla **Rentada**; RPC de cambio de tabla en renta activa e historial `rental_board_change_history`.
- **Productos de tienda:** tablas `rental_agreement_store_items` y catálogo `store_products`; precio total del contrato incluye renta + líneas de tienda.
- **Panel admin:** `AdminLayout` con navegación Contratos / Inventario; `SurfboardInventoryPage` para CRUD de tablas.
- **Componentes:** `SurfboardCombobox`, `RentalBoardChangeHistoryList`, `RentalAgreementEditModal` (edición, swap, registrar pago, check-out), `StoreProductLineInput`, utilidades de estado de renta y etiquetas de tabla.

### Añadido (cimientos del proyecto ya documentados en la primera versión del changelog)

- **Documentación:** `README.md`, `docs/DESPLIEGUE-NETLIFY.md`, `docs/comandos.md`; registro de cambios (este archivo).
- **Modo oscuro:** `ThemeContext`, persistencia, `dark:` en UI, script anti-flash en `index.html`.
- **Auth:** `AuthContext`, `AdminLogin`, panel solo con sesión.
- **Servicios:** `rentalAgreementService` (insert, listado, actualización de acuerdo + tienda, swap, check-out, `updateRentalAgreementContractPaid`), `surfboardInventoryService`, `storeCatalogService`.
- **Tipos y config:** `src/types/*`, `rentalOptions`, validación `src/lib/env.ts`.
- **ESLint:** configuración plana (`eslint.config.js`) según el repo.

### Cambiado

- **`App.tsx`:** rutas internas admin por sección (contratos vs inventario) dentro de `AdminLayout`.
- **Formulario / admin:** flujos alineados con inventario, tienda, pago solo desde admin o modal de edición.

### Corregido / operaciones

- **Desarrollo:** `npm install` necesario para tener `vite` en `node_modules` si el comando no se reconoce.

### Notas de despliegue (Netlify)

- Variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el panel de Netlify.
- `SECRETS_SCAN_OMIT_KEYS` en `netlify.toml` para el falso positivo del escáner con la clave anon en el bundle.
- Aplicar migraciones en Supabase en orden antes de producción; crear usuario staff en Auth antes de restringir `SELECT` a autenticados.

---

## Referencia de migraciones SQL (`supabase/migrations/`)

Orden aproximado por prefijo de nombre de archivo:

| Archivo | Tema |
|---------|------|
| `20251125185837_create_rental_agreements_table` | Tabla `rental_agreements`, RLS inicial. |
| `20251125223930_update_rental_agreements_policies` | Ajuste de políticas (p. ej. lectura para desarrollo). |
| `20251126224927_add_surfboard_number_column` | Columna `surfboard_number`. |
| `20260207120000_create_rental_agreement_store_items` | Líneas de tienda por acuerdo. |
| `20260208120000_create_store_products_catalog` | Catálogo de productos de tienda. |
| `20260321120000_restrict_select_to_authenticated` | `SELECT` de acuerdos solo `authenticated` (producción). |
| `20260321120010_allow_insert_rental_for_anon_and_authenticated` | Políticas de `INSERT` alineadas con anon + auth. |
| `20260321140000_add_contract_paid_to_rental_agreements` | Columna `contract_paid`. |
| `20260321150000_create_surfboard_inventory` | Inventario de tablas. |
| `20260321160000_allow_anon_select_surfboard_inventory` | Lectura inventario para el formulario público. |
| `20260321170000_add_brand_to_surfboard_inventory` | Marca en inventario. |
| `20260321180000_rental_board_change_history` | Historial de cambios de tabla. |
| `20260321190000_add_status_to_surfboard_inventory` | Estado Disponible/Rentada. |
| `20260321200000_mark_surfboard_rented_on_rental_insert` | Trigger rentada + RPC `rental_swap_surfboard`. |
| `20260321220000_rental_checkout_close` | RPC check-out y liberación de tabla. |
| `20260321230000_rental_checkout_requires_contract_paid` | Check-out solo si `contract_paid` es verdadero. |

---

*Última actualización: 2026-03-21.*
