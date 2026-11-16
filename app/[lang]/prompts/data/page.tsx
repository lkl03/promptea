// app/[lang]/prompts/data/page.tsx
import Link from "next/link";
import { hasLocale } from "../../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";
import { pick, toLang, type Lang } from "@/lib/domain";

function buildOpenLink(lang: Lang, purpose: string, target: string, prompt: string) {
  const qp = new URLSearchParams();
  qp.set("purpose", purpose);
  qp.set("target", target);
  qp.set("prompt", prompt);
  return `/${lang}/analyzer?${qp.toString()}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l = toLang(lang);

  return pageMetadata({
    lang: l,
    path: `/${l}/prompts/data`,
    title: pick(l, { es: "Prompts de datos (plantillas)", en: "Data prompts (templates)", pt: "Prompts de dados (templates)", zh: "数据提示词（模板）" }),
    description:
      pick(l, {
        es: "Plantillas para extraer datos, devolver JSON, validar esquemas y transformar textos/CSV. Abrilas en Promptea y optimizalas por IA.",
        en: "Templates to extract data, return JSON, validate schemas and transform text/CSV. Open in Promptea and optimize with AI.",
        pt: "Templates para extrair dados, retornar JSON, validar esquemas e transformar texto/CSV. Abra no Promptea e otimize com IA.",
        zh: "用于提取数据、返回JSON、校验schema以及转换文本/CSV的模板。在Promptea中打开，并借助AI进行优化。",
      }),
  });
}

export default async function DataPromptPackPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = toLang(lang);

  const title = pick(l, { es: "Prompts de datos", en: "Data prompts", pt: "Prompts de dados", zh: "数据提示词" });
  const subtitle =
    pick(l, {
      es: "Plantillas listas para copiar. Elegí un ejemplo y abrilo en Promptea.",
      en: "Copy-ready templates. Pick one and open it in Promptea.",
      pt: "Templates prontos para copiar. Escolha um e abra no Promptea.",
      zh: "可直接复制的模板。选一个，在Promptea中打开。",
    });

  const examples = [
    {
      title: pick(l, {
        es: "Extractor estricto a JSON (sin inventar)",
        en: "Strict JSON extractor (no fabrication)",
        pt: "Extrator de JSON estrito (sem inventar)",
        zh: "严格JSON提取器（不编造）",
      }),
      target: "gpt",
      purpose: "data",
      prompt:
        pick(l, {
          es: `Actuá como parser estricto.

Texto fuente:
[pegá acá]

Esquema esperado (JSON Schema o Zod):
[pegá acá]

Reglas:
- NO inventes valores.
- Si un campo no está, devolvé null y agregá un warning.
- Devolvé SOLO JSON válido (sin backticks).

Salida:
{
  "data": <objeto conforme a esquema>,
  "warnings": [<strings>]
}`,
          en: `Act as a strict parser.

Source text:
[paste here]

Expected schema (JSON Schema or Zod):
[paste here]

Rules:
- Do NOT fabricate values.
- If a field is missing, return null and add a warning.
- Return ONLY valid JSON (no backticks).

Output:
{
  "data": <object matching schema>,
  "warnings": [<strings>]
}`,
          pt: `Aja como um parser estrito.

Texto-fonte:
[cole aqui]

Esquema esperado (JSON Schema ou Zod):
[cole aqui]

Regras:
- NÃO invente valores.
- Se faltar um campo, retorne null e adicione um aviso.
- Retorne SOMENTE JSON válido (sem crases).

Saída:
{
  "data": <objeto de acordo com o esquema>,
  "warnings": [<strings>]
}`,
          zh: `请扮演一个严格的解析器。

源文本：
[粘贴到这里]

预期的schema（JSON Schema或Zod）：
[粘贴到这里]

规则：
- 不要编造任何值。
- 如果某个字段缺失，返回null，并在warnings中添加一条警告。
- 只返回有效的JSON（不要用反引号包裹）。

输出：
{
  "data": <符合schema的对象>,
  "warnings": [<字符串>]
}`,
        }),
    },
    {
      title: pick(l, {
        es: "Normalizar datos (nombres, fechas, unidades)",
        en: "Normalize data (names, dates, units)",
        pt: "Normalizar dados (nomes, datas, unidades)",
        zh: "数据规范化（名称、日期、单位）",
      }),
      target: "claude",
      purpose: "data",
      prompt:
        pick(l, {
          es: `Dataset (tabla o JSON):
[pegá acá]

Objetivo: normalizar para análisis.
Reglas:
- fechas a ISO-8601 (YYYY-MM-DD) si es posible; si no, null + warning
- unidades: convertí a [unidad estándar] (indicar supuestos)
- strings: trim + case consistente
- deduplicación: criterio explícito
Devolvé:
1) datos normalizados
2) lista de supuestos
3) warnings de ambigüedad`,
          en: `Dataset (table or JSON):
