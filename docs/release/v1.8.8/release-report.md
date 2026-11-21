# Promptea v1.8.8: reporte de release

Fecha: 2026-11-20, actualizado el 2026-11-21 después del merge. Base: `main` @ `e5a9cfe` (v1.8.7, en producción desde el 16/11). Una rama y un PR por tema.

**21/11:** con tu OK mergeé los 8 PRs (#50 a #57) en `main`, borré las 31 ramas viejas que pediste y apliqué el prompt nuevo a la tarea de tweets. Además, implementé las noticias en chino (#57), como pediste. **No toqué** secretos, variables de Vercel, rutinas de claude.ai, Firewall ni datos de Firestore. Lo que falta de tu lado está en §10.

## 0. Resumen (estado al 21/11)

| Punto | Qué se hizo | Estado | Qué necesito de vos |
| --- | --- | --- | --- |
| 1a. Ramas mergeadas | 31 ramas verificadas (Apéndice A) | **Borradas** el 21/11 | Nada. Quedan las 14 de afuera del patrón, que no toqué |
| 1b. Doc de la rutina Tech | Activa desde el 14/11, corridas y faltantes de red (#55) | En `main` | Revisar la red del entorno `Default` |
| 1c. Salud de rutinas y alerta | Endpoint, cron diario y mail; direcciones de prueba fuera (#50) | En `main` | `CRON_SECRET` y `ROUTINE_ALERT_TO` en Vercel (§10) |
| 1d. firebase-admin 14 | De 18 avisos de audit a 0; prueba de Firestore 5/5 (#51) | En `main` | Nada |
| 1e. Investigación | Tech: 3 días vacíos válidos. Newsletter: el envío lo bloqueó el clasificador de permisos (#55) | En `main` | Revisar el modo de permisos de la rutina del newsletter |
| 1f. Secretos | Instructivo, script de verificación y prompts nuevos con el secreto en una sola línea (#55, #57) | Listo para rotar | **Rotarlos** (§10) |
| 1g. Revisión nativa pt y zh | Paquetes al día, con portada en el idioma de quien revisa (#53) | En `main` | Conseguir revisores |
| 2. Chino | QA: 0 fallas, 0 enlaces rotos, `seo:check` OK; 1 arreglo (#53) | En `main` | — |
| 3. Chino en noticias | **Implementado** (#57): cada nota nueva también en chino | En `main`; empieza a publicarse cuando pegues los prompts nuevos | Pegar los prompts al rotar (§10) |
| 4. Analytics | 7 y 30 días, antes/después de v1.8.6; tweets con UTM (#54) | En `main`; **tarea de tweets actualizada** | — |
| 5. Singapur | Tráfico automatizado de centros de datos (Tencent Cloud) desde el 11/11 | Informe | Opcional: regla de Firewall |
| 6. Modelos e ideas | Kimi K3.1 Pro (#52); GPT-Image-2.6 verificado, no agregado; 3 ideas | En `main` | Priorizar ideas |

## 1. Pendientes arrastrados

### 1a. Ramas remotas mergeadas

Verifiqué cada rama de tres maneras:
- el PR que la usó figura `MERGED` en GitHub;
- **la punta de la rama es el mismo commit que se mergeó** (`headRefOid` = punta actual, así que no quedó nada sin mergear);
- el commit de squash está en `main`.

Las 31 del pedido (`claude/*`, `v1.8.x-qa` y `chore/weekly-update-*`, incluida `claude/magical-moore-a44aba`) cumplen las tres. `claude/magical-moore-a44aba` (#38, v1.8.2) es la que generaba los 12 previews fallidos.

Fuera del patrón pedido, pero también mergeadas: `v1.8.3-tech` (#40), 9 `feat/*`, `fix/v1.1.2-ux-a11y-polish`, `v1.1`, `v1.1.1` y `vercel/vercel-web-analytics-to-nextjs-4qt9pn`. Las listo por si querés limpiarlas también.

**Borradas el 21/11, con tu OK:** las 31, después de volver a verificar que cada una seguía en el commit mergeado. Las ramas `claude/v188-*` se borraron al mergear sus PRs. Para restaurar cualquiera: `git push origin <sha>:refs/heads/<rama>` (los SHA están en el Apéndice A).

### 1b. `tech-daily-routine-status.md` (#55)

Ahora dice que la rutina está activa desde el 14/11, con las corridas del 13 al 19/11. Las fuentes siguen bloqueadas por el proxy del entorno: `github.com`, `www.cisa.gov` y `www.theregister.com` dan 403 aunque estaban en la lista, así que la lista no se cargó o se cargó a medias. Suma 5 hosts nuevos.

### 1c. Salud de rutinas y alerta (#50)

- `GET /api/internal/routines/health` (solo lectura): última salida de daily, morning, tech, weekly y newsletter, corridas sin resultado y si alguna está atrasada.
- Cron de Vercel a las 16:00 UTC: si algo pasó su ventana, **un mail por día** a `ROUTINE_ALERT_TO`.
- Ventanas y criterio en el README ("Routine health and alert"). Los dos incidentes reales (Tech 14–16/11 y newsletter 26/10) están como tests.
- **Las 3 direcciones de prueba** (dos `*.test` y el buzón de QA `test-qa-v150@promptea.me`) se excluyen del envío (`counts.excluded`) y el formulario las rechaza. El script `scripts/newsletter/exclude-test-subscribers.mjs` las marca como dadas de baja en Firestore. No lo corrí contra producción: no tengo credenciales locales y además es un cambio de datos. El envío ya las saltea aunque no lo corras.

### 1d. firebase-admin 14 (#51, mergeado el 21/11)

- `npm audit --omit=dev`: de **18 avisos (3 críticos, 5 altos) a 0**. Además de firebase-admin 14.5.1, actualicé `@fastify/busboy` y `source-map-js` dentro de su rango, sin `npm audit fix`.
- **Prueba de Firestore** contra el emulador (`npm run test:firestore`): 5/5 con 13.6.0 y 5/5 con 14.5.1. Cubre todas las operaciones que usa el sitio.
- Node: la 14 pide 22 o más, y Vercel usa 24.x.
- Aviso nuevo y sin efecto en los logs: `credentials option is deprecated`, de `google-auth-library`.

### 1e. AI Daily Tech y Resend: qué pasó (#55, `docs/ops/routine-incidents-2026-11.md`)

**AI Daily Tech** tiene 4 notas, no una (13, 17, 18 y 19/11). Los días 14, 15 y 16 terminaron en `NO_ELIGIBLE_STORY`, que es correcto; por eso en esos días se veía solo la nota del 13/11.

**Newsletter del 26/10, 2/11 y 9/11:**
- en las tres corridas, `dry_run` y `publish` salieron bien (la edición está en el sitio);
- el paso `live` lo **denegó el clasificador de permisos del modo automático de la propia rutina** ("Real-World Transactions") antes de salir, así que no se mandó ningún mail;
- la rutina avisó por notificación push cada lunes;
- Resend coincide: los únicos envíos de Promptea Weekly en la cuenta son los del 16/11.

El 16/11, con el mismo prompt, no hubo chequeo y salió bien. **Por qué cambió no lo puedo confirmar:** la rutina no se tocó desde el 09/10. Esas ediciones no se pueden mandar tarde: el endpoint solo acepta `live` para la semana en curso.

### 1f. Secretos (#55, `docs/ops/secrets-rotation.md`)

- **Instructivo paso a paso:** franja sin corridas, Vercel (panel o CLI, con redeploy desde el panel), las 4 rutinas que tienen el valor escrito (`BLOG_PUBLISH_SECRET` aparece 5 veces en 3 rutinas y `NEWSLETTER_SEND_SECRET` 2 veces en 1), verificación y limpieza.
- **`scripts/ops/verify-secrets.mjs`** comprueba que el valor coincide con Vercel **sin publicar nada**. Lo probé con valores al azar: responde `MISMATCH`, como corresponde.
- **Por qué es urgente:** los valores no solo están en el texto de las rutinas, también quedan en el historial de cada corrida, porque las rutinas los usan en comandos. Los vi al leer los historiales para la investigación; no los copié en ningún lado.

### 1g. Revisión nativa (#53)

`docs/i18n/pt-review.md` y `zh-review.md` empiezan ahora con una portada en portugués y en chino simplificado: qué es Promptea, qué hacer y cómo devolver las correcciones. Tienen el estado al 20/11, contexto de tráfico y dudas nuevas para zh: "AI Daily" o "AI日报", "个词" o "个字".

## 2. Chino (`/zh`) (#53)

| Qué | Resultado |
| --- | --- |
| Interfaz | `zh.json` con 538 claves, las mismas que es/en/pt. Solo 12 iguales al inglés, todas nombres de marca, más el placeholder del email, que se arregló. Sin puntuación de medio ancho ni restos de español o portugués. A mano se lee natural |
| Motor 2.5.0 | 24 casos de calibración en chino; `engine-qa` **104/104**: el prompt chino puntúa igual desde las 4 interfaces |
| Guías | **13 de 64** con texto propio. Las otras 51 en inglés, con aviso, canonical al inglés y fuera del hreflang y del sitemap de zh |
| `i18n-qa` (Chrome real) | 66 cargas, **0 fallas** (`logs/i18n-qa-zh.txt`) |
| Barrido de las 72 URLs `/zh` | `lang="zh-CN"`, canonical y título con chino; **407 enlaces internos, 0 rotos** (`logs/zh-sweep.txt`) |
| `seo:check` | local **1.379/1.379**; producción **1.359/1.359** |
| Metadatos (a mano) | `og:locale` `zh_CN`, `inLanguage` `zh-CN`, hreflang `zh-Hans`/`zh-CN`/`zh` en las páginas traducidas; las no traducidas en `en_US` y con canonical al inglés |

**Arreglado:** el placeholder del email de la newsletter (`your@email.com` → `name@example.com`). **Visto, sin arreglar porque no es de traducción:** nombres de Benchmarks como "Claude Opus 5.5 (Max, Default Fallback)" vienen así de la fuente y se ven igual en todos los idiomas.

## 3. Chino en la sección de noticias (#57)

Elegiste que las noticias salgan en chino igual que en español e inglés. Así quedó:

- **El contrato:**
  - cada nota puede traer `locales.zh`, con los mismos campos que en y es;
  - el servidor verifica que sea la misma nota (igual cantidad de *takeaways* y de *why it matters*) y que esté en chino;
  - es **opcional para el servidor** a propósito: las rutinas lo escriben siempre, pero si el chino no valida, sacan esa parte y publican igual en es/en, así que el chino nunca hace perder la nota.
- **Bajo `/zh`:**
  - una nota con chino tiene su propia página: canonical propio, `zh_CN`, `inLanguage` `zh-CN`, hreflang es/en/zh, sitemap, gemelo `.md` e imagen OG (con título en inglés, porque `next/og` no tiene fuente CJK);
  - las notas anteriores al 21/11 se siguen viendo en inglés con un aviso, que ahora dice que esas en particular no tienen versión china;
  - `/zh/blog` y `/zh/blog/tech` pasan a ser índices propios en cuanto tienen una nota en chino, y la home y la marquesina marcan el idioma nota por nota.
- **Lo que no cambia:** el resumen semanal y el newsletter siguen en es/en, y `/pt` sigue leyendo en inglés.
- **Las rutinas:**
  - los prompts nuevos de AI Daily (noche y mañana) y AI Daily Tech están en [`docs/editorial/routines/`](../../editorial/routines/), con un bloque de chino que usa el glosario `docs/i18n/zh-glossary.md`;
  - **empiezan a escribir en chino cuando pegues esos prompts** en las rutinas, cosa que se hace junto con la rotación de secretos (§10). Hasta entonces publican en es/en, como hoy.
- **Verificación:**
  - en el servidor de desarrollo, con una nota de prueba en chino, revisé a mano la página, el canonical, el hreflang, el sitemap, el `.md` y la imagen OG;
  - `seo:check` sobre el build de producción: **1.384/1.384**;
  - `seo:check` con la nota china de prueba: **1.093/1.093**.

La propuesta y las opciones que se evaluaron el 20/11 están en [`zh-news-proposal.md`](./zh-news-proposal.md).

## 4. Analytics

Detalle y tablas en [`analytics-singapore.md`](./analytics-singapore.md).

**Volumen, sin Singapur:**
- 7 días: **405 visitantes (+89 %)**;
- 6 días después de la v1.8.6 contra 6 días antes: **+39 %**;
- 30 días: **1.122 (+55 %)**.

**Con Singapur** los números se ven el doble de grandes (913 y 1.697): es tráfico automatizado.

**Referrers:** Google duplicó las visitas en la semana (117 contra 57) e Instagram es el segundo referrer (32). X casi no aparece.

**Eventos (desde el 14/11):**
- unos 25 de ~405 visitantes reales analizan un prompt (≈6 %);
- 8 copian una plantilla;
- 4 copian el prompt optimizado.

**Tweets:** el alcance se mide ahora con UTM (#54).
- `utm_campaign=tweets-<lunes>` y `utm_content` por tipo: `tip`, `model-choice`, `ai-daily`, `benchmarks`, `feature` o `rough-idea`.
- El prompt nuevo de la tarea dominical está en `docs/social/weekly-tweets-routine.md`: 2 o 3 tweets por semana con contenido fechado y todos los enlaces con UTM.
- **Aplicado a la tarea `promptea-weekly-tweets` el 21/11**, con tu OK. Corre el domingo 22/11 a las 10:00: la primera campaña medible es `tweets-2026-11-23`.

## 5. Singapur

Detalle en [`analytics-singapore.md`](./analytics-singapore.md) §3.

**Confirmado con datos:**
- **Cuándo empezó:** el 11/11. Pasó de 0–4 visitantes por día a 27, y a 63–97 desde el 14/11.
- **Desde dónde:** casi todo desde centros de datos. Tencent Cloud (AS132203) suma 21.708 pedidos del 11 al 20/11, seguido por AWS, Huawei Cloud y Alibaba; el primer proveedor residencial tiene 24.
- **Cómo se ve:** user-agents de "Chrome en Windows" con 10 versiones distintas (de 103 a 146), 100 % escritorio, sin referrer, 0 eventos, 95–96 % de rebote y visitas repartidas en las 24 horas.
- **Qué lee:** recorre todas las secciones en inglés con volumen parejo, incluidas privacidad y changelog. Solo 3 visitas a `/zh`.

**Conclusión:**
- Es tráfico automatizado que ejecuta JavaScript, no personas.
- **No lo causó** el SEO para Asia de la v1.8.6 (14/11) ni el chino (16/11): empezó antes y lee en inglés.
- **No viene** de un post ni de un enlace: no tiene ningún referrer.

**Hipótesis (sin confirmar):** un rastreador de datos para IA o una herramienta de SEO o monitoreo que encontró el sitemap o `llms.txt`. El 11/11 coincide con el deploy de la v1.8.2 (portugués), pero es solo una coincidencia de fechas.

## 6. Features nuevas

### Modelos (#52)

- **Kimi K3.1 Pro:** confirmado en la documentación de Moonshot y agregado como Kimi por defecto; Kimi K3 pasa a legacy.
- **GPT-Image-2.6 Sunburst y Flare:** confirmados por OpenAI (04/11) como dos modelos distintos. No los agregué: el registro no tiene destino de imagen. Ver [`models-verification.md`](./models-verification.md).
- **De paso, la verificación encontró:**
  - `kimi-k2.6` y `kimi-k2.7-code` están cerrados a usuarios nuevos y se dan de baja a fines de diciembre;
  - OpenAI lista GPT-6.2 Astra, GPT-6.2 Sol y GPT-6.1 Terra, que no están en el registro.

  Ninguno de los dos cambios se hizo; queda para una pasada propia.

### Ideas, apoyadas en Analytics

**1. Que las guías lleven al analizador (prioridad alta)**
- **Problema:** las guías son la puerta de entrada número uno; `chatgpt-prompts-for-work` es la página más vista de la semana. Pero solo 8 visitantes copiaron una plantilla y unos 25 analizaron un prompt sobre ~405 reales. El rebote sin Singapur sigue alto.
- **Alcance:**
  - un botón "Analizar esta plantilla" en cada bloque de plantilla, que abre `/analyzer` con la plantilla precargada (el analizador ya acepta un prompt por URL);
  - un evento nuevo, `Template Analyzed {lang, source}`;
  - medir la tasa de plantilla a análisis por guía.
- **Esfuerzo:** chico.

**2. Medir la newsletter donde se decide (prioridad media)**
- **Problema:** AI Daily es la segunda sección en tráfico (`/en/blog` 120 visitantes en 4 días), pero la newsletter tiene 5 suscriptores reales y Vercel no registra ninguna suscripción como evento. No se sabe qué lugar convierte: la tarjeta a los 5 s, el formulario del blog o el del inicio.
- **Alcance:**
  - un evento `Newsletter Subscribed {lang, source}`, con `source` igual a card, blog o home;
  - un bloque de suscripción al final de cada nota de AI Daily;
  - leer la conversión por fuente durante 4 semanas.
- **Esfuerzo:** chico.

**3. Analytics sin bots (prioridad media)**
- **Problema:** Singapur es el 34 % de los visitantes de 30 días y el 56 % de los de 7 días. Eso distorsiona el rebote, las páginas top y cualquier decisión de contenido o SEO.
- **Alcance:**
  - en el Firewall, una regla de *challenge* para los ASN 132203, 136907 y 45102 cuando el país es Singapur, primero en modo *log* durante una semana;
  - una vista guardada de Analytics sin Singapur;
  - en el reporte semanal (Iris), leer siempre los números "sin bots".
- **Esfuerzo:** chico. Es configuración de producción y la decisión es tuya.

Hay una cuarta idea, que viene de la verificación de modelos y no de Analytics: **un destino de imagen** (GPT-Image-2.6, Nano Banana, Midjourney) para que los prompts de imagen tengan modelos y perfiles propios. **Esfuerzo:** mediano.

## 7. PRs (todos mergeados el 21/11, en este orden)

| PR | Tema | Commit en `main` |
| --- | --- | --- |
| lkl03/promptea#50 | Salud de rutinas, alerta y direcciones de prueba | `9e49669` |
| lkl03/promptea#51 | firebase-admin 14 con prueba de Firestore | `313a698` |
| lkl03/promptea#52 | Kimi K3.1 Pro y verificación de GPT-Image-2.6 | `9cd5351` |
| lkl03/promptea#53 | QA de chino, arreglo seguro, paquetes pt y zh | `fcc15cc` |
| lkl03/promptea#54 | UTM para los tweets y prompt nuevo de la tarea | `93e0f6f` |
| lkl03/promptea#55 | Rutina Tech, incidentes y rotación de secretos | `6d992b7` |
| lkl03/promptea#57 | AI Daily en chino | `e23f616` |
| lkl03/promptea#56 | Versión 1.8.8, changelog y este reporte | ver GitHub |

El único choque fue un import en `lib/blog/server.ts` entre #50 y #57, resuelto al rebasear #57. La release se rebaseó al final sobre todo lo anterior.

## 8. Tests y QA

| Qué | Dónde | Resultado |
| --- | --- | --- |
| `npm test` | `main` | 89 archivos, 2.002 tests, verde |
| | #50 | 91 archivos, **2.030** tests (+28), verde |
| | #51 | 2.002 tests y 5 omitidos (emulador), verde |
| | #52 | 2.002, verde |
| | #53 | 89 archivos, 2.002, verde |
| | #54 | 90 archivos, **2.009** (+7), verde |
| | #57 | 94 archivos, **2.056** (+5 omitidos del emulador), verde |
| | `main` final (v1.8.8) | 94 archivos, **2.056** (+5 omitidos), verde; Firestore (emulador) 5/5 con 14.5.1 |
| Typecheck y lint | #50, #51, #52, #54, #55 y #57 | 0 errores |
| Build de producción | `main` (QA de zh) y #51, en local | OK |
| Build de Vercel (preview) | los 7 PRs, incluido #51 con Node 24 | **pass** en todos |
| Prueba de Firestore (emulador) | 13.6.0 y 14.5.1 | 5/5 y 5/5 |
| `npm audit --omit=dev` | `main` contra #51 | 18 contra **0** |
| `seo:check` | producción (v1.8.7), build local de `main`, build de #57 y #57 con nota china de prueba | 1.359/1.359, 1.379/1.379, 1.384/1.384 y **1.093/1.093** |
| `i18n-qa` zh, barrido `/zh` y `engine-qa` | build local de `main` | 0 fallas, 0 enlaces rotos y 104/104 |

Logs en [`logs/`](./logs/).

**No verificado:**
- el cron y el mail de alerta en producción (necesitan las variables y un deploy);
- firebase-admin 14 contra el Firestore real (no tengo credenciales locales);
- el preview de Vercel de cada PR por dentro: el build pasa, pero las páginas están protegidas y no las recorrí;
- un envío real del newsletter con la exclusión.

## 9. Qué se escribió afuera del repo

- **GitHub:**
  - PRs #50 a #57, mergeados con squash en `main` el 21/11;
  - 32 ramas borradas: las 31 viejas más `claude/v188-routine-health`, que ya estaba mergeada; las otras `claude/v188-*` se borraron al mergear.
- **Vercel:** cada merge a `main` dispara un deploy de producción, el de la v1.8.8 incluido. No cambié variables ni configuración.
- **Tarea programada local** `promptea-weekly-tweets`: prompt y descripción actualizados con tu OK. El prompt anterior queda al final de `docs/social/weekly-tweets-routine.md`.
- **Producción:** solo lectura, más dos POST con firmas al azar (rechazados con 401) para probar `verify-secrets.mjs`.
- **Lectura sin cambios:** rutinas de claude.ai/code (lista, corridas y logs), Resend, Vercel (proyecto, Analytics y Firewall).
- **No tocado:** los secretos, las 4 rutinas de claude.ai, el Firewall y Firestore.
- **Local:**
  - `npm ci` en `D:\Claude\promptea`;
  - dos worktrees, `D:\Claude\promptea-v188` y `D:\Claude\promptea-fa14`, que se pueden borrar.

## 10. Qué necesito de vos, en orden

1. **Rotar los secretos y pegar los prompts nuevos** (pasos abajo, unos 20 minutos). Con esto las noticias empiezan a salir en chino y los valores viejos dejan de servir.
2. **En Vercel**, en la misma pasada: `CRON_SECRET` (nuevo) y `ROUTINE_ALERT_TO` (tu mail) para la alerta diaria.
3. **Red del entorno `Default`:** cargar los hosts de la lista de Tech y los 5 nuevos (`docs/editorial/tech-daily-routine-status.md`).
4. **Revisar si la rutina del newsletter tiene un modo de permisos** configurable.
5. **Conseguir revisores nativos** para pt y zh. Para zh, conviene que lean también una o dos notas de AI Daily por semana.
6. **Opcional:**
   - correr `exclude-test-subscribers.mjs` con `--apply`;
   - decidir la regla de Firewall para Singapur;
   - borrar las 14 ramas de afuera del patrón.

### Rotación de secretos y prompts nuevos, paso a paso

Hacelo en una franja sin corridas: de 16:00 a 22:00 UTC (13:00 a 19:00 ART), cualquier día que no sea lunes.

1. **Generá tres valores nuevos**, uno para cada uno de `BLOG_PUBLISH_SECRET`, `NEWSLETTER_SEND_SECRET` y `CRON_SECRET`, corriendo tres veces:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   Guardalos en tu gestor de contraseñas.
2. **Vercel** → promptea → Settings → Environment Variables (Production, tipo Sensitive):
   - editá `BLOG_PUBLISH_SECRET` y `NEWSLETTER_SEND_SECRET` con los valores nuevos;
   - agregá `CRON_SECRET` y `ROUTINE_ALERT_TO` (tu mail).
3. **Deployments** → el último de Production → ⋯ → **Redeploy**. Esperá a que diga *Ready*.
4. **Verificá** desde la carpeta del repo:
   - armá un archivo `.env.rotation` con las líneas `BLOG_PUBLISH_SECRET=…` y `NEWSLETTER_SEND_SECRET=…`;
   - corré `node --env-file=.env.rotation scripts/ops/verify-secrets.mjs`. Tiene que decir `OK` en los dos.
5. **Rutinas** (claude.ai/code/routines). En cada una de las 4:
   - **Editar instrucciones**, seleccionar todo y pegar el archivo correspondiente de `docs/editorial/routines/` (en GitHub, botón Raw);
   - reemplazar `PASTE_BLOG_PUBLISH_SECRET_HERE` (o `PASTE_NEWSLETTER_SEND_SECRET_HERE` en el newsletter) por el valor nuevo;
   - **Guardar**.
6. **Comprobá la salud de rutinas:**
   `curl -H "Authorization: Bearer <CRON_SECRET>" https://www.promptea.me/api/internal/routines/health`
   Tiene que devolver las 5 rutinas.
7. **Limpieza:** borrá `.env.rotation` y actualizá el `.env.local` de tus copias del repo.

## Apéndice A: ramas remotas mergeadas

**Del pedido (31).** En todas, la punta es el commit que mergeó su PR, y el squash está en `main`:

| Rama | SHA | PR |
| --- | --- | --- |
| chore/weekly-update-v1.1.4 | 4f43f2e | #6 |
| chore/weekly-update-v1.1.5 | 6e1cf68 | #7 |
| chore/weekly-update-v1.1.6 | 5c5d515 | #8 |
| chore/weekly-update-v1.2.1 | 4a9648c | #10 |
| chore/weekly-update-v1.2.2 | 4c56888 | #11 |
| chore/weekly-update-v1.2.3 | 2c0b9e5 | #12 |
| chore/weekly-update-v1.3.2 | f61c53d | #14 |
| chore/weekly-update-v1.4.3 | e6fe4b9 | #18 |
| chore/weekly-update-v1.4.4 | 3e155eb | #19 |
| chore/weekly-update-v1.4.5 | 6a770b5 | #20 |
| chore/weekly-update-v1.4.6 | eb1ab8a | #21 |
| chore/weekly-update-v1.4.7 | a0c9b5c | #22 |
| chore/weekly-update-v1.5.2 | 3bbd94b | #25 |
| chore/weekly-update-v1.5.3 | 16d9f67 | #26 |
| chore/weekly-update-v1.6.1 | eb262c6 | #28 |
| chore/weekly-update-v1.6.2 | aca6a99 | #29 |
| chore/weekly-update-v1.7.1 | 4813806 | #31 |
| chore/weekly-update-v1.7.2 | 427d122 | #32 |
| chore/weekly-update-v1.7.3 | c86258c | #33 |
| claude/competent-galileo-835d71 | c43f5c0 | #36 |
| claude/confident-ishizaka-ab9432 | 3228cd6 | #46 |
| claude/laughing-davinci-e4ce9e | 43682de | #35 |
| claude/magical-moore-a44aba | 6030c87 | #38 (la de los previews fallidos) |
| claude/peaceful-wright-8296a2 | fe277af | #34 |
| claude/practical-blackburn-5b64d0 | 16063fb | #44 |
| claude/seo-us-asia-v186 | c18aaba | #47 |
| claude/stoic-greider-4d1132 | 555608c | #37 |
| claude/v1-8-5-gsc-bing-pt-ef92fc | a52839a | #45 |
| claude/zealous-newton-tsgw6y | 1659aba | #5 |
| v1.8.3-qa | cbeff83 | #39 |
| v1.8.4-qa | c3ed562 | #42 |

**Fuera del patrón, también mergeadas (14):**
- `v1.8.3-tech` (45e709d, #40);
- `feat/ai-daily-blog` (#15), `feat/ai-daily-filters-cadence` (#16), `feat/blog-editorial-redesign` (#17), `feat/promptea-v1.3.0` (#13), `feat/v1.1.3-adaptive-groq-models` (#4), `feat/v1.2.0-redesign-adaptive-refiner` (#9), `feat/v1.5.0-newsletter-ai-daily` (#23), `feat/v1.6.0-models-images-weekly` (#27) y `feat/v1.7.0-hub-benchmarks-glass` (#30);
- `fix/v1.1.2-ux-a11y-polish` (#3);
- `v1.1` (88241fa, sin PR, contenida en `main`) y `v1.1.1` (#2);
- `vercel/vercel-web-analytics-to-nextjs-4qt9pn` (#1).

Detalle en [`logs/branches.txt`](./logs/branches.txt).
