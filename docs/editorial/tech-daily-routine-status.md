# Rutina "Promptea AI Daily Tech": alta y estado

Creada el 2026-11-13 (v1.8.5). El prompt sigue siendo el de [`tech-daily-routine.md`](./tech-daily-routine.md); acá está cómo quedó dada de alta, qué se verificó y qué falta para encenderla. Sin secretos.

## Ficha

| Campo | Valor |
| --- | --- |
| Id | `trig_016d8RWXCJbYzCYrzKKqfmAc` |
| Página | https://claude.ai/code/routines/trig_016d8RWXCJbYzCYrzKKqfmAc |
| Nombre | Promptea AI Daily Tech |
| Horario | `0 15 * * *` (UTC) = todos los días a las 12:00 en Buenos Aires (UTC−3, sin horario de verano) |
| Estado | **Deshabilitada** (`enabled: false`) hasta que se cumplan los pasos de abajo |
| Modelo | `claude-opus-5-5` (igual que las hermanas) |
| Entorno | `Default` (`env_017H2iTZk8xxWZCquYTwJxTk`), el mismo de `promptea-ai-daily` y `promptea-ai-daily-morning` |
| Repositorio | `https://github.com/lkl03/promptea` |
| Herramientas | Bash, Read, Glob, Grep, WebFetch, WebSearch (las de las hermanas; sin Write ni Edit) |
| Conectores | Ninguno (las hermanas tampoco tienen) |

Se verificó con `RemoteTrigger get` (nombre, cron, `enabled: false`, `next_run_at` calculado para 2026-11-14 15:00 UTC, que no se dispara mientras esté deshabilitada) y en la página de la rutina (diario 12:00, Opus 5.5, `lkl03/promptea`, entorno Default). El texto guardado se comparó por SHA-256 con el generado desde este repo: idénticos.

## Las instrucciones

Son el prompt de [`tech-daily-routine.md`](./tech-daily-routine.md) **sin cambios**, precedido por un bloque `ROUTINE SETUP` con dos cosas:

1. **`PUBLISH SECRET: PASTE_BLOG_PUBLISH_SECRET_HERE`** — el lugar del secreto. Las rutinas hermanas reciben `BLOG_PUBLISH_SECRET` así, escrito en sus instrucciones (el entorno Default no tiene variables ni secretos), y ninguna herramienta permite copiarlo de una rutina a otra sin escribir el valor, así que ese reemplazo lo hace el dueño. Mientras diga `PASTE_BLOG_PUBLISH_SECRET_HERE`, la rutina no llama al endpoint de publicación y termina en `PUBLICATION_FAILED` con `secret_not_configured`.
2. **`VALIDATION MODE: ON`** — mientras esté, la rutina solo manda el `dryRun` (valida contra el endpoint real sin escribir nada) y nunca la publicación. Si no encuentra una nota elegible, firma y manda en `dryRun` el ejemplo de [`tech-daily-payload.example.json`](./tech-daily-payload.example.json) con las fechas de hoy, para probar igual el secreto, la firma y el schema. Informa además qué fuentes pudo leer y cuáles no.

Para encenderla de verdad se borra el bloque `VALIDATION MODE` (y el reemplazo del secreto queda).

## Red: faltan dominios

El entorno Default tiene acceso a la red **limitado a 161 dominios** (más los administradores de paquetes). Comparado con el registro de fuentes ([`lib/blog/sources.ts`](../../lib/blog/sources.ts)), de las **118 fuentes que sirven a la edición Tech solo 23 tienen su host permitido**: faltan **85 hosts**, entre ellos Vercel, Cloudflare, GitHub, Next.js, React, Node.js, Supabase, Netlify, Docker, Kubernetes y casi toda la prensa Tier 2 de tecnología. Sin agregarlos, la rutina va a terminar casi siempre en `RESEARCH_FAILED` (el proxy rechaza la conexión).

La lista, uno por línea y lista para pegar: [`tech-routine-domains-to-allow.txt`](./tech-routine-domains-to-allow.txt). Se agregan en claude.ai/code → selector de entorno → `Default` → ⚙ → **Acceso a la red** → "Dominios permitidos" (al final de la lista) → **Guardar cambios**. Es una configuración del entorno compartido: también la ven las rutinas de AI Daily, que así ganan acceso a esas fuentes. Si se prefiere no tocar el entorno compartido, la alternativa es un entorno propio para Tech con esos dominios y cambiar el de la rutina.

Notas sobre la lista:
- Las entradas sin comodín no cubren el `www.`: por eso aparecen, por ejemplo, `www.theregister.com` y `www.tomshardware.com` aunque `theregister.com` y `tomshardware.com` ya estén permitidos.
- `github.com` está incluido porque las releases de Next.js, React y MCP, GitHub Trending y la GitHub Advisory Database se leen desde ahí; el clon del repositorio va por otro camino.

## Lo que falta, en orden

1. **Dominios** (arriba).
2. **Secreto**: en la página de la rutina → "Editar instrucciones", reemplazar `PASTE_BLOG_PUBLISH_SECRET_HERE` por el mismo valor que tienen las rutinas `promptea-ai-daily` (línea `PUBLISH SECRET:`), sin espacios extra → **Guardar cambios**.
3. **Corrida de validación**: "Ejecutar ahora" una vez, con `VALIDATION MODE: ON`. No publica. En su informe se espera `HTTP 200` y `"outcome":"validated"` del `dryRun`; un `401` indica que el secreto no coincide con el de Vercel.
4. **Encender**: borrar el bloque `VALIDATION MODE` (de `VALIDATION MODE: ON` hasta la línea anterior a `=== END OF ROUTINE SETUP ===`), guardar y activar el interruptor de la rutina. La primera publicación real devuelve `/blog/tech` al sitemap y a `llms.txt` sola.
5. Leer los primeros informes (en la misma página, "Historial").

## Qué no se hizo y por qué

- **No se corrió la rutina**: sin el secreto el `dryRun` no puede firmarse, y sin los dominios la investigación casi no tiene fuentes. Una corrida ahora no habría validado nada.
- **No se escribió el secreto en ningún lado** (ni en este repo, ni en la rutina, ni en el entorno).
- **No se tocó ninguna otra rutina**: `promptea-ai-daily`, `promptea-ai-daily-morning`, "Promptea Weekly newsletter" y "Weekly Promptea update" (pausada) quedan como estaban.