[paste here]

Goal: normalize for analysis.
Rules:
- dates to ISO-8601 (YYYY-MM-DD) when possible; otherwise null + warning
- units: convert to [standard unit] (state assumptions)
- strings: trim + consistent casing
- deduplication: explicit criteria
Return:
1) normalized data
2) list of assumptions
3) ambiguity warnings`,
          pt: `Conjunto de dados (tabela ou JSON):
[cole aqui]

Objetivo: normalizar para análise.
Regras:
- datas em ISO-8601 (YYYY-MM-DD) quando possível; caso contrário, null + aviso
- unidades: converter para [unidade padrão] (declare as suposições)
- strings: trim + padrão consistente de maiúsculas e minúsculas
- deduplicação: critério explícito
Retorne:
1) dados normalizados
2) lista de suposições
3) avisos de ambiguidade`,
          zh: `数据集（表格或JSON）：
[粘贴到这里]

目标：规范化数据，以便分析。
规则：
- 日期尽可能转换为ISO-8601（YYYY-MM-DD）；无法转换时填null并给出警告
- 单位：统一换算为[标准单位]（说明你的假设）
- 字符串：去除首尾空格，并统一大小写
- 去重：明确说明判定标准
返回：
1）规范化后的数据
2）假设清单
3）歧义警告`,
        }),
    },
    {
      title: pick(l, {
        es: "Transformar CSV (mapeo a nuevo esquema)",
        en: "Transform CSV (map to new schema)",
        pt: "Transformar CSV (mapear para um novo esquema)",
        zh: "转换CSV（映射到新的schema）",
      }),
      target: "gemini",
      purpose: "data",
      prompt:
        pick(l, {
          es: `CSV de entrada:
[pegá acá]

Quiero mapearlo al siguiente esquema destino:
[describí columnas destino + tipos + reglas]

Hacé:
- definí un plan de mapeo (col A -> col B)
- listá reglas de limpieza por campo
- detectá columnas faltantes y pedime lo mínimo
- devolvé el CSV transformado (con encabezados nuevos)
Si algo es ambiguo: null + warning.`,
          en: `Input CSV:
[paste here]

I want to map it to this target schema:
[describe target columns + types + rules]

Do:
- define a mapping plan (col A -> col B)
- list cleaning rules per field
- detect missing columns and ask only what's necessary
- return the transformed CSV (with new headers)
If ambiguous: null + warning.`,
          pt: `CSV de entrada:
[cole aqui]

Quero mapeá-lo para este esquema de destino:
[descreva as colunas de destino + tipos + regras]

Faça:
- defina um plano de mapeamento (col A -> col B)
- liste as regras de limpeza por campo
- detecte colunas ausentes e pergunte só o necessário
- retorne o CSV transformado (com os novos cabeçalhos)
Se houver ambiguidade: null + aviso.`,
          zh: `输入CSV：
[粘贴到这里]

