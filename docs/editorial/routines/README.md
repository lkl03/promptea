# Prompts de las rutinas (v1.8.8)

Los cuatro textos de esta carpeta son las instrucciones completas de las rutinas de claude.ai/code que publican en Promptea. **No contienen secretos:** cada uno tiene **una sola línea** donde va el valor, con el texto `PASTE_…_HERE`.

| Archivo | Rutina | Id | Qué cambió en la v1.8.8 |
| --- | --- | --- | --- |
| [`promptea-ai-daily.txt`](./promptea-ai-daily.txt) | `promptea-ai-daily` (noche, y semanal los sábados y domingos) | `trig_019vhwyMiYGrbcNVVYNbddAx` | Escribe la nota también en chino (`locales.zh`). El secreto va solo en la línea `PUBLISH SECRET:` |
| [`promptea-ai-daily-morning.txt`](./promptea-ai-daily-morning.txt) | `promptea-ai-daily-morning` | `trig_017wm2bnfBRBsUzsHBU2kvYZ` | Ídem |
| [`promptea-ai-daily-tech.txt`](./promptea-ai-daily-tech.txt) | `Promptea AI Daily Tech` | `trig_016d8RWXCJbYzCYrzKKqfmAc` | Ídem |
| [`promptea-weekly-newsletter.txt`](./promptea-weekly-newsletter.txt) | `Promptea Weekly newsletter` | `trig_01HY66a4RMwbTFHbnf5AwJbk` | Sin chino: el resumen sigue en inglés y español. El secreto va solo en la línea `SECRET (NEWSLETTER_SEND_SECRET…):` |

## Cómo aplicarlos (va junto con la rotación de secretos)

Para cada rutina, en https://claude.ai/code/routines:

1. Abrí la rutina → **Editar instrucciones**.
2. Seleccioná todo el texto actual (Ctrl+A) y borralo.
3. Pegá el contenido del archivo de esta tabla, entero. En GitHub, el botón **Raw** y después Ctrl+A y Ctrl+C.
4. En la línea `PUBLISH SECRET: PASTE_BLOG_PUBLISH_SECRET_HERE`, o en `…: PASTE_NEWSLETTER_SEND_SECRET_HERE` para el newsletter, reemplazá `PASTE_…_HERE` por el **valor nuevo** del secreto, sin espacios.
5. **Guardar cambios.**

Mientras una línea diga `PASTE_…_HERE`, la rutina no publica: termina en `PUBLICATION_FAILED` (o `BLOCKED`) con `secret_not_configured`. Así nunca firma con un valor vacío.

## El chino

- Desde la v1.8.8 el servidor acepta `locales.zh` como **tercer idioma opcional** de cada nota (`lib/blog/types.ts`).
- Una nota con chino tiene su propia página en `/zh/blog/<slug>`, con canonical propio, hreflang `es`/`en`/`zh`, sitemap y gemelo `.md`.
- Una nota sin chino (todas las anteriores al 21/11) se sigue viendo en inglés con un aviso.
- Si la parte china no valida, la rutina la saca y publica igual en inglés y español: **el chino nunca hace perder la nota**.
- El glosario que usan las rutinas es [`../../i18n/zh-glossary.md`](../../i18n/zh-glossary.md).
