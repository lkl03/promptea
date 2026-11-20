# v1.8.8: tráfico (Vercel Analytics) y el pico de Singapur

Datos leídos el 2026-11-20 en el dashboard de Vercel (proyecto `promptea`, Production, zona horaria de Buenos Aires), en modo lectura:
- **Web Analytics:** visitantes, páginas vistas, rebote, países, referrers, páginas, dispositivos y eventos. Solo cuenta navegadores que ejecutan el script.
- **Firewall → Traffic:** todos los pedidos HTTP, con país, ASN y user-agent.

La API pública de Web Analytics (integración MCP de Vercel) devolvió 404 para este proyecto, así que todo sale de las consultas internas que usa el propio dashboard. No se guardó nada ni se tocó ninguna configuración.

**Visitantes** = dispositivos únicos de Web Analytics. "Sin SG" = el total menos Singapur, que es una aproximación porque un dispositivo cuenta en un solo país.

## 1. Tráfico: 7 y 30 días, y antes y después de la v1.8.6 (14/11)

| Ventana (días completos) | Visitantes | Páginas vistas | Rebote | Singapur (visitantes) | **Visitantes sin SG** | **Páginas sin SG** |
| --- | --- | --- | --- | --- | --- | --- |
| Últimos 7 días (13–19/11) | 913 | 1.178 | 89 % | 508 | **405** | **647** |
| 7 días anteriores (6–12/11) | 269 | 470 | 80 % | 55 | **214** | **415** |
| Variación | +239 % | +151 % | +9 pp | | **+89 %** | **+56 %** |
| Después de v1.8.6 (14–19/11, 6 días) | 816 | 1.037 | 89 % | 476 | **340** | **539** |
| Antes de v1.8.6 (8–13/11, 6 días) | 327 | 522 | 82 % | 83 | **244** | **438** |
| Variación | +150 % | +99 % | +7 pp | | **+39 %** | **+23 %** |
| Últimos 30 días (21/10–19/11) | 1.697 | 2.613 | 83 % | 575 | **1.122** | **2.012** |
| 30 días anteriores (21/9–20/10) | 754 | 1.361 | 74 % | 28 | **726** | **1.326** |
| Variación | +125 % | +92 % | +9 pp | | **+55 %** | **+52 %** |

**Lectura:** más de la mitad del crecimiento de la última semana es Singapur, que es tráfico automatizado (§3). Sin Singapur, el crecimiento real existe pero es menor: +89 % en 7 días y +39 % antes/después de la v1.8.6. Buena parte del salto del rebote, de 74 % a 89 %, lo explica Singapur, con 95–96 % de rebote.

### Referrers

| | 7 días (13–19/11) | 7 días anteriores | 30 días | 30 días anteriores |
| --- | --- | --- | --- | --- |
| google.com | **117** | 57 | 303 | 259 |
| instagram.com | **32** | 11 | 44 | — |
| bing.com | 5 | 8 | 34 | 21 |
| duckduckgo.com | 4 | 2 | 13 | 3 |
| l.meta.ai | 2 | 1 | — | — |
| m.baidu.com | 2 | — | — | — |
| t.co (X) | — | — | — | 4 |

