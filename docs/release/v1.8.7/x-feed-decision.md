# v1.8.7 — De dónde sale el feed de X

Fecha: 2026-11-16 · Decisión: **Buffer como fuente principal, oEmbed público de X como respaldo opcional, y la tarjeta con markup propio renderizada en el servidor.** Código: `lib/social/` y `components/home/XFeed.tsx`.

## El problema

La tarjeta "Seguinos en X" (home y AI Daily) usaba un widget de Elfsight desde la v1.8.1. Antes se usaba el embed oficial de X, que dejó de renderizar. El widget de Elfsight:

- carga ~165 KB de JavaScript de un tercero en cada página con la tarjeta, más imágenes de `twimg.com`;
- está en el plan **gratis**: 200 vistas por mes. El 2026-11-16 llevaba 141/200 (se reinicia el 10/12). Al llegar al límite deja de mostrar posts, y Elfsight empuja a un plan pago;
- no se puede rastrear (el contenido no está en el HTML) ni funciona sin JavaScript;
- ya mostró errores propios en inglés en las tres versiones del sitio (v1.8.3).

## Lo que se evaluó (en el orden pedido)

| Opción | Costo | Robustez | Términos | Secretos | Mantenimiento | Resultado |
| --- | --- | --- | --- | --- | --- | --- |
| **Buffer API** (`api.buffer.com`, GraphQL) | US$0. El plan gratis incluye la API: 1 clave, 150 llamadas cada 15 min, 600 por día, 1.000 por mes por canal. Las comparten todas las claves y las conexiones MCP de la cuenta. El 2026-11-16 el uso de 30 días era 72/1.000. | Alta. API pública y documentada. Las publicaciones **enviadas** traen `text`, `sentAt` y `externalLink`, el enlace al post en X. Se verificó en solo lectura con la integración de Buffer: el último post enviado devolvió `externalLink: https://x.com/1683587543692877825/status/2121986625492160994`. | Uso propio de nuestros datos con la API oficial de Buffer. | Una clave de cuenta (`BUFFER_API_KEY`), solo en el servidor. | Ninguno: el dueño ya publica por Buffer, y la tarea `promptea-weekly-tweets` agenda 7 posts por semana. | **Elegida** |
| **oEmbed público de X** (`publish.x.com/oembed?url=…&omit_script=1`) | US$0, sin cuenta ni clave | Media. Se probó con un post real: devuelve JSON con autor y un `<blockquote>` con el texto y el **día** (sin hora). Los enlaces llegan acortados (`t.co`) y X pega el enlace a la palabra anterior. Leemos solo los datos y nunca cargamos `widgets.js`. | Es el endpoint público de X para embeber posts. Usamos sus datos con nuestro markup. | Ninguno | Alto: necesita una lista de URLs (`X_FEED_POST_URLS`) que alguien mantenga, y un cambio de variable necesita redeploy. | **Respaldo** si Buffer no está configurado o falla |
| **API de X** (pago por uso) | Hoy no hay plan gratis: créditos prepagos. Leer posts propios ("Owned Reads", `GET /2/users/{id}/tweets` con contexto de usuario) cuesta US$0,001 por post, deduplicado por día UTC. Con ~10 posts por día sale ~US$0,30 por mes. | Alta, es la fuente oficial. | Oficial | App de desarrollador, tokens de usuario (OAuth) y una tarjeta guardada con créditos y auto-recarga | Hay que crear la app y los tokens, comprar créditos y vigilar el saldo | **No por ahora.** Cuesta poco, pero exige alta de pago y tokens para algo que Buffer da gratis. Queda como alternativa si un día se publica en X sin pasar por Buffer. |
| Scraping de `x.com`, `syndication.twitter.com/srv/timeline-*`, Nitter / puentes RSS, cookies o tokens de la sesión del dueño en el servidor | — | Frágiles: X los rompe sin aviso | Contrarios a los términos de X o con credenciales personales en el servidor | — | — | **Descartadas** |

Precios de X leídos en docs.x.com/x-api/getting-started/pricing el 2026-11-16, en solo lectura. No se creó ninguna app, clave ni pago.

## Cómo quedó

- **Fuente enchufable** (`lib/social/feed.ts`): tipo `XPost { id, url, text, createdAt, dateOnly? }`. Fuentes en `lib/social/sources/buffer.ts` y `oembed.ts`, con `fetch` inyectado para los tests. El cableado está en `lib/social/server.ts`: Buffer → oEmbed → nada.
- **Caché**: el resultado, tanto posts como falla, se guarda 2 h en el data cache de Next (`unstable_cache`) y lo comparten todas las páginas e idiomas. Son ~12 llamadas por día, ~360 por mes, dentro del plan gratis aun sumando el uso del dueño por MCP. La organización de Buffer se busca una vez por semana, o nunca si se define `BUFFER_ORGANIZATION_ID`.
- **Saneamiento**: solo enlaces de estado de `x.com`/`twitter.com`, reconstruidos en forma canónica (`https://x.com/<handle>/status/<id>`). El texto es plano: sin caracteres de control ni de dirección bidi, con 600 caracteres como máximo, y React lo renderiza como texto. Solo se convierten en enlace las URLs `https`, los `#hashtags` y las `@menciones`, y abren en una pestaña nueva con `rel="noopener noreferrer nofollow"`. No hay imágenes de terceros. Se muestran hasta 10 posts, del más nuevo al más viejo.
- **Tarjeta**: es un componente de servidor. Muestra la lista con fecha relativa localizada y un enlace "Ver en X" en cada post, una caja de altura fija (420 px) con scroll interno, y un botón principal relleno "Seguinos en X" junto a otro transparente con `@promptea_me`. El navegador no hace ningún pedido a X ni a terceros. Sin fuente, o si la fuente falla, la tarjeta muestra una frase y el botón al perfil, nunca un error.
- **Privacidad**: `/privacy` lo explica en los tres idiomas. Ninguna clave llega al navegador, a un log ni a una clave de caché.

## Qué tiene que hacer el dueño

1. **Crear la clave de Buffer** (la pestaña queda abierta): publish.buffer.com → Settings → API → **Personal Access → + New Key**. Copiá la clave.
2. **Cargarla en Vercel** → Settings → Environment Variables → `BUFFER_API_KEY` (Production y Preview, tipo Sensitive) → **Redeploy**. No hace falta nada más. `BUFFER_ORGANIZATION_ID` es opcional y ahorra una llamada por semana.
3. **Elfsight**: no hay suscripción paga que cancelar (plan gratis, 141/200 vistas). Después de desplegar la v1.8.7, borrá el widget "Untitled Twitter Feed" desde dash.elfsight.com → My Apps (pestaña abierta) para que nadie lo vuelva a cargar. No es urgente: la v1.8.7 ya no lo pide.

Sin la clave, la tarjeta funciona igual y muestra el CTA al perfil.
