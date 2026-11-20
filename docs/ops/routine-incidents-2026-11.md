# Rutinas en noviembre de 2026: qué pasó con el newsletter y con AI Daily Tech

Investigado el 2026-11-20 (v1.8.8) con acceso de solo lectura:
- **claude.ai/code**: `RemoteTrigger list`, `list_runs` y `get_run_log` de cada corrida;
- **Resend**: `list-emails` y `list-broadcasts` de la cuenta;
- **producción**: curl a `/blog/tech` y a los feeds.

No se modificó ninguna rutina ni se mandó ningún mail. Este documento no tiene secretos ni direcciones de suscriptores.

## 1. Promptea Weekly sin envío el 26/10, el 2/11 y el 9/11

**Confirmado con el historial de corridas.** Las tres corridas de lunes hicieron lo mismo:

| Paso | 26/10 | 2/11 | 9/11 |
| --- | --- | --- | --- |
| `dry_run` | `DRY_RUN_OK`, 5 suscriptores (4 en, 1 es) | `DRY_RUN_OK`, 5 suscriptores | `DRY_RUN_OK`, 5 suscriptores |
| `publish` | `PUBLISHED` (`/es/blog/weekly/2026-10-26`) | `PUBLISHED` (`/es/blog/weekly/2026-11-02`) | `PUBLISHED` (`/es/blog/weekly/2026-11-09`) |
| `live` | **denegado antes de salir** | **denegado** | **denegado** |
| Informe de la rutina | `LIVE_BLOCKED_BY_PERMISSIONS` | `PUBLISHED_LIVE_BLOCKED` | `BLOCKED_AUTOMATION_PERMISSION` |

El paso `live` no llegó al servidor. Lo frenó el **clasificador de permisos del modo automático de Claude Code**, dentro de la sesión de la rutina, con el motivo *"Real-World Transactions"*: mandar mails a personas reales. El log muestra `permission_denied Bash [classifier]` en los tres casos. La rutina no intentó saltear el bloqueo, informó el problema y **mandó una notificación push** cada uno de esos lunes ("needs your OK to send").

Por eso:
- las tres ediciones están publicadas en el sitio (`/blog/weekly`), pero **ningún suscriptor las recibió**;
- en Resend no hay envíos de Promptea Weekly antes del 16/11. La cuenta, que comparte nodo, lista 28 mails desde el 23/10, y los únicos de Promptea son los del 16/11.

**El 16/11 sí salió.** Con el mismo prompt (la rutina no se modifica desde el 09/10), el log no tiene eventos de chequeo de permisos y el paso `live` devolvió `SENT`: 8 de 8 suscriptores más 1 copia canario. Por qué el clasificador no intervino el 16/11 **no lo puedo confirmar**: la rutina no cambió, así que el cambio vino del lado de la plataforma o de su configuración. Puede volver a pasar.

**Lo que conviene que mires vos:**
1. En el celular, las notificaciones de Claude del 26/10, el 2/11 y el 9/11 alrededor de las 09:05 ART: avisaban del bloqueo.
2. En claude.ai/code/routines → *Promptea Weekly newsletter* → configuración, si hay un modo de permisos para la rutina. No pude ver esa pantalla.
3. Con la salud de rutinas (lkl03/promptea#50), un lunes sin envío dispara un mail el mismo día a las 13:00 ART.

**Las tres ediciones perdidas no se pueden mandar tarde con el endpoint:** `live` solo acepta la semana en curso (`date_not_allowed`). Siguen publicadas en el sitio. Si querés recuperarlas, lo más simple es mencionarlas en la próxima edición; no hice nada al respecto.

**Además, en el envío del 16/11 rebotaron 3 de los 8 destinatarios:** dos direcciones `*.test` y un buzón de QA en promptea.me, que quedaron de pruebas viejas. Los rebotes le restan reputación al dominio en Resend. Desde lkl03/promptea#50 el envío las excluye y el formulario las rechaza. Hay además un script para marcarlas como dadas de baja en Firestore (`scripts/newsletter/exclude-test-subscribers.mjs`); corre en simulación salvo que le pases `--apply`.

## 2. AI Daily Tech "con una sola nota"

**No es así hoy.** En producción hay 4 notas (13, 17, 18 y 19/11), verificadas con curl en `/en/blog/tech`, `/es/blog/tech` y el feed. Corrida por corrida:

| Fecha (ART) | Resultado |
| --- | --- |
| 13/11 23:29 (manual) | `PUBLISHED`: Cloudflare Spend Management |
| 14/11 | `NO_ELIGIBLE_STORY` |
| 15/11 | `NO_ELIGIBLE_STORY` |
| 16/11 | `NO_ELIGIBLE_STORY` |
| 17/11 | `PUBLISHED`: defaults nuevos de Cloudflare Workers |
| 18/11 | `PUBLISHED`: Workers VPC con CA propia y mTLS |
| 19/11 | `PUBLISHED`: PostgreSQL 19 |

Del 14 al 16 (sábado, domingo y lunes) la rutina no encontró ninguna fuente primaria con una novedad del día que cumpliera las reglas, y en ese caso no publicar es lo correcto. Durante esos días, la sección mostró solo la nota del 13/11.

Lo que sí le resta material: **varias fuentes siguen bloqueadas por la red del entorno**.
- `github.com` (releases de Next.js, React y MCP), `www.cisa.gov` y `www.theregister.com` dan 403, aunque estaban en la lista de dominios a habilitar.
- `www.infoq.com`, `hn.algolia.com`, `research.google`, `openjdk.org` y `access.redhat.com` no estaban en la lista.

Detalle y pasos: [`../editorial/tech-daily-routine-status.md`](../editorial/tech-daily-routine-status.md).

## 3. Lo que queda escrito en los historiales

Tanto la rutina Tech como la del newsletter usan el secreto en comandos que quedan en el log de cada corrida. Esto no causó los incidentes, pero hace urgente la rotación: [`secrets-rotation.md`](./secrets-rotation.md).
