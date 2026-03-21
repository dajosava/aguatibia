# Despliegue en Netlify — Agua Tibia Forms

Esta guía describe cómo publicar esta aplicación (Vite + React) en **Netlify**, qué variables necesitas y cómo comprobar que todo funciona.

## Qué va a hacer Netlify

1. Instalar dependencias (`npm install`).
2. Ejecutar el build (`npm run build`).
3. Servir la carpeta **`dist/`** como sitio estático.

Las variables `VITE_*` deben estar definidas **en Netlify** (no se suben al repositorio): se inyectan en **tiempo de build** y quedan embebidas en el JavaScript del cliente.

---

## Requisitos previos

- Cuenta en [Netlify](https://www.netlify.com/) (plan gratuito suficiente).
- Proyecto **Supabase** con URL y clave anónima (Settings → API).
- Código en un repositorio **Git** (GitHub, GitLab o Bitbucket) **o** la [CLI de Netlify](https://docs.netlify.com/cli/get-started/) instalada para desplegar desde tu PC.

### Comprobar el build en local (recomendado)

Antes de desplegar:

```bash
npm install
npm run build
npm run preview
```

Abre la URL que indique Vite y prueba formulario y panel admin. Si aquí falla, corrígelo antes de Netlify.

---

## Variables de entorno obligatorias

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL del proyecto (ej. `https://xxxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Clave **anon** pública (Settings → API) |

**Importante:** sin estas variables el build puede completarse, pero la app fallará al conectar con Supabase. Añádelas en Netlify **antes** o **después** del primer deploy; si las añades después, hay que **volver a desplegar** (trigger deploy) para que el nuevo build las incluya.

---

## Escáner de secretos (build falla: “secrets-scanning failure”)

Netlify puede **cancelar el build** si detecta cadenas que parecen credenciales en el repositorio o en la salida del build.

### 1. No subas `.env` al repositorio

- El archivo **`.env`** debe estar solo en tu PC y en **`.gitignore`** (ya está en este proyecto).
- No subas `.env`, `.env.local`, `.env.production`, etc. El repo solo debe incluir **`.env.example`** con valores de ejemplo (placeholders), nunca claves reales.

Si en algún momento commiteaste `.env` con datos reales:

```bash
git rm --cached .env
# si existían otros:
git rm --cached .env.local .env.production 2>/dev/null || true
git add .gitignore
git commit -m "chore: dejar de versionar archivos .env"
git push
```

En GitHub/GitLab, **rota la clave** en Supabase si la clave quedó expuesta en el historial público.

Comprueba en local que no quedan claves en el índice:

```bash
git grep -n "VITE_SUPABASE" || true
git ls-files | findstr /i "\.env"   # Windows
# Linux/mac: git ls-files | grep '\.env'
```

### 2. Define las variables solo en Netlify

**Site settings → Environment variables:** `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (mismos nombres que en local). Así el build las inyecta sin guardarlas en Git.

### 3. Falso positivo en el bundle de Vite

Al hacer `npm run build`, Vite **incrusta** en el JavaScript los valores de `VITE_*`. La clave **anon** de Supabase parece un JWT; el escáner puede marcarla aunque sea la clave pública prevista para el navegador.

Este repo incluye en **`netlify.toml`** la variable de build:

`SECRETS_SCAN_OMIT_KEYS = "VITE_SUPABASE_ANON_KEY,VITE_SUPABASE_URL"`

para indicar a Netlify que no trate esos valores embebidos como filtración indebida (solo nombres de variable, **sin** pegar secretos en el archivo).

Si aun así fallara, puedes añadir la misma clave en el panel: **Site settings → Environment variables → `SECRETS_SCAN_OMIT_KEYS`** con el mismo valor (coma, sin espacios). Documentación: [Configure secrets scanning](https://ntl.fyi/configure-secrets-scanning).

### 4. No imprimas secretos en el build

Evita `console.log(process.env)` o scripts que escriban claves en los logs del build.

---

## Opción A — Desde Git (recomendado)

### 1. Subir el código al repositorio

Si aún no está en remoto:

```bash
git init
git add .
git commit -m "Preparar despliegue Netlify"
git remote add origin <url-de-tu-repo>
git push -u origin main
```

(Ajusta la rama: `main` o `master`.)

### 2. Crear el sitio en Netlify

1. Entra en [app.netlify.com](https://app.netlify.com/) → **Add new site** → **Import an existing project**.
2. Conecta GitHub/GitLab/Bitbucket y autoriza el acceso al repositorio.
3. Selecciona el repo y la rama (p. ej. `main`).

### 3. Ajustar build (normalmente automático)

Si en la raíz del repo existe **`netlify.toml`**, Netlify suele detectar:

- **Build command:** `npm run build`
- **Publish directory:** `dist`

Si el asistente pide valores a mano, usa exactamente esos dos.

### 4. Variables de entorno en Netlify

1. **Site configuration** → **Environment variables** (o **Build & deploy** → **Environment**).
2. Añade:
   - `VITE_SUPABASE_URL` = tu URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` = tu clave anon
3. Guarda. Para producción, marca **Scopes** según prefieras (p. ej. solo *Production* o también *Deploy previews*).

### 5. Desplegar

Guarda y lanza el deploy. Cuando termine, Netlify mostrará una URL tipo `https://nombre-random.netlify.app`.

### 6. Redesplegar tras cambiar variables

Si cambias variables de entorno: **Deploys** → **Trigger deploy** → **Deploy site** (clear cache opcional si algo falla de forma extraña).

---

## Opción B — Netlify CLI (desde tu ordenador)

Útil para pruebas o despliegues manuales sin conectar Git todavía.

### 1. Instalar e iniciar sesión

```bash
npm install -g netlify-cli
netlify login
```

Se abre el navegador para autorizar.

### 2. Enlazar el proyecto (una vez)

En la carpeta del proyecto:

```bash
cd ruta/al/proyecto
netlify init
```

Elige crear un sitio nuevo o enlazar uno existente. Si ya tienes `netlify.toml`, la CLI puede reutilizarlo.

### 3. Variables de entorno en la CLI o en el panel

- En el panel web del sitio: igual que en la Opción A (Environment variables).
- O por CLI: `netlify env:set VITE_SUPABASE_URL "https://..."` (y lo mismo para la anon key).

### 4. Build y despliegue

**Borrador (preview):**

```bash
npm run build
netlify deploy --dir=dist
```

Sigue la URL de preview que imprima la CLI.

**Producción:**

```bash
npm run build
netlify deploy --dir=dist --prod
```

---

## Supabase: URL del sitio en producción

Cuando tengas la URL definitiva de Netlify (ej. `https://tu-app.netlify.app`):

1. **Supabase** → **Authentication** → **URL Configuration**.
2. En **Site URL** puedes poner la URL de Netlify si es tu app principal.
3. En **Redirect URLs** añade la URL de Netlify (y `http://localhost:5173` para desarrollo local si usas login).

Así el flujo de **admin (login)** no será bloqueado por redirecciones incorrectas.

---

## CORS y API

El cliente Supabase usa la URL HTTPS de Supabase; no hace falta CORS especial en tu propio dominio para las llamadas estándar del SDK. Si en el futuro añades **Edge Functions** u otros orígenes, revisa la documentación de Supabase.

---

## Archivos en este repo relacionados con Netlify

| Archivo | Propósito |
|---------|-----------|
| `netlify.toml` | Comando de build, carpeta `dist`, redirect SPA |
| `public/_headers` | Cabeceras de seguridad (CSP, etc.) en archivos estáticos |
| `.env.example` | Lista de variables (no contiene secretos reales) |

**No subas** el archivo `.env` con claves reales al repositorio; debe estar en `.gitignore`.

---

## Problemas frecuentes

| Síntoma | Qué revisar |
|---------|-------------|
| Pantalla en blanco o error de Supabase | Variables `VITE_*` en Netlify y **nuevo deploy** tras añadirlas |
| Login admin no funciona en producción | Redirect URLs y Site URL en Supabase Auth |
| Build falla por “npm ci” | Asegúrate de que `package-lock.json` está commiteado o usa `npm install` en build (Netlify suele detectar lockfile) |
| Rutas al recargar dan 404 | `netlify.toml` ya incluye redirect SPA a `index.html` |
| Build falla por **secrets scanning** | Quitar `.env` del repo (`git rm --cached`), variables solo en Netlify; revisar sección [Escáner de secretos](#escáner-de-secretos-build-falla-secrets-scanning-failure) y `SECRETS_SCAN_OMIT_KEYS` en `netlify.toml` |

---

## Checklist rápido

- [ ] `npm run build` funciona en local.
- [ ] **No** hay archivos `.env` con secretos reales en el repositorio (solo `.env.example` con placeholders).
- [ ] Repo en Git y push hecho (si usas Opción A).
- [ ] Sitio creado en Netlify con build `npm run build` y publish `dist`.
- [ ] `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` configuradas en Netlify.
- [ ] Deploy ejecutado tras configurar variables.
- [ ] Supabase Auth actualizado con la URL de Netlify si usas login.

---

*Última actualización: documento generado para el proyecto Agua Tibia Forms.*
