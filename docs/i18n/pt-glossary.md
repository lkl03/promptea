# Glosario pt-BR de Promptea

Terminología fija para todo el texto en portugués de Brasil (`/pt`): diccionario
(`app/[lang]/dictionaries/pt.json`), textos en componentes y páginas, contenido SEO
(`lib/seo/content/*`) y motor de análisis. Las traducciones de la v1.8.2 fueron hechas por
IA: **conviene una revisión por una persona nativa** antes de promocionar `/pt`.

## Voz y registro

- Tratamiento: **você** (nunca "tu" ni "o senhor"). Imperativo en 3.ª persona: "Cole seu
  prompt", "Escolha um modelo".
- Posesivo sin artículo cuando suena natural: "seu prompt", "sua tarefa".
- Tono: directo y cercano, sin jerga argentina trasladada ni traducción literal del
  español ("escribí" → "escreva", "pegá" → "cole").
- Nombre del producto con artículo masculino: "o Promptea", "no Promptea".
- Fechas: `DD/MM/AAAA`. Números y moneda con `Intl` y la configuración regional `pt-BR`
  (`1.234,5`, `US$ 2,50`). Las horas del editorial siguen en la zona horaria de Buenos
  Aires, igual que en es/en.
- "e-mail" con guion. "Grátis" o "gratuito", no "de graça".

## Términos del producto

| Inglés | Portugués (pt-BR) | Notas |
| --- | --- | --- |
| prompt | prompt | No se traduce. Masculino: "o prompt". |
| prompt engineering | engenharia de prompt | |
| score | pontuação | "pontos" para el número ("fez 82 pontos"). No "score" ni "nota". |
| finding | achado | En la interfaz, la lista se titula "Riscos detectados". |
| recommendation | recomendação | |
| optimized prompt | prompt otimizado | |
| analyzer | analisador | "Analisador de prompts". |
| Best AI / Find the Best AI | Melhor IA / Encontrar a melhor IA | |
| AI | IA | |
| target AI | IA de destino | |
| model | modelo | Solo para modelos de IA. |
| template | template | No "modelo", para no chocar con "modelo de IA". |
| prompt pack | pacote de prompts | |
| guide | guia | Masculino: "o guia", "os guias". |
| glossary | glossário | |
| library | biblioteca | |
| benchmark | benchmark | No se traduce. |
| frontier model | modelo de fronteira | |
| provider | provedor | |
| newsletter | newsletter | Femenino: "a newsletter". |
| subscribe / unsubscribe | assinar / cancelar inscrição | |
| weekly digest | resumo semanal | |
| story (AI Daily) | notícia | |
| feedback | feedback | |
| share | compartilhar | |
| copy (verbo) | copiar | "copy" como sustantivo de marketing queda "copy". |
| delete | excluir | |
| settings | configurações | |
| home | início / página inicial | |
| breadcrumb | trilha de navegação | |

## Criterios del puntaje

| Inglés | Portugués |
| --- | --- |
| Clarity | Clareza |
| Context | Contexto |
| Constraints | Restrições |
| Output format | Formato de saída |
| Verifiability | Verificabilidade |
| Safety | Segurança |

Bandas de calidad: Weak → Fraco, Fair → Regular, Good → Bom, Excellent → Excelente.

## Términos de prompting

| Inglés | Portugués | Notas |
| --- | --- | --- |
| goal | objetivo | |
| context | contexto | |
| input / inputs | entrada / insumos | "entrada" para datos y tokens; "insumos" para el material de trabajo. |
| output | saída | |
| audience | público | |
| tone | tom | |
| length | tamanho | |
| success criteria | critérios de sucesso | |
| acceptance criteria | critérios de aceitação | |
| edge case | caso de borda | |
| assumption | suposição | |
| hallucination | alucinação | |
| prompt injection | injeção de prompt | |
| system prompt | system prompt | No se traduce. |
| few-shot / zero-shot | few-shot / zero-shot | No se traducen. |
| delimiters | delimitadores | |
| JSON schema | JSON Schema / esquema | "esquema" en prosa. |
| strict JSON | JSON estrito | |
| reasoning | raciocínio | |
| tool use | uso de ferramentas | |
| structured output | saída estruturada | |
| context window | janela de contexto | |
| debugging | depuração | |
| refactor | refatoração | |
| code review | code review | |
| test | teste | |
| summary / summarize | resumo / resumir | |
| translation | tradução | |
| follow-up question | pergunta de acompanhamento | |
| trade-off | trade-off / ponto de atenção | |
| long-tail | cauda longa | |

## Lo que no se traduce

Nombres propios y de producto: Promptea, AI Daily, Promptea Weekly, eterlab, GPT, Claude,
Gemini, Grok, Kimi, DeepSeek, Perplexity, OpenRouter, Artificial Analysis, Design Arena y
los nombres de benchmarks (Intelligence Index, GPQA Diamond, τ-bench…). Tampoco los
identificadores técnicos (`reasoning_effort`, `thinking_level`, `null`, `PASS/FAIL`) ni los
marcadores de plantilla entre corchetes cuando son valores de un esquema.

## Contenido que queda en inglés bajo `/pt`

- **AI Daily, resumen semanal y titulares**: se publican en español e inglés. `/pt` muestra
  la edición en inglés con un aviso visible.
- **Historial de versiones anterior a la v1.8.0**: se muestra en inglés, con aviso.
- **Video del recorrido** (`/pt/how-it-works`): es la grabación en inglés.
