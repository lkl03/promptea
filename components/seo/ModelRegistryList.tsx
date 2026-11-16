// components/seo/ModelRegistryList.tsx
//
// "Current models" for one AI family, read from the verified model registry
// (lib/models.ts): what each model is for, its context window and limits, the
// capabilities Promptea relies on, how the provider recommends prompting it,
// and the date + source of the verification. Server-rendered, so the facts are
// in the HTML. Nothing is typed here: a registry update updates this section.

import { currentModels, modelSummary } from "@/lib/seo/facts";
import { formatDay } from "@/lib/seo/dates";
import { pick, type TargetAI } from "@/lib/domain";
import type { Locale } from "@/lib/seo/site";

const yes = (lang: Locale, v: boolean) => (v ? pick(lang, { es: "sí", en: "yes", pt: "sim", zh: "是" }) : pick(lang, { es: "no", en: "no", pt: "não", zh: "否" }));

export default function ModelRegistryList({ target, lang }: { target: TargetAI; lang: Locale }) {
  const models = currentModels(target);
  if (models.length === 0) return null;

  return (
    <section aria-labelledby="current-models-title" className="mt-10">
      <h2 id="current-models-title" className="text-sm font-medium">
        {pick(lang, {
          es: "Modelos vigentes que soporta Promptea",
          en: "Current models Promptea supports",
          pt: "Modelos atuais compatíveis com o Promptea",
          zh: "Promptea支持的当前模型",
        })}
      </h2>
      <p className="mt-1 text-xs opacity-70">
        {pick(lang, {
          es: "Datos tomados de la documentación oficial de cada proveedor; cada ficha indica la fecha de su última verificación.",
          en: "Data taken from each provider’s official documentation; every entry shows the date it was last verified.",
          pt: "Dados retirados da documentação oficial de cada provedor; cada item mostra a data da última verificação.",
          zh: "数据来自各提供商的官方文档；每个条目都注明了最近一次核实的日期。",
        })}
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {models.map((m) => {
          const s = modelSummary(m, lang);
          return (
            <article key={s.id} className="surface space-y-3 p-4">
              <header className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{s.label}</h3>
                {s.default ? <span className="badge badge-accent">{pick(lang, { es: "por defecto", en: "default", pt: "padrão", zh: "默认" })}</span> : null}
                {s.status === "preview" ? <span className="badge badge-info">{pick(lang, { es: "preview", en: "preview", pt: "preview", zh: "预览版" })}</span> : null}
              </header>
              <p className="text-sm opacity-85">{s.note}</p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <dt className="opacity-70">{pick(lang, { es: "Contexto", en: "Context window", pt: "Janela de contexto", zh: "上下文窗口" })}</dt>
                <dd>{s.context} tokens</dd>
                <dt className="opacity-70">{pick(lang, { es: "Salida máxima", en: "Max output", pt: "Saída máxima", zh: "最大输出" })}</dt>
                <dd>{s.maxOutput} tokens</dd>
                <dt className="opacity-70">{pick(lang, { es: "Entrada / salida", en: "Input / output", pt: "Entrada / saída", zh: "输入 / 输出" })}</dt>
                <dd>
                  {s.inputs} / {s.outputs}
                </dd>
                <dt className="opacity-70">{pick(lang, { es: "Latencia", en: "Latency", pt: "Latência", zh: "延迟" })}</dt>
                <dd>{s.latency}</dd>
                <dt className="opacity-70">{pick(lang, { es: "Salida estructurada", en: "Structured output", pt: "Saída estruturada", zh: "结构化输出" })}</dt>
                <dd>{yes(lang, s.structuredOutput)}</dd>
                <dt className="opacity-70">{pick(lang, {
                  es: "Herramientas / búsqueda nativa",
                  en: "Tool use / native search",
                  pt: "Uso de ferramentas / busca nativa",
                  zh: "工具调用 / 原生搜索",
                })}</dt>
                <dd>
                  {yes(lang, s.toolUse)} / {yes(lang, s.nativeSearch)}
                </dd>
              </dl>
              {s.promptGuidance ? (
                <p className="text-xs leading-relaxed opacity-85">
                  <strong className="font-medium">{pick(lang, { es: "Cómo promptearlo: ", en: "How to prompt it: ", pt: "Como escrever o prompt: ", zh: "提示词写法：" })}</strong>
                  {s.promptGuidance}
                </p>
              ) : null}
              <p className="text-[11px] opacity-60">
                {pick(lang, { es: "Verificado el ", en: "Verified on ", pt: "Verificado em ", zh: "核实于" })}
                {formatDay(s.verifiedAt, lang)} ·{" "}
                <a href={s.sourceUrl} rel="noreferrer noopener" target="_blank" className="underline-offset-2 hover:underline">
                  {pick(lang, { es: "fuente oficial", en: "official source", pt: "fonte oficial", zh: "官方来源" })}
                </a>
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
