# Promptea v1.8.5 — los pendientes del dueño después de la v1.8.4

Fecha: 2026-11-13 · Rama: `claude/practical-blackburn-5b64d0` · Base: `main` @ `ffbdfbf` (v1.8.4 + Next 16.4.6, #43).

La v1.8.4 cerró con una lista "Qué falta de tu lado" ([`../v1.8.4/qa-report.md`](../v1.8.4/qa-report.md), sección 7). El dueño autorizó ejecutar esos pendientes. Este informe dice, paso por paso, qué se hizo, qué se verificó de verdad, qué queda para el dueño y por qué. Logs en [`logs/`](./logs), capturas en [`shots/`](./shots).

## Resumen

| Paso | Estado |
| --- | --- |
| 1. Next 16.1.1 → 16.4.6 | **Hecho y en producción** (#43, squash `ffbdfbf`) |
| 2. Rutina "Promptea AI Daily Tech" | **Creada, deshabilitada.** Falta del dueño: dominios de red, secreto y una corrida de validación |
| 3. Contraste del primario de Aqua | **Hecho** (`#0061cc`). Hallazgo nuevo en Metro y Glass claro (N-1), para decidir |
| 4. Las dos guías del PR #41 | **Hecho** (revisadas y corregidas antes de portarlas) |
| 5. `resend` 6.x | **Hecho** (6.38.0). Falta del dueño: un envío de prueba |
| 6. Search Console, Bing, Rich Results, revisión del pt | Rich Results **hecho** (un error real corregido). Search Console y Bing **necesitan al dueño** (no hay propiedad). Paquete del pt **listo** |
| 7. Release 1.8.5 | Este PR |

## Paso 1 — Next 16.4.6

Detalle completo en [`next-16.4.6.md`](./next-16.4.6.md). En corto:

- **Antes de instalar**: `latest` = 16.4.6 (2026-11-09), no hay un 16.4.x más nuevo; publicada por GitHub Actions como *trusted publisher* (igual que todas desde 16.2.x) con proveniencia SLSA a `vercel/next.js@v16.4.6`; sin scripts de instalación; mismas dependencias que 16.4.5. Notas de 16.2/16.3/16.4 y avisos de seguridad leídos.
- **Instalación**: diff del lockfile revisado, ningún paquete nuevo con script de instalación; `npm audit signatures` verifica todo. `next` desaparece de `npm audit` (tenía 41 avisos, 4 críticos).
- **Lo que movió el salto**: la fuente por defecto de `ImageResponse` (Geist en lugar de Noto Sans: las imágenes OG cambian de tipografía, no de diseño), cuatro `eslint-disable` justificados por una regla nueva de `react-hooks`, `agentRules: false` para que `next dev` no escriba `AGENTS.md`, y una entrada imposible del lockfile (`base64-js@1.5.2`) corregida.
- **Verificado**: lint, typecheck, 1.696 tests, build sin avisos, `seo:check` local 793/793, `qa-local` 57/57, `audit` 460 cargas sin hallazgos, `a11y-check` 77/77, `engine-qa` 64/64, `overflow` 0, JS propio −25 %. Preview de Vercel recorrido con el Chrome del dueño (37 rutas por GET y las páginas principales a la vista).
- **Producción después del merge**: sirve Next 16.4.6; páginas clave 200 en es/en/pt; `seo:check` contra producción **1.111/1.111** ([log](./logs/prod-after-next/seo-check-prod.txt)); 0 errores de runtime en Vercel en la hora siguiente. Deploy anterior para rollback, por si hiciera falta: `dpl_7YdaJeEgXkhe2Sj7KXzpcEdM6HEn`.

## Paso 2 — Rutina AI Daily Tech

Ficha, verificación y pasos: [`../../editorial/tech-daily-routine-status.md`](../../editorial/tech-daily-routine-status.md).

- **Hecho**: rutina `trig_016d8RWXCJbYzCYrzKKqfmAc`, `0 15 * * *` (12:00 en Buenos Aires), **deshabilitada**, con el modelo, el entorno (`Default`), el repositorio y las herramientas de `promptea-ai-daily` y `promptea-ai-daily-morning`, sin conectores. Instrucciones: el prompt de `tech-daily-routine.md` sin cambios, detrás de un bloque `ROUTINE SETUP`. El texto guardado coincide por SHA-256 con el generado desde el repo.
- **El secreto**: las hermanas llevan `BLOG_PUBLISH_SECRET` escrito en sus instrucciones; el entorno no tiene variables ni secretos. Copiarlo exigía escribir el valor, así que la rutina tiene el lugar marcado (`PASTE_BLOG_PUBLISH_SECRET_HERE`) para que lo pegue el dueño. Mientras siga así, la rutina no llama al endpoint.
- **Validación**: un bloque `VALIDATION MODE: ON` hace que la rutina solo mande `dryRun` (sin escribir) y, si no hay nota del día, que pruebe la firma con el payload de ejemplo. **No se corrió**: sin secreto el `dryRun` no puede firmarse.
- **Hallazgo — red**: el entorno `Default` permite 161 dominios; de las 118 fuentes Tech del registro solo 23 tienen su host permitido. Faltan **85 hosts** (Vercel, Cloudflare, GitHub, Next.js, React, Node.js…): sin ellos la rutina casi siempre terminaría en `RESEARCH_FAILED`. Lista para pegar: [`../../editorial/tech-routine-domains-to-allow.txt`](../../editorial/tech-routine-domains-to-allow.txt).
- **No se tocó ninguna otra rutina.** "Weekly Promptea update" sigue pausada (verificado con `get` al empezar).

## Paso 3 — Contraste del acento de Aqua

- **Hecho**: en Aqua `--accent` pasa de `#007aff` a `#0061cc` y `--accent-strong` (hover) de `#0061cc` a `#0052ad`. Al compartir el token, se arreglan juntos el botón primario (etiqueta blanca 5,86:1, antes 4,02:1), los enlaces y textos de acento (5,17:1 sobre el fondo, antes 3,54:1) y la info (`--info`). Tokens nuevos `--accent-ink` y `--info-ink` para el texto de los badges de 11 px (≥ 5,36:1 sobre su tinte en cualquier fondo de Aqua). Los tintes, el anillo de foco y la selección siguen en el azul de sistema; la muestra del selector de temas usa el acento nuevo. Metro y Glass no cambian.
- **Verificado**: test nuevo `a11y.accentContrast` (calcula los contrastes desde los tokens de `globals.css` y fija Metro y Glass); `a11y-check` **sin la excepción de Aqua**: 83/83 ([log](./logs/final/a11y-check.txt)); capturas antes/después en es/en/pt a 1440/768/375, hover y estado deshabilitado, más Metro y Glass de control: [`shots/before`](./shots/before), [`shots/after`](./shots/after).
- **N-1 (hallazgo nuevo, para decidir)**: `a11y-check` ahora también mide el badge y el enlace de acento del analizador, y eso destapa fallas **previas** en otros temas: Metro, texto de acento 3,54:1 y badge 2,96:1; Glass claro, badge 4,4:1. Arreglarlo cambia el azul de Metro o el verde de Glass (incluso el tono "strong" de Metro da 4,43:1 sobre su superficie), así que es decisión de identidad visual. Propuesta: usar el tono "strong" de cada tema para texto de acento y badges, y en Metro aclarar además su tinte. Quedan como "known" en `a11y-check`, solo para esos temas.

## Paso 4 — Las dos guías del PR #41

- **Hecho**: `ai-prompts-for-customer-feedback` y `ai-prompts-for-proposals`, es/en/pt, desde `23181558` (solo esas dos entradas de `guides.ts`; sin el bump ni el changelog del bot).
- **Revisión antes de portarlas**: sin estadísticas ni citas; los números que aparecen son ejemplos explícitos ("312 reseñas de octubre"); las afirmaciones sobre el analizador son ciertas (puntúa formato de salida y restricciones). Corregido: la guía de propuestas decía "flujo en cuatro prompts" y "guardá los cuatro prompts" con tres plantillas (ahora "cuatro pasos" y "estos prompts"), y el título en portugués mezclaba dos construcciones. Portugués consistente con el glosario (`template`, `você`, etiquetas XML en inglés como el resto de las guías pt).
- **Verificado**: páginas 200 en los 3 idiomas, gemelos `.md`, sitemap, `llms.txt` y `llms-full.txt`; plantillas con `buildPrefillHref` hacia `/{lang}/analyzer`; `seo:check` local 805/805.
- **Tope de `llms-full.txt`**: la parte fija sube unos 8 KB por idioma. En español, en producción, eso deja a AI Daily un presupuesto de 59,8 KB (antes 61,4 KB): las 6 notas que hoy entran (52,8 KB) siguen entrando y el total estimado (~401,6 KB) queda bajo el tope de 409.600 bytes, que el generador además garantiza recortando AI Daily. No hizo falta tocar el generador.

## Paso 5 — `resend`

- **Hecho**: 6.8.0 → **6.38.0** (2026-11-10, GitHub Actions con proveniencia, sin scripts de instalación). No se tomó 6.38.1: salió el mismo día, horas antes, y solo cambia el pipeline de publicación de su CI. Se van `svix` y su `uuid` vulnerable. La API que usa el mailer existe igual (verificado en los tipos: `idempotencyKey` y los cuatro nombres de error reintentables). Typecheck y los 142 tests del newsletter en verde. **No se envió ningún email.**
- **`npm audit --omit=dev` al final**: 18 avisos (3 críticos, 5 altos, 9 moderados, 1 bajo), **todos transitivos**: `fast-xml-parser`, `protobufjs`, `websocket-driver`, `@grpc/grpc-js`, `node-forge`, `form-data`, `@fastify/busboy`, `google-gax`, `uuid` y afines vienen de `firebase-admin` (el arreglo completo pide `firebase-admin` 14, mayor); `source-map-js` viene de `postcss`/Next. No se corrió `npm audit fix` (no estaba autorizado y `--omit=dev` rompe `lightningcss`). [Log](./logs/npm-audit-prod.json).
- **Del dueño — envío de prueba** (después del deploy de esta versión, para probar 6.38.0 en producción): ver "Pasos del dueño", punto 5.

## Paso 6 — Search Console, Bing, Rich Results y portugués

- **Rich Results Test** (contra producción, con el Chrome del dueño):

  | URL | Resultado |
  | --- | --- |
  | `/en/how-it-works` | 2 válidos: Breadcrumbs, SoftwareApplication. Aviso opcional: `aggregateRating` |
  | `/en/guides/json-output` | 4 válidos: Article, Breadcrumbs, contenido gratuito (`isAccessibleForFree`), SoftwareApplication. Avisos opcionales: `image` en Article, `aggregateRating` |
  | `/en/blog/llama-cpp-v1-0-0-semantic-versioning` (AI Daily) | 4 válidos: NewsArticle **sin avisos**, Breadcrumbs, contenido gratuito, SoftwareApplication |
  | `/en/benchmarks` | **Error**: el Dataset de origen (`isBasedOn`, "OpenRouter benchmarks API") sin `description`, obligatoria. Opcionales: `license`, `creator` |

  **Corregido** el error real: el Dataset de origen lleva `description` en los tres idiomas, y el validador de `seo:check` exige 50–5000 caracteres de `description` en todo Dataset (test nuevo en `seo.jsonld`). Verificado en dev con datos: 0 errores en es/en/pt ([log](./logs/final/benchmarks-jsonld-dev.txt)). `aggregateRating` no se agrega a propósito: no hay reseñas reales y un test ya prohíbe inventarlas. `image` en las guías y `license` del Dataset quedan como mejoras opcionales.
- **Google Search Console**: la cuenta con sesión en Chrome **no tiene ninguna propiedad**. El DNS de `promptea.me` (en Vercel) ya tiene un TXT `google-site-verification`, así que la propiedad se verificó alguna vez, quizás con otra cuenta de Google. Pestaña dejada en "Añadir propiedad → Dominio → `promptea.me`".
- **Bing Webmaster Tools**: con sesión, pero `promptea.me` no está entre los sitios. Pestaña dejada en "Add a site" con la URL cargada.
- **Revisión nativa del portugués**: paquete listo en [`../../i18n/pt-review.md`](../../i18n/pt-review.md) (qué abrir primero, criterio, planilla para devolver correcciones, dónde vive cada texto).

## Paso 7 — Release

Versión **1.8.5** en `lib/version.ts`, `package.json`, `package-lock.json`, README, CHANGELOG y la tarjeta de `/changelog` en los tres idiomas (`dict.changelog.v185`). Checks finales sobre esta rama:

| Chequeo | Resultado |
| --- | --- |
| `npm run lint` / `typecheck` | ok ([lint](./logs/final/lint.txt), [typecheck](./logs/final/typecheck.txt)) |
| `npm test` | 1.707 tests (1.696 al empezar) ([log](./logs/final/test.txt)) |
| `npm run build` sin credenciales | ok, 702 páginas (690 + 12 de las dos guías nuevas) ([log](./logs/final/build.txt)) |
| `seo:check` local | 805/805 ([log](./logs/final/seo-check-local.txt)) |
| `qa-local` | 57/57 ([log](./logs/final/qa-local.txt)) |
| `a11y-check` | 83/83, Aqua estricto; 3 "known" de N-1 ([log](./logs/final/a11y-check.txt)) |
| `engine-qa` | 64/64 ([log](./logs/final/engine-qa.txt)) |
| `audit` | ver [log](./logs/final/audit.txt) |

## Pasos del dueño (en orden)

1. **Red del entorno `Default`** (pestaña abierta): claude.ai/code → entorno Default → ⚙ → Acceso a la red. Los 85 dominios quedan agregados al final de "Dominios permitidos" sin guardar: revisar y apretar **Guardar cambios**. (Lista en `docs/editorial/tech-routine-domains-to-allow.txt`.)
2. **Secreto de la rutina Tech** (pestaña abierta): "Editar instrucciones" → reemplazar `PASTE_BLOG_PUBLISH_SECRET_HERE` por el valor de la línea `PUBLISH SECRET:` de `promptea-ai-daily` → **Guardar cambios**.
3. **Corrida de validación**: en la misma página, **Ejecutar ahora** una vez. Esperar `HTTP 200` y `"outcome":"validated"` del `dryRun` en el informe.
4. **Encender**: "Editar instrucciones" → borrar el bloque desde `VALIDATION MODE: ON` hasta antes de `=== END OF ROUTINE SETUP ===` → Guardar → activar el interruptor de la rutina.
5. **Newsletter de prueba con `resend` 6.38.0**: confirmar en Vercel → Production que `NEWSLETTER_TEST_RECIPIENTS` tenga tu casilla. Después, en una terminal (Git Bash), pegando el secreto cuando lo pida (no se muestra):

   ```bash
   read -rsp "NEWSLETTER_SEND_SECRET: " NEWSLETTER_SEND_SECRET; echo
   for MODE in dry_run test; do
     printf '{"mode":"%s"}' "$MODE" > body.json
     TS=$(date +%s); NONCE=$(openssl rand -hex 16)
     SIG=$({ printf '%s.%s.' "$TS" "$NONCE"; cat body.json; } | openssl dgst -sha256 -hmac "$NEWSLETTER_SEND_SECRET" -hex | sed 's/^.* //')
     curl -sS -X POST https://www.promptea.me/api/internal/newsletter/run -H "content-type: application/json" -H "x-promptea-timestamp: $TS" -H "x-promptea-nonce: $NONCE" -H "x-promptea-signature: $SIG" --data-binary @body.json; echo
   done
   rm body.json; unset NEWSLETTER_SEND_SECRET
   ```

   `dry_run` no guarda ni envía nada; `test` manda una copia `[TEST]` solo a `NEWSLETTER_TEST_RECIPIENTS`. Esperado: `DRY_RUN_OK` y `TEST_SENT`.
6. **Search Console** (pestaña abierta): **CONTINUAR**. Si Google acepta el TXT que ya está en el DNS, **Verificar** pasa directo; si muestra otro valor, agregarlo en Vercel → Domains → `promptea.me` → DNS Records (tipo TXT, nombre `@`) y volver a **Verificar**. Después: Sitemaps → `https://www.promptea.me/sitemap.xml` → **Enviar**, y a los días mirar Páginas (cobertura de `/pt`) y los avisos de hreflang.
7. **Bing** (pestaña abierta): con Search Console verificado, cerrar el formulario manual y usar **Import** desde Google Search Console (no pide verificación e importa el sitemap). Si no, **Add** y verificar con el método que ofrezca.
8. **Revisión nativa del portugués**: pasarle `docs/i18n/pt-review.md` a una persona nativa.
9. **N-1**: decidir si Metro y Glass claro usan su tono "strong" para el texto de acento y los badges.

Siguen abiertas de antes (sin cambios en esta versión): qué newsletter recibe un suscriptor de `/pt`, la política de bots de entrenamiento (`lib/seo/crawlers.ts`), las variables opcionales de Vercel (`ANTHROPIC_API_KEY`, `REFINER_PROVIDERS`, `PROMPT_JUDGE_ENABLED`), `/api/analyze-llm`, el límite de uso compartido y la CSP en `Report-Only`.

## Qué se escribió fuera del repo

- **GitHub**: PR #43 abierto, verificado y mergeado (squash); este PR.
- **claude.ai**: la rutina Tech creada deshabilitada. Se abrieron (sin guardar) el formulario de rutina nueva, el editor de instrucciones de la rutina Tech y el diálogo de red del entorno para leerlos.
- **Google / Bing**: solo se abrieron los formularios de alta y se cargaron los campos; nada confirmado. Rich Results Test: 4 pruebas de URLs públicas.
- **Producción**: solo GET (más las visitas del Chrome del dueño a producción y al preview, que cuentan como vistas). No se publicó nada, no se llamó a `/api/internal/*`, no hubo altas ni emails, no se corrió `/api/analyze` contra producción ni contra el preview.

## Lo que no se pudo verificar

- La rutina Tech de punta a punta (falta el secreto y la red).
- Un envío real con `resend` 6.38.0.
- Search Console y Bing por dentro (no hay propiedad).
- Un análisis con LLM en el preview o en producción (solo el camino determinístico local, `engine-qa`).
- Lector de pantalla real, dispositivos físicos e INP.
