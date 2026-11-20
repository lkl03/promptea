# Rotar `BLOG_PUBLISH_SECRET` y `NEWSLETTER_SEND_SECRET`

Instructivo para el dueño (v1.8.8, 2026-11-20). La rotación la hacés vos: en esta versión no se tocó ningún valor. Este documento no contiene secretos.

## Por qué

Los dos valores están escritos en texto plano dentro de las instrucciones de las rutinas de claude.ai/code. Las rutinas los usan en sus comandos, así que también quedan en el historial de cada corrida: la rutina Tech hace `export BLOG_PUBLISH_SECRET='…'` y la del newsletter `SECRET='…'`. Cualquiera que vea esos historiales puede firmar una publicación o una corrida del newsletter. Al rotarlos, los valores viejos dejan de servir, incluidos los que quedaron en los historiales.

## Dónde vive cada uno

Contado el 20/11 con `RemoteTrigger list`, buscando el valor en el texto de cada rutina sin imprimirlo:

| Secreto | Vercel (Production) | Rutinas que lo tienen escrito | Apariciones |
| --- | --- | --- | --- |
| `BLOG_PUBLISH_SECRET` | sí | `promptea-ai-daily` | 2 |
| | | `promptea-ai-daily-morning` | 2 |
| | | `Promptea AI Daily Tech` (línea `PUBLISH SECRET:`) | 1 |
| `NEWSLETTER_SEND_SECRET` | sí | `Promptea Weekly newsletter` (línea `SECRET (NEWSLETTER_SEND_SECRET…)` y `SECRET='…'` dentro del comando de ejemplo) | 2 |

"Weekly Promptea update" (pausada), "Pasajes tren Mar del Plata" y "Weekly nodo SEO blog" no tienen ninguno de los dos. También pueden estar en archivos `.env.local` de tus copias locales del repo (al menos `D:\Claude\promptea\.env.local` tiene `BLOG_PUBLISH_SECRET`).

## Cuándo

Mientras Vercel y las rutinas tengan valores distintos, las publicaciones fallan con 401. Hacelo en una franja sin corridas:

| Rutina | Horario (UTC) | ART |
| --- | --- | --- |
| AI Daily (mañana) | L–V 12:00 | 09:00 |
| Promptea Weekly newsletter | lunes 12:00 | 09:00 |
| AI Daily Tech | todos los días 15:00 | 12:00 |
| AI Daily (noche) | todos los días 23:00 | 20:00 |

**Franja recomendada: de 16:00 a 22:00 UTC (13:00 a 19:00 ART), cualquier día que no sea lunes.** Con 15 minutos alcanza.

## Pasos

### 1. Generar los dos valores nuevos

En PowerShell, dos veces, una por secreto:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Son 64 caracteres hexadecimales. Los endpoints exigen 32 o más. Guardalos solo en tu gestor de contraseñas y en un archivo temporal `.env.rotation`, fuera de git o borrándolo al terminar:

```text
BLOG_PUBLISH_SECRET=<nuevo valor 1>
NEWSLETTER_SEND_SECRET=<nuevo valor 2>
```

### 2. Vercel

1. vercel.com → proyecto **promptea** → **Settings** → **Environment Variables**.
2. `BLOG_PUBLISH_SECRET` → ⋯ → **Edit** → pegá el nuevo valor → entorno **Production** (y Preview, si lo tenías ahí) → tipo **Sensitive** → **Save**.
3. Lo mismo con `NEWSLETTER_SEND_SECRET`.
4. **Deployments** → el último de Production → ⋯ → **Redeploy**. Las variables nuevas recién se aplican con un deploy nuevo. Esperá a que diga *Ready*, en general unos 3 minutos.

Alternativa con el CLI para las variables. Pide el valor por teclado, así no queda en el historial de la terminal. Si tu versión no reconoce `--sensitive`, sacá esa opción y marcala como Sensitive desde el panel.

```powershell
vercel env rm BLOG_PUBLISH_SECRET production --yes
vercel env add BLOG_PUBLISH_SECRET production --sensitive
```

```powershell
vercel env rm NEWSLETTER_SEND_SECRET production --yes
vercel env add NEWSLETTER_SEND_SECRET production --sensitive
```

El redeploy hacelo desde el panel, como en el punto 4. No uses `vercel --prod` desde una copia local: subiría el código de esa carpeta, que puede no ser `main`.

### 3. Verificar que Vercel tiene los valores nuevos (sin publicar nada)

Desde la carpeta del repo:

```powershell
node --env-file=.env.rotation scripts/ops/verify-secrets.mjs
```

Manda a cada endpoint un pedido firmado con el cuerpo vacío `{}`. El servidor verifica la firma antes de mirar el contenido:
- `OK` (HTTP 400 `validation`): el secreto coincide y no se escribió nada.
- `MISMATCH` (401): Vercel todavía tiene otro valor, o el redeploy no terminó.

### 4. Rutinas (claude.ai/code/routines)

En cada rutina: **Editar instrucciones** → reemplazar el valor viejo por el nuevo en todas sus apariciones → **Guardar cambios**.

| Rutina | Qué reemplazar |
| --- | --- |
| `promptea-ai-daily` | las 2 apariciones del valor viejo de `BLOG_PUBLISH_SECRET` |
| `promptea-ai-daily-morning` | las 2 apariciones del valor viejo de `BLOG_PUBLISH_SECRET` |
| `Promptea AI Daily Tech` | la línea `PUBLISH SECRET: …` |
| `Promptea Weekly newsletter` | las 2 apariciones del valor viejo de `NEWSLETTER_SEND_SECRET` (la línea `SECRET (NEWSLETTER_SEND_SECRET, …):` y `SECRET='…'`) |

Usá buscar y reemplazar (Ctrl+F) con el valor viejo para no dejarte ninguna aparición.

### 5. Confirmar con las rutinas

- La próxima corrida de cada rutina tiene que terminar en `PUBLISHED`, `NO_ELIGIBLE_STORY` o `ALREADY_PUBLISHED`, nunca en `PUBLICATION_FAILED` con 401. Se ve en el historial de cada rutina.
- El lunes siguiente, el newsletter tiene que terminar en `SENT`.
- Si mergeaste la salud de rutinas (lkl03/promptea#50), `GET /api/internal/routines/health` muestra todo al día y no llega ningún mail de alerta.

### 6. Limpiar

- Actualizá los `.env.local` de tus copias del repo, si los usás para `weekly:backfill` o para pruebas.
- Borrá `.env.rotation`.

## Recomendación: sacar los secretos del texto de las rutinas

Mientras el valor esté escrito en las instrucciones, cada corrida lo deja en su historial. Si el entorno de las rutinas permite variables de entorno (claude.ai/code → selector de entorno → `Default` → ⚙; **no lo pude verificar**), conviene:

1. cargar `BLOG_PUBLISH_SECRET` y `NEWSLETTER_SEND_SECRET` como variables del entorno;
2. cambiar las instrucciones de las rutinas para que usen `$BLOG_PUBLISH_SECRET` y `$NEWSLETTER_SEND_SECRET` del entorno, en vez de una línea con el valor;
3. pedirles explícitamente que no impriman comandos que contengan el valor (que usen la variable, nunca el literal).

Si el entorno no lo permite, rotar cada tanto es lo único que limita el daño de un historial expuesto.