我想把它映射到以下目标schema：
[描述目标列、类型和规则]

请执行：
- 制定映射方案（列A -> 列B）
- 按字段列出清洗规则
- 检测缺失的列，只问必要的信息
- 返回转换后的CSV（使用新的表头）
如有歧义：填null并给出警告。`,
        }),
    },
    {
      title: pick(l, {
        es: "SQL a partir de requerimiento (con supuestos)",
        en: "SQL from requirements (with assumptions)",
        pt: "SQL a partir de requisitos (com suposições)",
        zh: "根据需求编写SQL（附假设）",
      }),
      target: "deepseek",
      purpose: "data",
      prompt:
        pick(l, {
          es: `Actuá como analista de datos.

Requerimiento:
[qué quiero medir]

Esquema de tablas:
[pegá tablas + columnas]

Entregá:
1) SQL (con comentarios)
2) supuestos (si falta info)
3) tests rápidos: 3 consultas para validar que no está roto
Regla: si el requerimiento es ambiguo, preguntá hasta 3 aclaraciones antes de escribir el SQL final.`,
          en: `Act as a data analyst.

Requirement:
[what I want to measure]

Tables schema:
[paste tables + columns]

Deliver:
1) SQL (with comments)
2) assumptions (if info is missing)
3) quick tests: 3 queries to validate it’s not broken
Rule: if ambiguous, ask up to 3 clarifying questions before writing the final SQL.`,
          pt: `Aja como um analista de dados.

Requisito:
[o que quero medir]

Esquema das tabelas:
[cole tabelas + colunas]

Entregue:
1) SQL (com comentários)
2) suposições (se faltar informação)
3) testes rápidos: 3 consultas para validar que nada quebrou
Regra: se houver ambiguidade, faça até 3 perguntas de esclarecimento antes de escrever o SQL final.`,
          zh: `请扮演一名数据分析师。

需求：
[我想衡量什么]

表结构：
[粘贴表和列]

交付：
1）SQL（带注释）
2）假设（如果缺少信息）
3）快速测试：3条用于验证结果没有出错的查询
规则：如有歧义，在写最终SQL之前最多提3个澄清问题。`,
        }),
    },
    {
      title: pick(l, {
        es: "Validación de JSON contra reglas (QA)",
        en: "Validate JSON against rules (QA)",
        pt: "Validar JSON contra regras (QA)",
        zh: "按规则校验JSON（QA）",
      }),
      target: "grok",
      purpose: "data",
      prompt:
        pick(l, {
          es: `JSON:
[pegá acá]

Reglas de negocio:
[pegá acá]

Tarea:
- verificá cada regla y marcá PASS/FAIL
- para cada FAIL: path exacto (ej: data.items[2].price) + por qué
- proponé corrección mínima (patch)
Salida en Markdown con tabla de resultados + patch JSON (RFC 6902 si aplica).`,
          en: `JSON:
[paste here]

Business rules:
[paste here]

Task:
- check each rule and mark PASS/FAIL
- for each FAIL: exact path (e.g., data.items[2].price) + why
- propose minimal fix (patch)
Output in Markdown with a results table + JSON patch (RFC 6902 if applicable).`,
          pt: `JSON:
[cole aqui]

Regras de negócio:
[cole aqui]

Tarefa:
- verifique cada regra e marque PASS/FAIL
- para cada FAIL: caminho exato (ex.: data.items[2].price) + motivo
- proponha a correção mínima (patch)
Saída em Markdown com uma tabela de resultados + JSON patch (RFC 6902, se aplicável).`,
          zh: `JSON：
[粘贴到这里]

业务规则：
[粘贴到这里]

