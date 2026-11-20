# Rutina "Promptea AI Daily Tech": estado

Creada el 2026-11-13 (v1.8.5) y **activa desde el 2026-11-14**. El prompt es el de [`tech-daily-routine.md`](./tech-daily-routine.md), precedido por un bloque `ROUTINE SETUP` con el secreto. Este documento no contiene secretos.

Actualizado el 2026-11-20 (v1.8.8) con `RemoteTrigger get` y el historial de corridas (`list_runs` y `get_run_log`), todo en modo lectura.

## Ficha

| Campo | Valor |
| --- | --- |
| Id | `trig_016d8RWXCJbYzCYrzKKqfmAc` |
| Página | https://claude.ai/code/routines/trig_016d8RWXCJbYzCYrzKKqfmAc |
| Nombre | Promptea AI Daily Tech |
| Horario | `0 15 * * *` (UTC) = todos los días a las 12:00 en Buenos Aires |
| Estado | **Habilitada** (`enabled: true`). `VALIDATION MODE` retirado y secreto cargado: la rutina publica |
| Modelo | `claude-opus-5-5` |
| Entorno | `Default` (`env_017H2iTZk8xxWZCquYTwJxTk`), el mismo de `promptea-ai-daily` y `promptea-ai-daily-morning` |
| Herramientas | Bash, Read, Glob, Grep, WebFetch, WebSearch |

## Corridas desde que se encendió

| Fecha (ART) | Resultado | Nota |
| --- | --- | --- |
| 13/11 (corrida manual a las 23:29) | `PUBLISHED` | Cloudflare Spend Management (Workers y Durable Objects), `cloud` P1 |
| 14/11 (sábado) | `NO_ELIGIBLE_STORY` | Ningún changelog Tier 1 con entrada del día |
| 15/11 (domingo) | `NO_ELIGIBLE_STORY` | Solo prensa y agregadores con novedades del día |
| 16/11 | `NO_ELIGIBLE_STORY` | Los candidatos eran tutoriales, política de IA (va a la edición AI) o versiones de parche |
| 17/11 | `PUBLISHED` | Cloudflare Workers: cuatro defaults nuevos para la fecha de compatibilidad 2026-11-17, `cloud` P2 |
| 18/11 | `PUBLISHED` | Cloudflare Workers VPC: CA propia y mTLS, `cloud` P2 |
| 19/11 | `PUBLISHED` | PostgreSQL 19, `developer-tools` P1 |

En producción hay **4 notas** en `/en/blog/tech` y `/es/blog/tech` (verificado con curl el 20/11). La sensación de que había "una sola nota" corresponde a los días 14 a 16: tres días vacíos seguidos, que la rutina considera correctos. Desde la v1.8.8, `GET /api/internal/routines/health` muestra cuántas corridas pasaron sin nota, y la alerta diaria avisa a partir de la cuarta (`lib/ops/routineHealth.ts`).

## Red: sigue faltando acceso

Las corridas siguen informando fuentes bloqueadas por el proxy del entorno. Hosts que estaban en [`tech-routine-domains-to-allow.txt`](./tech-routine-domains-to-allow.txt) y que igual dieron 403 entre el 14 y el 19/11:

- `github.com`: releases de Next.js, React y MCP, Trending y Advisory Database;
- `www.cisa.gov`;
- `www.theregister.com`.

O la lista no se cargó en el entorno o se cargó a medias. **Para revisar:** claude.ai/code → selector de entorno → `Default` → ⚙ → **Acceso a la red** → "Dominios permitidos". `github.com` puede estar bloqueado además por otra regla: una corrida recibió *"sessions are bound to their configured repositories"*, que es un límite de la API de GitHub para la sesión y no del proxy.

Hosts que no estaban en la lista y que la rutina necesitó, para sumar en el mismo lugar:

```text
www.infoq.com
hn.algolia.com
research.google
openjdk.org
access.redhat.com
```

Con eso, los días con poca actividad (sábados, domingos y lunes) tienen más chances de encontrar una fuente primaria. Que no haya nota sigue siendo un resultado válido.

## Secreto

El valor de `BLOG_PUBLISH_SECRET` está escrito en el texto de la rutina (bloque `ROUTINE SETUP`), igual que en las rutinas de AI Daily. Por eso aparece en el historial de cada corrida: la rutina hace `export BLOG_PUBLISH_SECRET='…'` en sus comandos y eso queda en el log. Cómo rotarlo y qué tocar: [`../ops/secrets-rotation.md`](../ops/secrets-rotation.md).

## Historial de este documento

- 2026-11-13 (v1.8.5): alta de la rutina, deshabilitada, con `VALIDATION MODE: ON` y el secreto pendiente.
- 2026-11-14: se cargó el secreto, se sacó el modo de validación y se habilitó. La rutina figura actualizada a las 02:29:08 UTC y corrió 10 segundos después (13/11, 23:29 en Buenos Aires); esa primera corrida publicó la nota del 13/11.
- 2026-11-20 (v1.8.8): estado actual, corridas y faltantes de red.
