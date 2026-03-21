# Registro de cambios

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato está inspirado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/), y este proyecto además usa [Versionado semántico](https://semver.org/lang/es/) cuando aplique a releases numerados.

---

## Descripción del producto (visión general)

**Agua Tibia Surf School — Formularios de renta** es una aplicación web pensada para la **escuela de surf Agua Tibia**. Su objetivo es digitalizar el **acuerdo de renta de tablas** (surfboard rental agreement): el cliente completa datos de contacto, elige tipo de renta y duración, método de pago, acepta términos legales y deja una **firma digital** dibujada en pantalla. Los datos se guardan en **Supabase** (PostgreSQL) para que el personal pueda **consultarlos en un panel de administración**.

### Funcionalidades principales

| Área | Descripción |
|------|-------------|
| **Formulario público** | Captura nombre, email, teléfono (con selector internacional), dirección, fechas de recogida/devolución, número de tabla, quién revisó la tabla, opción de renta con precio calculado, pago en efectivo o tarjeta, aceptación de términos y firma en canvas. |
| **Panel admin** | Listado de acuerdos con búsqueda, métricas resumidas (totales, estados, suma de precios), detalle en modal y visualización de la firma. Requiere **inicio de sesión** con Supabase Auth (cuenta staff). |
| **Backend** | Tabla `rental_agreements` en Supabase con **Row Level Security (RLS)**: inserción anónima para el formulario; lectura y actualización restringidas a usuarios autenticados cuando se aplica la migración de producción. |

### Stack técnico

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS.
- **Backend como servicio:** Supabase (PostgreSQL + Auth + API auto-generada vía cliente JS).
- **Iconos:** Lucide React.
- **Teléfono:** `react-phone-number-input`.

### Datos que se almacenan

Incluyen datos personales y la firma en base64; por ello la seguridad (RLS, no exponer lectura anónima en producción y uso de Auth para el panel) es parte central del diseño.

---

## [Sin publicar] — 2026-03-21

### Añadido

- **Documentación:** `README.md` con estructura del proyecto, patrones de diseño, configuración y despliegue; este `CHANGELOG.md` con el historial y la descripción del producto.
- **Modo oscuro:** botón de alternancia (estilo azul marino), `ThemeContext`, persistencia en `localStorage` (`agui-theme`), `darkMode: 'class'` en Tailwind, script en `index.html` para reducir flash al cargar, y estilos `dark:` en navegación, formulario, login y panel admin.
- **Autenticación para administración:** `AuthContext`, pantalla `AdminLogin`, sesión Supabase (`signInWithPassword` / `signOut`); la vista Admin solo muestra el panel tras login.
- **Capa de datos:** `src/services/rentalAgreementService.ts` (inserción y listado de acuerdos) para separar UI de acceso a Supabase.
- **Tipos centralizados:** `src/types/rentalAgreement.ts` para filas e inserciones coherentes con la base de datos.
- **Configuración de negocio:** `src/config/rentalOptions.ts` como única fuente de verdad del catálogo de rentas y cálculo de precio en cliente.
- **Validación de entorno:** `src/lib/env.ts` para comprobar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` al inicializar el cliente.
- **Migración SQL de producción:** `20260321120000_restrict_select_to_authenticated.sql` — revierte el `SELECT` anónimo sobre `rental_agreements` y deja la lectura solo para rol `authenticated` (tras aplicarla, el panel requiere usuarios creados en Supabase Auth).

### Cambiado

- **`App.tsx`:** envuelto en `AuthProvider` (y la app en `ThemeProvider` desde `main.tsx`); flujo Admin: carga de sesión → login o dashboard; botón de tema en la barra superior.
- **`RentalForm.tsx`:** usa el servicio y `rentalOptions`; validaciones extra (opción de renta y método de pago); clases compartidas `form-input` / `form-label` en `index.css`.
- **`AdminDashboard.tsx`:** consume `fetchRentalAgreements`, manejo de error con reintento, botón cerrar sesión, soporte visual de modo oscuro.
- **`AdminLogin.tsx`:** formulario de acceso alineado con el tema claro/oscuro.
- **`src/lib/supabase.ts`:** cliente creado tras validar variables de entorno (sin duplicar interfaces de dominio en este archivo).

### Corregido / Operaciones

- **Entorno de desarrollo:** si `vite` no se reconocía como comando, la causa habitual era no haber ejecutado `npm install` en la raíz del proyecto; las dependencias incluyen Vite en `devDependencies`.

### Notas de despliegue

- Antes de aplicar la migración `20260321120000_restrict_select_to_authenticated.sql` en un proyecto Supabase **real**, crear al menos un usuario staff en **Authentication**, confirmar que el login en la app funciona y luego ejecutar la migración (CLI Supabase o SQL Editor). Hasta entonces, si una migración anterior permitía `SELECT` a `anon`, el panel podía verse sin login solo en entornos de prueba; en producción debe evitarse.

---

## Referencias anteriores (migraciones ya presentes en el repo)

Estas entradas corresponden a migraciones versionadas en `supabase/migrations/` y no tienen fecha exacta en este changelog; se listan por nombre de archivo.

- **20251125185837** — Creación de `rental_agreements`, RLS inicial, políticas de INSERT (anon) y SELECT/UPDATE (authenticated).
- **20251125223930** — Ajuste de políticas que permitía `SELECT` a usuarios anónimos (pensado para desarrollo; revertido conceptualmente por la migración de 2026-03-21 en entornos seguros).
- **20251126224927** — Columna `surfboard_number`.
- **20260321120000** — Restricción de `SELECT` a solo `authenticated` (producción).

---

*Última actualización del changelog: 2026-03-21.*