任务：
- 逐条检查规则，并标记PASS/FAIL
- 每个FAIL：给出确切路径（例如data.items[2].price）及原因
- 提出最小修复（patch）
用Markdown输出，包含结果表格和JSON patch（如适用，采用RFC 6902）。`,
        }),
    },
    {
      title: pick(l, {
        es: "Extraer entidades (NLP liviano) a tabla",
        en: "Extract entities to a table (light NLP)",
        pt: "Extrair entidades para uma tabela (NLP leve)",
        zh: "提取实体到表格（轻量NLP）",
      }),
      target: "gpt",
      purpose: "data",
      prompt:
        pick(l, {
          es: `Texto:
[pegá acá]

Extraé entidades a una tabla con columnas:
- entity_type (persona/empresa/producto/fecha/monto/lugar/otro)
- value
- confidence (0-1)
- evidence (frase exacta)

Reglas:
- evidence debe ser cita literal del texto
- si dudás, confidence < 0.6
Devolvé CSV con encabezados.`,
          en: `Text:
[paste here]

Extract entities into a table with columns:
- entity_type (person/company/product/date/amount/location/other)
- value
- confidence (0-1)
- evidence (exact quote)

Rules:
- evidence must be a literal quote from the text
- if unsure, confidence < 0.6
Return CSV with headers.`,
          pt: `Texto:
[cole aqui]

Extraia as entidades para uma tabela com as colunas:
- entity_type (person/company/product/date/amount/location/other)
- value
- confidence (0-1)
- evidence (citação exata)

Regras:
- evidence deve ser uma citação literal do texto
- em caso de dúvida, confidence < 0.6
Retorne um CSV com cabeçalhos.`,
          zh: `文本：
[粘贴到这里]

把实体提取到一个表格中，列如下：
- entity_type（person/company/product/date/amount/location/other）
- value
- confidence（0-1）
- evidence（原文引用）

