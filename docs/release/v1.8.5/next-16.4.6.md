# Next 16.1.1 → 16.4.6 (seguridad)

Fecha: 2026-11-13 · Rama: `chore/next-16.4.6` · PR [#43](https://github.com/lkl03/promptea/pull/43) · Base: `main` @ `7c130a3` (v1.8.4).

Paso 1 de la v1.8.5. Va en su propio PR y no sube la versión de la app.

## Por qué

`npm audit --omit=dev` marcaba `next` 16.1.1 con 41 avisos, 4 de ellos críticos (ejecución remota de código):
[GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36),
[GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4),
[GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw) y
[GHSA-673q-mjm6-r5xr](https://github.com/advisories/GHSA-673q-mjm6-r5xr).
El último lote de avisos de Next se corrigió en 16.4.5 (2026-11-03).

## La versión, antes de instalarla

| Qué | Resultado |
| --- | --- |
| `npm view next dist-tags` | `latest` = 16.4.6 (2026-11-09 20:33 UTC). No hay un 16.4.x más nuevo. |
| Quién la publicó | GitHub Actions como *trusted publisher* (OIDC), igual que cada versión desde 16.2.x (hasta 16.2.0 era `vercel-release-bot`). |
| Proveniencia | SLSA v1: `vercel/next.js`, workflow `.github/workflows/build_and_deploy.yml`, tag `v16.4.6`, commit `54b876b6`. |
| Scripts de instalación | Ninguno (`scripts` solo tiene `start`). En todo el lockfile, ningún paquete nuevo con `hasInstallScript`. |
| Dependencias | Las mismas que 16.4.5; tamaño desempaquetado +0,01 %. |
| Notas de versión | 16.2, 16.3, 16.4 (posts de nextjs.org) y 16.4.5/16.4.6 (releases de GitHub). 16.4.6 es un backport de correcciones: compresión automática de las respuestas de route handlers, GC de Turbopack en dev, Tailwind fijado en `create-next-app`. |
| Después de instalar | `npm audit signatures`: 566 paquetes con firma verificada, 112 con attestations. |

## Qué cambió para Promptea

- **Ningún cambio incompatible** en lo que usa el proyecto (App Router, `proxy.ts`, ISR con `revalidate`, metadata, `next/og`, route handlers de texto).
- **`ImageResponse` usa Geist en lugar de Noto Sans como fuente por defecto** (16.2). Las imágenes OG y la tarjeta compartible no declaran fuente, así que cambia la tipografía; la composición, los tamaños y los acentos del portugués quedan igual. Comparación en [`logs/next-16.4.6/og/`](./logs/next-16.4.6/og).
- **`eslint-plugin-react-hooks` 7.1.1** (lo trae `eslint-config-next` 16.4.6) detecta `react-hooks/set-state-in-effect` en cuatro efectos que ya existían: dos restauran estado de `sessionStorage` después de hidratar (`PromptBox`, `MatcherBox`) y dos corrigen un valor que dejó de valer (modelo que no corresponde al destino, adjuntos con un propósito que no los admite). Se marcan con `eslint-disable-next-line` y el motivo; el comportamiento no cambia. Reescribirlos como estado derivado es una mejora posible, aparte.
- **`next dev` escribe `AGENTS.md`** cuando detecta un agente de IA (16.3+). Se desactiva con `agentRules: false` en `next.config.ts` para que las sesiones de agentes no dejen ese archivo sin trackear.
- **El aviso de `turbopack.root`** que salía en cada build desaparece.
- **Lockfile**: `base64-js` figuraba como `1.5.2` (versión que no existe) con el tarball y la integridad de `1.5.1`, desde el primer commit del repo. Se corrigió a `1.5.1`; sin eso `npm audit signatures` no corre.

## Resultados

| Chequeo | 16.1.1 | 16.4.6 |
| --- | --- | --- |
| `npm audit --omit=dev` | 25 avisos (4 críticos); `next` directo | 20; `next` ya no aparece. Los 3 críticos que quedan (`fast-xml-parser`, `protobufjs`, `websocket-driver`) son transitivos de `firebase-admin` |
| `npm run lint` | ok | ok |
| `npm run typecheck` | ok | ok |
| `npm test` | 1.696 | 1.696 |
| `npm run build` sin credenciales | ok, 690 páginas, 1 aviso | ok, 690 páginas, 0 avisos |
| `seo:check` local | 793/793 | 793/793 |
| `qa-local` | 57/57 | 57/57 ([log](./logs/next-16.4.6/qa-local.txt)) |
| `audit` (460 cargas: páginas × temas × anchos) | — | 0 hallazgos ([log](./logs/next-16.4.6/audit.txt)) |
| `a11y-check` (dev con fixtures) | 77/77 + excepción conocida | 77/77 + la misma excepción (Aqua 4,02:1, se arregla en la v1.8.5) ([log](./logs/next-16.4.6/a11y-check.txt)) |
| `engine-qa` (analizador local, camino determinístico) | 64/64 | 64/64 ([log](./logs/next-16.4.6/engine-qa.txt)) |
| `overflow` (8 páginas × 375/768) | — | 0 desbordes ([log](./logs/next-16.4.6/overflow.txt)) |
| JS propio (`/_next/static`, sin comprimir) | `/en` 977 KB · `/en/analyzer` 1.134 KB | `/en` 704 KB · `/en/analyzer` 866 KB ([log](./logs/next-16.4.6/first-party-js.txt)) |
| `perf` local (desktop y móvil ×4 CPU) | — | CLS ≤ 0,001; LCP desktop 140–656 ms, móvil 272–520 ms ([log](./logs/next-16.4.6/perf-local.txt)) |

`perf` de v1.8.4 se midió contra producción (con datos, feed de X y analítica), así que sus tiempos y bytes totales no se comparan con un build local sin datos; por eso la fila de JS propio mide producción (16.1.1) y el build local (16.4.6) con el mismo script.

## Preview de Vercel

Recorrido con el Chrome del dueño (tiene sesión en Vercel; el preview está protegido): `promptea-8jx22sx4x-lkl03s-projects.vercel.app`, que reporta `next` 16.4.6.

- 37 rutas por GET desde la misma pestaña: home y analizador en es/en/pt, best-ai, benchmarks, blog (AI, Tech, semanal), guías, prompts, sources, glosario, modelos, changelog, about, library, 404, imágenes OG de `/en` y `/pt`, favicon, `sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt`, un gemelo `.md`, el feed RSS y la tarjeta compartible. Todas con el estado, el `lang` (`pt-BR` en `/pt`), el canonical y el `noindex` esperados (`/blog/tech` sigue en `noindex` porque no hay notas Tech; `/pt/blog` canonicaliza a `/en/blog`).
- A la vista: home en pt (marquee, últimas de AI Daily, feed de X con publicaciones reales, benchmarks, tarjeta de newsletter, que solo se miró), analizador (con "Try this prompt" el prompt se carga, se eligen Gemini e Imagen y se habilita "Analyze"; no se envió nada desde el preview), benchmarks, blog en es y una guía en pt.
- En el preview, Benchmarks muestra "último snapshot válido" porque el entorno Preview de Vercel no tiene `OPENROUTER_API_KEY`; producción está en `live`. No es del salto.

## Lo que no se verificó

- Un análisis real contra el backend del preview (llamaría a los proveedores con las claves del entorno Preview y escribiría telemetría). El flujo se probó en local con `engine-qa`.
- Lector de pantalla, dispositivos físicos e INP.