Google duplicó las visitas semana contra semana (+105 %). Coincide con el SEO de la v1.8.6 y con la indexación de `/pt`, pero **no está probado que sea causa**: hay que confirmarlo con Search Console hacia el 12/12, como se planeó en la v1.8.6. Instagram pasó a ser el segundo referrer. X casi no aparece, y por eso los tweets ahora llevan UTM (#54).

### Países (visitantes)

| 7 días | 7 días anteriores | 30 días | 30 días anteriores |
| --- | --- | --- | --- |
| Singapur 508 | EE. UU. 68 | Singapur 575 | EE. UU. 243 |
| EE. UU. 113 | Singapur 55 | EE. UU. 388 | China 81 |
| India 42 | China 47 | China 152 | España 66 |
| China 34 | España 22 | España 91 | México 65 |
| España 25 | India 16 | India 74 | Argentina 41 |
| Brasil 23 | Argentina 9 | México 50 | India 33 |
| Portugal 10 | Colombia 9 | Argentina 27 | Perú 33 |

### Páginas más visitadas (visitantes)

- **7 días:**
  - `/en/guides/chatgpt-prompts-for-work` 36
  - `/es/analyzer` 33
  - `/en/analyzer` 24
  - `/en` 23
  - `/en/blog/llama-cpp-v1-0-0-semantic-versioning` 23
  - `/es` 22
  - `/en/blog/weekly-recap-2026-11-14…` 18
  - `/en/guides/reasoning-model-prompts` 18
  - `/es/landing/prompt-analyzer` 17
  - `/en/guides/negative-prompting` 16

  Ojo: Singapur suma unos 8 visitantes a casi todas las páginas en inglés, así que las guías y las notas en inglés aparecen infladas.
- **30 días:** `/es` 159, `/en` 127, `/es/analyzer` 109, `/en/blog` 104, `/en/analyzer` 81, `/es/landing/prompt-analyzer` 53, `/en/guides/chatgpt-prompts-for-work` 46, `/es/best-ai` 29.
- **Por idioma (16–19/11):**
  - `/en` 367, `/en/blog` 120, `/en/blog/tech` 1;
  - `/es` 70, `/es/blog` 4;
  - `/pt` 29, `/pt/blog` 1;
  - `/zh` 17, `/zh/blog` 5.

### Dispositivos

- 7 días: escritorio 810, móvil 94. Singapur es 100 % escritorio; sin Singapur, el móvil es alrededor del 24 %.
- 7 días anteriores: escritorio 193, móvil 56.

### Eventos

Existen desde el 14/11 (#46), así que todavía no hay período anterior para comparar.

| Evento | Visitantes / eventos (7 días) |
| --- | --- |
| Prompt Analyzed | 25 / 44 |
| Target Changed | 22 / 41 |
| Template Copied | 8 / 12 |
| Prompt Copied | 4 / 6 |

**Unos 25 de ~405 visitantes reales (≈6 %) analizan un prompt.** Es la métrica a mover.

## 2. Alcance de los tweets

Buffer midió 105 impresiones y 0 clics en los 9 tweets del 9 al 16/11. En Vercel, `t.co` aparece con 4 visitantes en 30 días. Como X saca el referrer, desde ahora el alcance se mide con UTM en el panel **UTM Parameters** (#54), por `utm_campaign=tweets-<lunes>` y `utm_content=<tipo>`.

## 3. Singapur

### Lo que confirman los datos

| Pregunta | Dato | Fuente |
| --- | --- | --- |
| **Desde cuándo** | Hasta el 10/11, de 0 a 4 visitantes por día. Después: 11/11: 27, 12/11: 20, 13/11: 32, 14/11: 63, 15/11: 97, 16/11: 78, 17/11: 90, 18/11: 70, 19/11: 83 | Web Analytics, serie diaria |
| **Pedidos HTTP** | Desde Tencent Cloud (AS132203) en Singapur, menos de 220 por día hasta el 10/11. Después: 942 (11/11), 1.890 (13/11), 2.221 (14/11), 3.641 (15/11), 3.281 (16/11), 3.150 (17/11), 2.391 (18/11), 3.252 (19/11) | Firewall → Traffic |
| **Desde dónde** | Pedidos desde Singapur del 11 al 20/11 por ASN: Tencent Cloud 21.708, Amazon 2.112, Huawei Cloud 1.752, Alibaba 1.375, DigitalOcean 136… El primer proveedor de internet residencial (Starhub) tiene 24 | Firewall, ASN |
| **Navegador** | Los 10 user-agents más usados desde Tencent Singapur son todos "Chrome en Windows", con versiones mayores distintas: 146, 116, 106, 131, 110, 144, 107, 109, 103 y 108. Varias tienen años de atraso | Firewall, user-agent |
| **Dispositivo** | 100 % escritorio, 96 % Windows, Chrome | Web Analytics |
| **Qué páginas** | 127 rutas distintas, casi todas con 8 o 9 visitantes cada una, y casi todo en inglés: guías 337, AI Daily 140, glosario 50, modelos 43. **`/zh`: 3.** En pedidos HTTP, todas las secciones con volúmenes parecidos (blog 3.395, analizador 2.125, guías 1.928; modelos, glosario, biblioteca, prompts, benchmarks, changelog, privacidad y fuentes, 1.100–1.500 cada una) | Web Analytics y Firewall |
| **Referrers** | Ninguno | Web Analytics |
| **Comportamiento** | Rebote 95–96 %, 1,05 páginas por visitante y **0 eventos**: nadie analizó, copió ni cambió de IA. Visitas repartidas en las 24 horas, sin el ritmo de día y noche de una persona | Web Analytics |
| **Idioma** | Vercel Analytics no registra el idioma del navegador. Lo que se lee es en inglés casi en su totalidad | rutas |

### Conclusión con los datos

**Es tráfico automatizado desde centros de datos, no personas.** Lo indican tres cosas: el ASN es de nube y no residencial, los user-agents son de Chrome con versiones viejas que van rotando, y el recorrido es uniforme por todas las secciones, incluidas privacidad y changelog, sin ninguna interacción. Como ejecuta JavaScript (un Chrome sin interfaz), Web Analytics lo cuenta como visita.

**No lo causó el SEO para Asia de la v1.8.6 ni el chino.** Empezó el 11/11, antes del deploy de la v1.8.6 (14/11) y del de `/zh` (16/11), y lee páginas en inglés: solo 3 de unas 578 visitas fueron a `/zh` y 43 a páginas de modelos. **Tampoco viene de un post ni de un enlace:** no tiene ningún referrer.

### Hipótesis (sin confirmar)

- **H1.** Un rastreador de datos para IA, o una herramienta de SEO o de monitoreo, alojada en nubes de Singapur, que encontró el sitio por el sitemap o `llms.txt` (existen desde la v1.8.0, el 9/11) y lo recorre entero cada día. Que el volumen por página sea parejo encaja con eso.
- **H2.** El 11/11 coincide con el deploy de la v1.8.2 (portugués, más URLs en el sitemap). Es solo una coincidencia de fechas.

Para ir más allá habría que mirar los logs de pedidos completos: rutas exactas, cadencia por IP y si respeta `robots.txt`. En el plan actual el Firewall muestra agregados, y Observability Plus no está activo.

### Qué hacer

1. **Para leer métricas:** usar los números "sin SG" o filtrar Singapur en el dashboard. Si no, el rebote, las páginas top y el crecimiento quedan distorsionados.
2. **Opcional, en el Firewall (decisión tuya):** una regla de *challenge*, no de bloqueo, para los ASN 132203 (Tencent), 136907 (Huawei) y 45102 (Alibaba) cuando el país es Singapur, primero en modo *log* durante una semana. Googlebot y Bingbot no salen de esos ASN. No lo configuré: es un cambio de producción.