规则：
- evidence必须是原文的逐字引用
- 如果不确定，confidence < 0.6
返回带表头的CSV。`,
        }),
    },
  ];

  const faq = [
    {
      q: pick(l, { es: "¿Cómo uso estas plantillas?", en: "How do I use these templates?", pt: "Como uso estes templates?", zh: "这些模板怎么用？" }),
      a:
        pick(l, {
          es: "Elegí un ejemplo y tocá “Abrir en Promptea”. Te precarga el prompt, el objetivo (Data) y el modelo sugerido.",
          en: "Pick an example and click “Open in Promptea”. It pre-fills the prompt, purpose (Data), and a suggested model.",
          pt: "Escolha um exemplo e clique em “Abrir no Promptea”. O prompt, o propósito (Dados) e um modelo sugerido já vêm preenchidos.",
          zh: "选一个示例，点击“在Promptea中打开”。系统会预先填入提示词、用途（数据/JSON）和一个推荐模型。",
        }),
    },
    {
      q: pick(l, {
        es: "¿Por qué importa elegir 'Data'?",
        en: "Why does selecting 'Data' matter?",
        pt: "Por que selecionar 'Dados' faz diferença?",
        zh: "为什么要选择“数据/JSON”用途？",
      }),
      a:
        pick(l, {
          es: "Porque Promptea prioriza estructura y verificabilidad: esquema, nulls cuando falta info, warnings y paths exactos.",
          en: "Because Promptea prioritizes structure and verifiability: schema, nulls for missing info, warnings, and exact paths.",
          pt: "Porque o Promptea prioriza estrutura e verificabilidade: esquema, null para o que falta, avisos e caminhos exatos.",
          zh: "因为Promptea会优先考虑结构和可验证性：schema、信息缺失时返回null、警告以及确切路径。",
        }),
    },
    {
      q: pick(l, {
        es: "¿Cómo reduzco alucinaciones?",
        en: "How do I reduce hallucinations?",
        pt: "Como reduzo as alucinações?",
        zh: "如何减少幻觉？",
      }),
      a:
        pick(l, {
          es: "Forzá reglas de “no inventar” + nulls + warnings, y pedí evidencia literal o paths exactos para campos críticos.",
          en: "Enforce “no fabrication” + nulls + warnings, and ask for literal evidence or exact paths for critical fields.",
          pt: "Exija “não inventar” + null + avisos e peça evidência literal ou caminhos exatos para os campos críticos.",
          zh: "强制要求“不编造”，信息缺失时返回null并给出警告；对关键字段，要求提供原文证据或确切路径。",
        }),
    },
    {
      q: pick(l, { es: "¿Qué pasa con mis datos?", en: "What happens to my data?", pt: "O que acontece com os meus dados?", zh: "我的数据会被如何处理？" }),
      a:
        pick(l, {
          es: "Promptea evita enviar el texto del prompt en telemetría. El objetivo es medir uso y calidad sin guardar contenido sensible.",
          en: "Promptea avoids sending the prompt text in telemetry. The goal is measuring usage and quality without storing sensitive content.",
          pt: "O Promptea evita enviar o texto do prompt na telemetria. O objetivo é medir uso e qualidade sem guardar conteúdo sensível.",
          zh: "Promptea会避免在遥测中发送提示词文本，目的是在不存储敏感内容的前提下衡量使用情况和质量。",
        }),
    },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((x) => ({
      "@type": "Question",
      name: x.q,
      acceptedAnswer: { "@type": "Answer", text: x.a },
    })),
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 pb-12 3xl:max-w-7xl">
      {/* JSON-LD FAQ */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="mx-auto max-w-3xl text-center space-y-2">
        <h1 className="font-title text-3xl sm:text-4xl font-semibold">{title}</h1>
        <p className="opacity-80 text-sm sm:text-base">{subtitle}</p>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs opacity-70">
          <Link href={`/${l}/prompts`} className="hover:underline underline-offset-2">
            {pick(l, { es: "← Ver todos los packs", en: "← View all packs", pt: "← Ver todos os pacotes", zh: "← 查看全部合集" })}
          </Link>
          <Link href={`/${l}/analyzer`} className="btn btn-primary h-8 px-3 text-xs">
            {pick(l, { es: "Abrir analizador →", en: "Open Analyzer →", pt: "Abrir o analisador →", zh: "打开分析器 →" })}
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {examples.map((ex, idx) => {
          const href = buildOpenLink(l, ex.purpose, ex.target, ex.prompt);
          return (
            <div key={ex.title} className="surface min-w-0 p-4 space-y-3">
              <div id={`example-${idx}-title`} className="text-sm font-medium">{ex.title}</div>
              {/* v1.8.4: scrolls inside; focusable so it can be scrolled from the keyboard (WCAG 2.1.1). */}
              <pre tabIndex={0} role="group" aria-labelledby={`example-${idx}-title`} className="surface-soft p-3 text-xs whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-h-56 overflow-auto">{ex.prompt}</pre>

              <div className="flex items-center justify-between gap-3">
                <div className="text-xs opacity-70">
                  {pick(l, {
                    es: "Se abre en el analizador con el prompt precargado.",
                    en: "Opens the analyzer with the prompt prefilled.",
                    pt: "Abre o analisador com o prompt já preenchido.",
                    zh: "将在分析器中打开，并预先填入该提示词。",
                  })}
                </div>
                <Link href={href} className="btn btn-primary h-9 px-4">
                  {pick(l, { es: "Abrir en Promptea", en: "Open in Promptea", pt: "Abrir no Promptea", zh: "在Promptea中打开" })}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ visible */}
      <section className="mt-10 surface p-5">
        <div className="text-sm font-medium">{pick(l, { es: "Preguntas frecuentes", en: "FAQ", pt: "Perguntas frequentes", zh: "常见问题" })}</div>
        <div className="mt-3 space-y-2">
          {faq.map((x) => (
            <details key={x.q} className="surface-soft p-3 rounded-2xl">
              <summary className="cursor-pointer text-sm font-medium">{x.q}</summary>
              <div className="mt-2 text-sm opacity-80">{x.a}</div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
