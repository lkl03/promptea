# Glosario zh (chino simplificado) de Promptea

Terminología fija para todo el texto en chino simplificado (`/zh`, `zh-CN`):
- el diccionario (`app/[lang]/dictionaries/zh.json`);
- los textos en componentes y páginas;
- el contenido SEO (`lib/seo/content/*`);
- el motor de análisis (`lib/engine/*`, `lib/matcher/*`).

Las traducciones de la v1.8.7 fueron hechas por IA. **Conviene una revisión de una persona nativa** antes de promocionar `/zh` (paquete en [`zh-review.md`](./zh-review.md)).

## Voz y registro

- **Escritura**: chino simplificado, para lectores de la China continental (`zh-CN`). No uses caracteres tradicionales ni vocabulario de Taiwán (por ejemplo, 软件 y no 軟體; 信息 y no 資訊; 视频 y no 影片).
- **Tratamiento**: 你 (nunca 您, salvo en textos legales o de baja de suscripción, donde 您 queda bien). Imperativos cortos: "粘贴你的提示词", "选择一个模型".
- **Tono**: directo, claro, sin jerga de marketing ni signos de exclamación en serie.
- **Puntuación de ancho completo** en el texto chino: ，。：；？！（）「」 o “”. Los números, los nombres de producto en inglés y los códigos van con su escritura latina, **sin espacio** entre un carácter chino y una palabra latina o un número (convención del sitio: "支持 GPT 和 Claude" se escribe "支持GPT和Claude"; las dos formas existen y se eligió una).
- **Nombre del producto**: Promptea (no se traduce ni se transcribe).
- **Fechas y números**: `Intl` con `zh-CN` (2026年11月16日; 1,234.5; US$2.50). Las horas del editorial siguen en la zona horaria de Buenos Aires, igual que en los otros idiomas.
- **Sin cursivas ni mayúsculas forzadas**: no aplican al chino. Para enfatizar, negrita.

## Términos del producto

| Inglés | Chino | Notas |
| --- | --- | --- |
| prompt | 提示词 | Nunca "prompt" en el texto corrido (sí en nombres propios como "Prompt Library" si fueran marca, que no es el caso). |
| prompt engineering | 提示词工程 | |
| score | 评分 | El número: "82分". "评分" para el concepto ("提示词评分"). |
| finding | 问题 | En la lista de riesgos: "发现的问题". Si es positivo, "发现". |
| recommendation | 建议 | |
| optimized prompt | 优化后的提示词 | |
| analyzer | 分析器 | "提示词分析器". |
| analyze (verbo) | 分析 | |
| Best AI / Find the Best AI | 最佳AI / 找到最合适的AI | En el menú: "选择AI". |
| AI | AI | Se deja "AI" (más usado que 人工智能 en la interfaz). En prosa formal: 人工智能. |
| target AI | 目标AI | |
| model | 模型 | |
| template | 模板 | |
| prompt pack | 提示词合集 | |
| guide | 指南 | |
| glossary | 术语表 | |
| library | 提示词库 | La biblioteca personal del navegador. |
| benchmark | 基准测试 | En títulos cortos, "Benchmarks" puede quedar como 基准测试. |
| frontier model | 前沿模型 | |
| provider | 提供商 | |
| newsletter | 邮件通讯 | "订阅邮件通讯". |
| subscribe / unsubscribe | 订阅 / 退订 | |
| weekly digest | 每周摘要 | |
| AI Daily | AI Daily（AI日报） | El nombre de la sección queda en inglés; la primera mención puede llevar la glosa. |
| story (AI Daily) | 新闻 / 报道 | |
| feedback | 反馈 | |
| share | 分享 | |
| copy (verbo) | 复制 | |
| delete | 删除 | |
| settings | 设置 | |
| home | 首页 | |
| breadcrumb | 面包屑导航 | |
| theme | 主题 | Aqua, Metro y Glass no se traducen. |
| light / dark | 浅色 / 深色 | |

## Criterios del puntaje

| Inglés | Chino |
| --- | --- |
| Clarity | 清晰度 |
| Context | 上下文 |
| Constraints | 约束条件 |
| Output format | 输出格式 |
| Verifiability | 可验证性 |
| Safety | 安全性 |

Bandas de calidad: Weak → 较弱, Fair → 一般, Good → 良好, Excellent → 优秀.

## Términos de prompting

| Inglés | Chino | Notas |
| --- | --- | --- |
| goal | 目标 | |
| context | 上下文 / 背景 | "上下文" para el contexto del modelo; "背景" para la situación del usuario. |
| input / inputs | 输入 | |
| output | 输出 | |
| audience | 受众 | |
| tone | 语气 | |
| length | 篇幅 / 长度 | |
| success criteria | 成功标准 | |
| constraint | 约束 | |
| example (few-shot) | 示例 | "少样本示例" para few-shot. |
| system prompt | 系统提示词 | |
| token | token | Se deja en inglés ("1,000个token"). |
| context window | 上下文窗口 | |
| hallucination | 幻觉 | |
| chain of thought | 思维链 | |
| reasoning model | 推理模型 | |
| agent | 智能体 | "Agent" en nombres de producto (Claude Code, Codex). |
| tool use / function calling | 工具调用 / 函数调用 | |
| JSON schema | JSON schema | Se deja en inglés. |
| prompt injection | 提示词注入 | |
| temperature | temperature（温度） | |
| fine-tuning | 微调 | |
| RAG | RAG（检索增强生成） | |

## Lo que no se traduce

Nombres de modelos y empresas (GPT, Claude, Gemini, Grok, Kimi, DeepSeek, Qwen, GLM, MiniMax, Doubao, Perplexity; OpenAI, Anthropic, Google, Moonshot AI, Alibaba, Zhipu, ByteDance), nombres de benchmarks (Intelligence Index, GPQA Diamond, τ-bench…), identificadores de API, código, rutas, URLs, etiquetas tipo XML dentro de las plantillas (`<document>`) y claves JSON. En las plantillas de prompts se traducen el texto y los marcadores entre corchetes ("[粘贴你的文本]").
