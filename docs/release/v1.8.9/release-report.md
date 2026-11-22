# Promptea v1.8.9: reporte de release

Fecha: 2026-11-22. Base: `main` @ `d06ed56` (v1.8.8, en producción). Rama `claude/v189-branches`, un solo PR, **sin mergear**.

## 0. Resumen

| Parte | Qué se hizo | Estado |
| --- | --- | --- |
| 1. Auditoría de 1.8.8 | Producción sin errores; 7 defectos reales encontrados y corregidos, más 3 que aparecieron al verificar | En el PR, con tests |
| 2. Flujo de prompts | Una tarea principal se ramifica en pasos; cada paso trae su prompt y la mejor IA. Inspirado en el patrón de Orca, con diseño propio | En el PR, verificado en Chrome |
| 3. Claude con tope | Toda llamada reserva el peor caso en un libro mayor de Firestore y se corta en USD 90 de 100 | En el PR. **Falta que cargues la clave** (§7) |

## 1. Auditoría de la v1.8.8

**Qué se miró:**
- typecheck, lint y la suite completa: verdes en la base (2.056 tests);
- Vercel: **0 errores de runtime en 7 días**;
- los 127 avisos `warn` de 3 días son todos `The credentials option is deprecated`, que viene de `google-auth-library` 11 dentro de `firebase-admin` 14.5.1. Es la última versión y no afecta nada, así que se deja (ver §6);
- una revisión independiente del diff completo de 1.8.8 (#50 a #57), con cada hallazgo verificado a mano en el código.

**Corregido:**

| # | Defecto | Arreglo |
| --- | --- | --- |
| 1 | Toda nota de AI Daily en chino decía "阅读约1分钟": `wordCount` separa por espacios y el chino no tiene | Los caracteres Han cuentan a 1,7 por palabra, la regla del motor (`lib/blog/render.ts`). es/en/pt no cambian |
| 2 | El resumen semanal en `/zh` mostraba los títulos en inglés aunque la rutina escribe `titleZh` | Se usa `titleZh` (`app/[lang]/blog/[slug]/page.tsx`) |
| 3 | Al publicar una nota con chino, la API no devolvía la URL `/zh` (el prompt de la rutina la verifica) ni le avisaba a IndexNow | `urls.zh` y el ping incluyen `/zh` (`app/api/internal/blog/publish/route.ts`) |
| 4 | `name@example.com`, el placeholder del formulario en `/zh`, se aceptaba y se le mandaba el mail | Los dominios de ejemplo de RFC 2606 (`example.com/.net/.org` y sus subdominios) se excluyen al enviar y se rechazan al suscribir |
| 5 | Si fallaba el envío de Resend, la alerta diaria "gastaba" el día y la rutina atrasada se avisaba recién al día siguiente | Se libera el día cuando falla el envío (`releaseAlertDay`). La clave de idempotencia de Resend sigue evitando el doble envío |
| 6 | `?dryRun=true` en la alerta mandaba un mail real (solo contaba `1`) | `true` y `yes` también son simulacro |
| 7 | El script de limpieza del newsletter reemplazaba un salto de línea por otro salto de línea, así que la clave privada no se arreglaba | `/\\n/g`, como `lib/firebase/admin.ts` |
| 8 | `/zh/blog` perdía su JSON-LD aunque ya fuera su propia canónica, y el nodo Blog decía `inLanguage: "zh"` | JSON-LD presente e `inLanguage` `zh-CN` |
| 9 | El changelog de 1.8.8 dice "desde el 21/11 cada nota nueva se publica en /zh"; al 22/11 no había **ninguna** en el sitemap de producción | Texto corregido en los 4 idiomas y en `CHANGELOG.md`: empieza cuando pegues los prompts nuevos |
| 10 | La guía de prompts multimodales seguía nombrando a Kimi K3 como el Kimi actual | Kimi K3.1 Pro |

**Encontrado al verificar esta versión:**
- **Menú de escritorio sobre el logo.** A 1024 px ya se pisaban 31 px en 1.8.8, y el link nuevo "Flujo" lo llevaba a 34–76 px según el idioma. Ahora el menú en línea aparece desde 1280 px, con un espaciado algo más compacto; debajo de 1280 px se usa el botón de menú que ya existía. Medido en los 4 idiomas: entre 52 y 123 px libres respecto del logo a 1280 px. Capturas: `shots/header-*`.
- **`/zh/blog` con el archivo vacío.** La página apuntaba su canónica a `/en/blog` pero no mostraba el aviso de "en inglés", y `seo:check` fallaba en local. Ahora lo muestra.
- **El analizador mandaba LLM a crawlers.** Antes de 1.8.9, con una clave cargada, el refinador y el juez llamaban al LLM para cualquier User-Agent. Ahora un bot recibe el análisis determinístico completo y ninguna llamada paga.

## 2. Orca y la feature

Todo el detalle está en [`flow-design.md`](./flow-design.md). En corto:

**Orca** (orca.dev, de Stably AI, YC) es un entorno de desarrollo para agentes, gratis y de código abierto:
- corre Claude Code, Codex, Grok y otros agentes de terminal en paralelo, **cada uno en su propio git worktree**;
- un **agente coordinador reparte una tarea entre trabajadores**, cada uno con su modelo, y después junta los resultados.

El post de LinkedIn muestra eso como un árbol: el plan arriba y tres agentes abajo, cada uno con su modelo y su tarea.

**Qué tomamos:** el patrón, nada más. Una tarea principal arriba que se ramifica en pasos, con ramas en paralelo cuando no dependen entre sí, instrucciones acotadas para cada paso y un modelo por rama. No se copió el nombre, la marca, los textos ni el look.

**Flujo de prompts** (`/[lang]/flow`, el tercer modo):
- escribís una tarea y Claude Haiku 5.5 la divide en 2 a 6 pasos;
- cada paso trae un prompt listo para pegar, con marcadores `[Resultado del paso N]`, lo que entrega y la mejor IA para ese paso;
- la IA de cada paso la elige el matcher de "Elegir la mejor IA": no le cuesta nada a la API y viene con su motivo;
- los pasos se pueden copiar, mandar al analizador o marcar como hechos;
- "Copiar el flujo" exporta todo en Markdown;
- **sin IA**, el motor arma un plan básico con una de cuatro plantillas (código, escritura, investigación, general), con un aviso que explica por qué.

Se agregó en los 4 idiomas en todos estos lugares: el selector de modos, el menú, el inicio, el sitemap y hreflang, `llms.txt`, el JSON-LD (`WebPage` y `FAQPage`), Metodología, Cómo funciona, Acerca de y Privacidad.

## 3. Claude y el tope de USD 100

Detalle y costos en [`docs/ops/ai-budget.md`](../../ops/ai-budget.md).

- **Modelos** (precios verificados con la skill `claude-api` el 22/11):
  - Claude Haiku 5.5 (USD 0,10 / 0,50 por MTok) para el flujo y el refinador;
  - Claude Sonnet 5.5 (USD 2 / 10) queda como opción por variable si la calidad no alcanza;
  - Opus 5.5 no se justifica para esto.
- **Costo estimado:** ≈ USD 0,001 por flujo y ≈ USD 0,0005 por reescritura. Con el tráfico actual, **menos de USD 1 por mes**.
- **El tope:**
  - antes de cada llamada se reserva el **peor caso posible** (cada byte de entrada como un token de escritura de caché, más todo el `max_tokens`), en una transacción de Firestore;
  - límites: **USD 90 por mes** (90 % de 100), **USD 6 por día**, **12 flujos y 40 reescrituras por visitante y día**;
  - después se liquida con el `usage` real. Los errores se devuelven; los timeouts quedan cobrados;
  - el libro mayor solo puede contar de más, y si Firestore no responde, no se llama a Claude;
  - bots y pedidos sin `Origin` no llegan a Claude; `/api/flow` admite 6 por minuto por cliente;
  - `AI_FEATURES_ENABLED=0` apaga todo.
- **Prompt caching:** el prompt de sistema del flujo es estático (~900 tokens, por encima del mínimo de 512 de Haiku) y va marcado con `cache_control`. También el del refinador, como ya estaba.
- **Para ver el gasto:** `GET /api/internal/ai/usage` (Bearer `ROUTINE_HEALTH_SECRET` o `CRON_SECRET`).

## 4. Tests y QA

| Qué | Resultado |
| --- | --- |
| `npm test` | **96 archivos, 2.128 tests** (+72), verde; 7 omitidos (emulador) |
| `npm run test:firestore` (emulador, firebase-admin 14.5.1) | **7/7**, incluido el libro mayor de IA: reserva, liquidación, tope y reservas concurrentes que nunca pasan el tope (`logs/firestore-emulator.txt`) |
| Typecheck y lint | 0 errores |
| `next build` | OK; `/[lang]/flow` prerenderizado en los 4 idiomas (`logs/build.txt`) |
| `seo:check` (build local) | **1.038/1.038** (`logs/seo-check-local.txt`) |
| `a11y-check` (Chrome real) | **133/133**, con `/flow` en los 4 idiomas y el menú de 10 links (`logs/a11y-check.txt`) |
| `i18n-qa` (Chrome real) | **272 cargas, 0 fallas** en zh/pt/es/en, con `/flow` (`logs/i18n-qa.txt`). Las 6 notas son nombres de modelos sin chino en Cómo funciona, igual que antes |
| Chrome (extensión), a mano | Ver detalle abajo |

**Verificación a mano en Chrome:**
- `/es/flow` a 1920 px con el *fixture* de IA: árbol con conectores, rama paralela y unión, Hecho y progreso, prompt desplegable;
- "Mejorar en el analizador" lleva el paso 2 con destino Claude Opus 5.5 y propósito Código;
- al volver, el flujo se restaura con su progreso;
- `/en/flow` sin clave: aviso y plan básico;
- `/zh/blog` con una nota china de prueba: canónica propia y JSON-LD `CollectionPage`/`Blog` en `zh-CN`;
- `name@example.com` rechazado al suscribir;
- tarjeta v1.8.9 en `/zh/changelog`;
- temas glass y aqua;
- header a 1024 y 1280 px;
- móvil a 375 px en `/zh` y `/pt`, sin scroll horizontal.

Capturas en `shots/`.

**No verificado:**
- **una llamada real a Claude**: no hay clave en esta máquina ni en el `.env.local`. El camino completo se probó con respuestas simuladas del SDK y el libro mayor con el emulador. La primera prueba real es en el preview de Vercel o en producción, cuando cargues la clave;
- el preview de Vercel de este PR por dentro (está protegido; se revisa con tu sesión);
- el libro mayor contra el Firestore real de producción.

## 5. Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | ¿Obligatoria? | Valor |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | **Sí, para usar IA** | Tu clave de console.anthropic.com. Production (y Preview si querés probar ahí), tipo **Sensitive** |
| `AI_MONTHLY_BUDGET_USD` | No | `100` por defecto |
| `AI_BUDGET_SAFETY_RATIO` | No | `0.9` por defecto, o sea que corta en USD 90 |
| `AI_DAILY_BUDGET_USD` | No | Por defecto el tope mensual ÷ 15, o sea USD 6 |
| `AI_USER_DAILY_LIMIT` / `AI_REFINE_USER_DAILY_LIMIT` | No | `12` / `40` |
| `AI_FEATURES_ENABLED` | No | `0` apaga todas las llamadas a Claude |
| `AI_FLOW_MODEL` | No | `claude-haiku-5-5`; `claude-sonnet-5-5` si querés más calidad |
| `REFINER_PROVIDERS` | No, recomendada | `anthropic,groq` para que Claude reescriba primero en el analizador |

Todas están en `.env.example` (nuevo; solo nombres y valores por defecto).

## 6. Qué queda pendiente

**De tu lado:**
1. Crear la clave en un **workspace propio** de la consola de Anthropic y ponerle un **límite de gasto mensual** (por ejemplo USD 100) con alertas: es la segunda barrera.
2. Cargar `ANTHROPIC_API_KEY` en Vercel y hacer **Redeploy**.
3. Opcional: `REFINER_PROVIDERS=anthropic,groq`.
4. Opcional: una política TTL de Firestore sobre `ai_quota.expiresAt`.
5. Después del deploy, probar un flujo real en `/es/flow` y mirar `/api/internal/ai/usage`.
6. Lo que ya estaba pendiente de 1.8.8 sigue igual: rotar secretos y pegar los prompts nuevos de las rutinas (sin eso no salen notas en chino), `CRON_SECRET` y `ROUTINE_ALERT_TO`, y los revisores nativos de pt y zh.

**Encontrado y no corregido (queda para otra versión):**
- `/zh/llms.txt` no lista las notas en chino, y las correcciones (`corrections`) no tienen nota en chino. Recién importa cuando se publiquen notas en chino.
- El aviso `credentials option is deprecated` en los logs viene de `firebase-admin` 14.5.1 y no tiene arreglo nuestro sin tocar la autenticación de producción.

## 7. Qué se escribió afuera del repo

- **GitHub:** la rama `claude/v189-branches` y este PR, sin mergear.
- **Vercel:** solo lectura (errores, logs y deploys). No toqué variables ni configuración.
- **Nada más:** no toqué rutinas, Firestore de producción ni la consola de Anthropic.
