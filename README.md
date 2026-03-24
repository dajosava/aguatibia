# Agua Tibia Surf School — Formularios de renta

Aplicación web para gestionar **acuerdos de renta de tablas de surf**: formulario público con firma digital, almacenamiento en **Supabase** y **panel de administración** para el personal de la escuela.

Para el historial detallado de cambios (desde el inicio del proyecto), la descripción del producto y las notas de despliegue, consulta [`netlify/CHANGELOG.md`](./netlify/CHANGELOG.md). En la raíz, [`CHANGELOG.md`](./CHANGELOG.md) enlaza a ese archivo.

---

## Requisitos

- **Node.js** 18+ (recomendado LTS)
- Cuenta y proyecto **Supabase** con la tabla y políticas aplicadas (ver [Base de datos](#base-de-datos-supabase))

---

## Inicio rápido

```bash
npm install
```

Crea un archivo `.env` en la raíz del proyecto (puedes copiar `.env.example` si existe) con:

```env
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<clave_anon_de_supabase>
```

```bash
npm run dev
```

La app suele quedar en `http://localhost:5173/`.

Otros scripts:

| Comando | Uso |
|---------|-----|
| `npm run build` | Build de producción (salida en `dist/`) |
| `npm run preview` | Previsualizar el build |
| `npm run typecheck` | Comprobación TypeScript sin emitir archivos |
| `npm run lint` | ESLint |

### Despliegue en Netlify

Guía paso a paso (Git, variables `VITE_*`, CLI opcional y checklist): **[`docs/DESPLIEGUE-NETLIFY.md`](./docs/DESPLIEGUE-NETLIFY.md)**. En la raíz del repo hay un **`netlify.toml`** con el build (`npm run build`) y la carpeta de publicación `dist/`.

Comandos de **Git/GitHub** explicados para el equipo: **[`docs/comandos.md`](./docs/comandos.md)**.

---

## Estructura del proyecto

```
project/
├── index.html              # HTML de entrada; script mínimo para tema oscuro sin flash
├── package.json
├── vite.config.ts
├── tailwind.config.js      # darkMode: 'class'
├── postcss.config.js
├── tsconfig*.json
├── netlify.toml            # Build y redirects para Netlify
├── netlify/
│   └── CHANGELOG.md        # Historial de cambios (producto, migraciones, Netlify)
├── docs/
│   ├── DESPLIEGUE-NETLIFY.md
│   └── comandos.md           # Git / GitHub: comandos y qué hace cada uno
├── public/                 # Estáticos (p. ej. agt2logo.png en el header)
├── src/
│   ├── main.tsx            # Punto de entrada React; ThemeProvider
│   ├── App.tsx             # Navegación Formulario / Admin; AuthProvider
│   ├── index.css           # Tailwind + utilidades .form-input / .form-label + teléfono
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── RentalForm.tsx      # Formulario público de acuerdo de renta
│   │   ├── AdminDashboard.tsx  # Listado y detalle para staff autenticado
│   │   ├── AdminLogin.tsx      # Login email/contraseña (Supabase Auth)
│   │   ├── SignatureCanvas.tsx # Firma dibujada (canvas → data URL)
│   │   └── ThemeToggle.tsx     # Alternar modo claro / oscuro
│   ├── contexts/
│   │   ├── AuthContext.tsx     # Sesión Supabase, signIn / signOut
│   │   └── ThemeContext.tsx    # Tema light/dark + localStorage
│   ├── services/
│   │   └── rentalAgreementService.ts  # Acceso a datos: insert / select
│   ├── config/
│   │   └── rentalOptions.ts    # Catálogo de rentas y función de precio
│   ├── types/
│   │   └── rentalAgreement.ts  # Tipos de fila e inserción alineados con la BD
│   └── lib/
│       ├── env.ts              # Validación de variables VITE_SUPABASE_*
│       └── supabase.ts         # Cliente createClient (URL + anon key)
└── supabase/
    └── migrations/             # SQL versionado (orden cronológico por nombre)
```

---

## Arquitectura y decisiones de diseño

### Enfoque general: SPA + BaaS

Se eligió una **Single Page Application** con **React** y **Vite** por rapidez de desarrollo, buen ecosistema TypeScript y despliegue sencillo como sitio estático. El “backend” es **Supabase**: base de datos PostgreSQL, autenticación y API REST/Realtime generada, lo que reduce el código de servidor propio y acelera el tiempo hasta producción para un formulario y un panel interno.

### Separación de responsabilidades

| Capa | Rol |
|------|-----|
| **Componentes UI** | Presentación, estado local de formularios y flujos de pantalla. |
| **Servicios (`services/`)** | Encapsulan llamadas a Supabase; si mañana cambia el proveedor o se añade una API intermedia, el impacto se concentra aquí. |
| **Tipos (`types/`)** | Contrato con la base de datos; evita duplicar interfaces inconsistentes entre pantallas. |
| **Config (`config/`)** | Reglas de negocio puramente de catálogo (opciones de renta y precios en cliente). |
| **Contextos** | Estado global limitado a **autenticación** y **tema**, evitando prop drilling innecesario. |

Este esquema se alinea con el patrón **Repository** (el servicio actúa como fachada de acceso a datos) y con **separation of concerns** habitual en frontends medianos.

### Autenticación y seguridad

- El **formulario público** usa la **clave anónima** de Supabase con políticas RLS que permiten **solo INSERT** en la tabla de acuerdos (en la configuración recomendada para producción).
- El **panel admin** usa la misma clave en el cliente, pero las peticiones van con **JWT de sesión** tras `signInWithPassword`, por lo que el rol en base de datos es `authenticated` y pueden aplicarse políticas distintas (SELECT/UPDATE).
- La migración `20260321120000_restrict_select_to_authenticated.sql` **cierra** el acceso de lectura anónimo que una migración anterior había abierto para pruebas; es un paso obligatorio antes de producción si esas políticas laxas están aplicadas en el proyecto.

**Importante:** la clave `anon` es pública en el navegador; la seguridad real depende de **RLS** y de no exponer la `service_role` en el frontend.

### Validación de entorno

`src/lib/env.ts` comprueba que existan `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` antes de crear el cliente. Así los fallos de configuración se detectan al arrancar con un mensaje claro.

### Modo oscuro

Tailwind usa `darkMode: 'class'`. El estado vive en `ThemeContext`, se persiste en `localStorage` (`agui-theme`) y se aplica la clase `dark` en `<html>`. El **tema por defecto es oscuro**; solo si el usuario eligió explícitamente modo claro se guarda `light`. Un script breve en `index.html` evita el parpadeo en la primera pintura.

### Firma digital

La firma se genera en **canvas** y se envía como **data URL** (base64). Es adecuado para flujos internos y archivo visual; para requisitos legais estrictos adicionales (sellado de tiempo, etc.) habría que valorar integraciones específicas fuera del alcance actual.

---

## Base de datos (Supabase)

- **`rental_agreements`:** acuerdo de renta; el campo **`rental_price`** es el **total del contrato** (precio de la opción de renta + suma de líneas de tienda).
- **`rental_agreement_store_items`:** líneas opcionales (nombre de producto + precio) enlazadas con `rental_agreement_id` (relación 1:N). Permite varios productos por contrato sin duplicar columnas en la tabla principal.
- **`store_products`:** catálogo reutilizable para el autocompletado del formulario. Se **actualiza solo en base de datos** cuando se insertan líneas en `rental_agreement_store_items` (trigger): no hace falta que el cliente escriba directamente en esta tabla. Si el mismo nombre (ignorando mayúsculas/espacios) vuelve a usarse, se actualiza el precio al último valor registrado.

Las migraciones en `supabase/migrations/` deben aplicarse en orden (CLI de Supabase o SQL Editor).

Tras crear usuarios en **Authentication → Users**, el personal puede entrar al panel Admin desde la propia aplicación.

---

## Despliegue (orientación)

1. `npm run build` y servir la carpeta `dist/` con cualquier hosting estático (Netlify, Vercel, S3+CloudFront, etc.).
2. Definir las variables `VITE_*` en el panel del proveedor de CI/CD o hosting.
3. Configurar **CORS** y **URLs permitidas** en Supabase si el dominio de producción no es localhost.
4. Asegurar que las **políticas RLS** en el proyecto remoto coinciden con las migraciones deseadas (especialmente la restricción de `SELECT` a usuarios autenticados).

---

## Licencia y créditos

Proyecto privado de **Agua Tibia Surf School**. Pie de página de la app: desarrollo referenciado a manakinlabs.com.

---

*Documentación generada para alinear al equipo con la estructura y las decisiones técnicas actuales. Actualizar este README cuando cambie el modelo de datos, el flujo de auth o el despliegue.*
