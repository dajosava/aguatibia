# Comandos Git y GitHub — guía rápida para developers

Este documento recopila los comandos habituales para trabajar con este proyecto, subir cambios a **GitHub** y relacionarlos con el despliegue (por ejemplo en Netlify). Cada bloque indica **qué hace** el comando.

---

## Antes de empezar

- **Repositorio:** carpeta del proyecto donde existe la carpeta oculta `.git`.
- **Rama principal:** suele llamarse `main` (antes a veces `master`).
- **Remoto `origin`:** por convención, el alias del repositorio en GitHub (`https://github.com/usuario/repo.git` o SSH).
- **No subas secretos:** el archivo `.env` debe estar en `.gitignore`; las claves de Supabase van en variables de entorno del hosting (Netlify), no en el repo.

---

## Configuración inicial (una vez por máquina)

| Comando | Qué hace |
|--------|----------|
| `git config --global user.name "Tu Nombre"` | Guarda el nombre que verán los commits. |
| `git config --global user.email "tu@email.com"` | Email asociado a los commits (mejor el de GitHub). |

Comprobar:

```bash
git config --global --list
```

---

## Crear el repositorio local y primer commit

| Comando | Qué hace |
|--------|----------|
| `cd /ruta/al/proyecto` | Entra en la carpeta del proyecto (en Git Bash en Windows: `/c/Web_Projects/...`). |
| `git init` | Crea el repositorio Git en esa carpeta (genera `.git/`). |
| `git status` | Muestra archivos modificados, sin seguimiento o listos para commit. |
| `git add .` | Añade **todos** los archivos permitidos al área de preparación (staging). Revisa antes que `.env` no se incluya. |
| `git add archivo.txt` | Añade solo un archivo concreto. |
| `git reset HEAD archivo` | Quita un archivo del staging sin borrarlo del disco (útil si añadiste `.env` por error). |
| `git commit -m "mensaje"` | Guarda una instantánea con los archivos en staging; el mensaje describe el cambio. |
| `git branch -M main` | Renombra la rama actual a `main` (nombre estándar hoy). |

**Flujo típico del primer día:**

```bash
cd "/c/Web_Projects/Aguatibia_Surf_school/AGUATIBIA_PROJECT/AguaTibiaForms/project"
git init
git add .
git status          # verificar que .env NO aparece como "new file"
git commit -m "Initial commit: Agua Tibia Forms"
git branch -M main
```

---

## Conectar con GitHub (remoto) y subir código

| Comando | Qué hace |
|--------|----------|
| `git remote add origin https://github.com/USUARIO/REPO.git` | Crea el alias `origin` apuntando a la URL del repo en GitHub. **Sustituye** `USUARIO` y `REPO` por los valores reales. |
| `git remote -v` | Lista los remotos configurados (fetch/push). |
| `git remote set-url origin https://github.com/USUARIO/REPO.git` | **Corrige** la URL si la escribiste mal o usaste un placeholder (ej. `NOMBRE-DEL-REPO`). |
| `git push -u origin main` | Sube la rama `main` al remoto `origin` y deja configurado el seguimiento (`-u`) para próximos `git push`/`git pull`. |

**Importante:** la URL debe ser la del repositorio **real** que creaste en GitHub (pegar desde el botón Code del repo).

```bash
git remote add origin https://github.com/dajosava/aguatibia.git
git push -u origin main
```

---

## Día a día: cambios y subida

| Comando | Qué hace |
|--------|----------|
| `git status` | Ver qué cambió desde el último commit. |
| `git diff` | Ver diferencias línea a línea (sin staging). |
| `git add .` o `git add src/...` | Preparar archivos para el commit. |
| `git commit -m "descripción del cambio"` | Crear commit con lo preparado. |
| `git push` | Subir commits a GitHub (si ya configuraste `-u origin main` antes). |

---

## Quitar archivos del seguimiento de Git (sin borrarlos del disco)

Útil si **`.env`** se añadió por error al staging o fue commiteado antes:

| Comando | Qué hace |
|--------|----------|
| `git rm --cached .env` | Deja de rastrear `.env` en el **siguiente** commit; el archivo sigue en tu PC. Luego haz commit: *"stop tracking .env"*. |

Después de eso, asegúrate de que `.env` está en `.gitignore`.

---

## Traer cambios desde GitHub

| Comando | Qué hace |
|--------|----------|
| `git pull` | Descarga cambios del remoto y los fusiona en tu rama actual (equivalente a `fetch` + `merge` en la configuración por defecto). |
| `git pull origin main` | Igual, indicando explícitamente remoto y rama. |

Si el remoto tiene un `README` y tu repo local no comparte historial:

```bash
git pull origin main --allow-unrelated-histories
```

(Resuelve conflictos si Git los marca, luego `git commit` y `git push`.)

---

## Autenticación con GitHub (HTTPS)

GitHub **no** acepta la contraseña de la cuenta para `git push` por HTTPS. Opciones:

1. **Personal Access Token (PAT):** al hacer push, usuario = tu usuario de GitHub, contraseña = el token (con permiso `repo` para repos privados o push).
2. **Git Credential Manager** (Windows): guarda el token de forma segura tras el primer uso correcto.
3. **SSH:** remoto `git@github.com:usuario/repo.git` y clave SSH en GitHub.

Si ves **403 Permission denied**:

- Revisa que la URL del remoto sea correcta (`git remote -v`).
- Borra credenciales antiguas de GitHub en **Administrador de credenciales de Windows** y vuelve a hacer `git push` con un token nuevo.
- Comprueba que el token no haya expirado y tenga alcance `repo` (o permisos de escritura en repos fine-grained).

---

## Comandos útiles de diagnóstico

| Comando | Qué hace |
|--------|----------|
| `git log --oneline -10` | Últimos 10 commits en una línea cada uno. |
| `git branch` | Ramas locales; la actual lleva `*`. |
| `git grep -n "texto"` | Busca texto en archivos **versionados** (útil para comprobar que no hay claves en el repo). |

---

## Relación con Netlify

- Netlify suele conectarse al **mismo** repositorio de GitHub.
- Cada `git push` a la rama configurada puede disparar un **nuevo deploy**.
- Las variables `VITE_*` se configuran en el panel de Netlify, **no** en el repositorio.

Más detalle: [`DESPLIEGUE-NETLIFY.md`](./DESPLIEGUE-NETLIFY.md).

---

## Referencia rápida (orden habitual)

```text
git status
git add .
git commit -m "mensaje claro"
git push
```

---

*Documento orientado al equipo de desarrollo del proyecto Agua Tibia Forms. Actualiza este archivo si incorporáis flujos nuevos (ramas, PR, rebase, etc.).*
