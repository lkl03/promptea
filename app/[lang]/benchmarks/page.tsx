// app/[lang]/benchmarks/page.tsx
//
// v1.7.0 — AI model benchmarks: leaders by category, frontier models, an
// explorable ranking table, and what each benchmark measures.
//
// v1.8.7 — every model can be opened (its analysis: rank and score in each
// benchmark, strengths, limits, links) and up to four compared; the frontier
// section leads with a quick comparison of the top of the general benchmark.
// All of it is client state over the same validated snapshot (BenchmarkDashboard),
// shareable through the URL hash (#m=<model>, #c=<a>,<b>). There is deliberately
// no route per model: docs/release/v1.8.7/benchmarks-model-routes.md says why.
//
// Data: OpenRouter's unified benchmarks API, fetched on the server
// (lib/benchmarks). The page states its source, date and metric everywhere,
// keeps non-comparable metrics apart, and degrades honestly: live data →
// last valid snapshot (with its age) → an empty state. Nothing is invented.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getDictionary, hasLocale } from "../dictionaries";
import BenchmarkDashboard, { type DashboardCopy } from "@/components/benchmarks/BenchmarkDashboard";
import { MODEL_COPY } from "@/lib/benchmarks/modelCopy";
import { getBenchmarks } from "@/lib/benchmarks/server";
import { frontierModels, FRONTIER_TOP_N } from "@/lib/benchmarks/normalize";
import { snapshotAgeHours, type FetchFailure } from "@/lib/benchmarks/load";
import { CATEGORY_LABELS, SOURCE_INFO } from "@/lib/benchmarks/catalog";
import { frontierMatrix } from "@/lib/benchmarks/chart";
import { compactTables } from "@/lib/benchmarks/compact";
import JsonLd from "@/components/seo/JsonLd";
import { benchmarksGraph } from "@/lib/seo/pageGraphs";
import { pageMetadata } from "@/lib/seo/metadata";
import { markdownPathOf } from "@/lib/seo/registry";
import { pick, toLang, INTL_LOCALE, type Lang } from "@/lib/domain";

export const revalidate = 3600;

/** Rows in the frontier matrix: enough to read at a glance, short enough to scan. */
const MATRIX_MAX_MODELS = 12;

const COPY = {
  es: {
    metaTitle: "Benchmarks de modelos de IA",
    metaDescription: "Rankings de modelos de IA por categoría —inteligencia general, programación, agentes, ciencia, búsqueda y diseño— con fuente, fecha y métrica de cada benchmark.",
    title: "Benchmarks de modelos de IA",
    intro: "Quién lidera cada benchmark hoy, qué modelos están en la frontera y qué mide cada prueba. Cada ranking usa su propia métrica: no hay un puntaje universal.",
    live: "Datos en vivo de OpenRouter",
    asOf: "actualizados el {date}",
    fetched: "consultados el {date}",
    staleTitle: "Mostrando el último snapshot válido",
    staleBody: "No pudimos actualizar los datos ({reason}). Estos rankings son de hace {age}.",
    hours: "{n} h",
    lessThanHour: "menos de una hora",
    emptyTitle: "Los rankings no están disponibles ahora",
    reasons: {
      not_configured: "la conexión con la fuente de datos todavía no está configurada",
      unauthorized: "la fuente rechazó la credencial",
      rate_limited: "la fuente limitó temporalmente las consultas",
      timeout: "la fuente tardó demasiado en responder",
      upstream_error: "la fuente respondió con un error",
      invalid_response: "la fuente devolvió datos con un formato inesperado",
      empty: "la fuente no devolvió resultados",
    } as Record<FetchFailure, string>,
    emptyBody: "Motivo: {reason}. Preferimos no mostrar nada antes que mostrar rankings inventados o desactualizados sin aviso.",
    nav: { label: "En esta página", ranking: "Ranking", value: "Costo vs. rendimiento", frontier: "Modelos de frontera", calculator: "Calculadora de costo", about: "Qué mide cada uno" },
    dash: {
      rankingTitle: "Ranking por benchmark",
      rankingIntro: "Elegí una categoría y un benchmark: el gráfico muestra los mejores modelos de esa prueba. Cada benchmark tiene su propia métrica: compará solo dentro del mismo.",
      category: "Categoría",
      benchmarks: "Benchmarks de la categoría y su líder",
      leader: "Líder",
      topN: "Cantidad de modelos en el gráfico",
      topLabel: "Top {n}",
      fullTable: "Ver la tabla completa ({n} modelos)",
      valueTitle: "Costo vs. rendimiento",
      valueIntro: "Cada punto es un modelo: más arriba, mejor puntaje; más a la izquierda, más barato (precio de entrada, escala logarítmica). La línea punteada une los modelos que ningún otro supera a la vez en precio y puntaje.",
      valueFor: "Benchmark: {benchmark}",
      sourceLine: "{source} · {date}",
      bars: {
        title: "Top {n} · {benchmark}",
        desc: "Gráfico de barras horizontales: los {n} mejores modelos de {benchmark} ({metric}). {items}.",
        axisNote: "El eje empieza en {min}: el Elo no tiene un cero con sentido, así que las barras no son proporcionales al valor total.",
        errorNote: "La línea fina sobre la barra es ± el desvío estándar entre corridas.",
        showingOf: "mostrando {n} de {total} modelos"
      },
      scatter: {
        title: "Puntaje vs. precio de entrada",
        xAxis: "Precio de entrada (US$ por millón de tokens, escala log)",
        yAxis: "Puntaje",
        efficientLegend: "Frontera costo/rendimiento",
        keys: "Con el teclado: enfocá el gráfico y usá las flechas ← → para recorrer los modelos del más barato al más caro.",
        excluded: "{n} modelos sin precio disponible no se grafican.",
        empty: "No hay suficientes precios para graficar este benchmark. La tabla completa sigue disponible arriba.",
        desc: "Gráfico de dispersión: {n} modelos de {benchmark}, precio de entrada contra puntaje. {m} modelos forman la frontera costo/rendimiento: {frontier}.",
        score: "Puntaje",
        inputPrice: "Entrada",
        outputPrice: "Salida",
        rank: "Puesto",
        efficientBadge: "Nadie lo supera en precio y puntaje a la vez",
        perMillion: "por millón de tokens"
      },
      table: {
        search: "Buscar",
        searchPlaceholder: "Modelo o proveedor…",
        provider: "Proveedor",
        allProviders: "Todos",
        sort: "Orden",
        sortScore: "Mejor puntaje primero",
        sortScoreAsc: "Menor puntaje primero",
        sortPrice: "Precio más bajo primero",
        sortName: "Nombre (A–Z)",
        colRank: "#",
        colModel: "Modelo",
        colProvider: "Proveedor",
        colScore: "Puntaje",
        colSource: "Benchmark / fuente",
        colPrice: "Precio entrada / salida",
        priceHint: "Precio en US$ por millón de tokens de entrada / salida, según la fuente. “—” = sin dato.",
        noMatch: "Ningún modelo coincide con la búsqueda.",
        results: "{n} modelos",
        guide: "Guía de prompts",
        stddev: "Desvío estándar entre corridas"
      },
      calc: {
        title: "Calculadora de costo",
        intro: "Estimá cuánto costaría tu uso con cada modelo del benchmark elegido arriba, a precio de lista. “Mejor relación” ordena por dólares por punto de puntaje: cuanto menos, más rinde cada dólar.",
        inputTokens: "Tokens de entrada por solicitud",
        outputTokens: "Tokens de salida por solicitud",
        requests: "Cantidad de solicitudes",
        presets: "Ejemplos",
        presetChat: "Chat corto",
        presetDoc: "Documento largo",
        presetAgent: "Agente",
        sortLabel: "Ordenar por",
        sortValue: "Mejor relación",
        sortCost: "Menor costo",
        sortScore: "Mejor puntaje",
        colModel: "Modelo",
        colScore: "Puntaje",
        colCost: "Costo por solicitud",
        colPerPoint: "US$ por punto",
        colTotal: "Total ({n} solicitudes)",
        summary: "{tokensIn} de entrada y {tokensOut} de salida por solicitud, {n} solicitudes · {benchmark}",
        excluded: "{n} modelos sin precio de entrada y de salida no se incluyen: no los contamos como gratis.",
        empty: "Ningún modelo de este benchmark tiene precios disponibles para calcular el costo.",
        estimate: "Estimación con precios de lista por millón de tokens (sin cachés, lotes ni descuentos); el costo real puede variar. Los puntajes son del benchmark elegido y no son comparables con otros.",
        showAll: "Ver los {n} modelos",
        showLess: "Ver menos",
        bestAiTitle: "¿No sabés cuál elegir para tu tarea? Un benchmark no conoce tu caso.",
        bestAiCta: "Elegir la mejor IA",
        guide: "Guía"
      },
    },
    matrix: {"caption":"Posición de cada modelo de frontera en cada benchmark de capacidad general","model":"Modelo","rankIn":"Posición en {benchmark}","notMeasured":"sin medición","guide":"Guía"},
    aboutSummary: "Qué mide cada benchmark ({n})",
    frontierTitle: "Modelos de frontera",
    frontierDef: `En Promptea, un modelo es “de frontera” si está entre los ${FRONTIER_TOP_N} primeros de al menos un benchmark de capacidad general del snapshot vigente: los índices Intelligence, Coding o Agentic de Artificial Analysis, o las corridas de GPQA Diamond y τ-bench de OpenRouter.`,
    frontierWhy: "Usamos estos porque miden capacidad amplia —razonamiento, programación y trabajo agéntico—. Los rankings especializados (configuraciones de búsqueda, arenas de diseño) se muestran, pero una victoria puntual ahí no alcanza para llamar a un modelo “de frontera”. La lista cambia cuando cambian los datos.",
    frontierWhyLabel: "¿Por qué estos benchmarks?",
    matrixMore: "Mostrando {n} de {total} modelos de frontera.",
    context: "Qué mide cada benchmark",
    measures: "Qué mide",
    limits: "Limitaciones",
    source: "Fuente",
    bestAiTitle: "¿Cuál conviene para tu tarea?",
    bestAiBody: "Un benchmark no conoce tu caso. Describí lo que querés hacer y te recomendamos IA y modelo con el porqué.",
    bestAiCta: "Elegir la mejor IA",
  },
  en: {
    metaTitle: "AI model benchmarks",
    metaDescription: "AI model rankings by category — general intelligence, coding, agents, science, search and design — with the source, date and metric of every benchmark.",
    title: "AI model benchmarks",
    intro: "Who leads each benchmark today, which models are at the frontier, and what each test measures. Every ranking uses its own metric: there is no universal score.",
    live: "Live data from OpenRouter",
    asOf: "updated {date}",
    fetched: "fetched {date}",
    staleTitle: "Showing the last valid snapshot",
    staleBody: "We couldn't refresh the data ({reason}). These rankings are {age} old.",
    hours: "{n} h",
    lessThanHour: "less than an hour",
    emptyTitle: "Rankings are not available right now",
    reasons: {
      not_configured: "the data source connection is not configured yet",
      unauthorized: "the source rejected the credential",
      rate_limited: "the source is temporarily rate-limiting requests",
      timeout: "the source took too long to answer",
      upstream_error: "the source answered with an error",
      invalid_response: "the source returned data in an unexpected format",
      empty: "the source returned no results",
    } as Record<FetchFailure, string>,
    emptyBody: "Reason: {reason}. We'd rather show nothing than show invented or silently outdated rankings.",
    nav: { label: "On this page", ranking: "Ranking", value: "Cost vs. performance", frontier: "Frontier models", calculator: "Cost calculator", about: "What each one measures" },
    dash: {
      rankingTitle: "Ranking by benchmark",
      rankingIntro: "Pick a category and a benchmark: the chart shows the top models of that test. Every benchmark has its own metric: compare only within the same one.",
      category: "Category",
      benchmarks: "Benchmarks in this category and their leader",
      leader: "Leader",
      topN: "Number of models in the chart",
      topLabel: "Top {n}",
      fullTable: "View the full table ({n} models)",
      valueTitle: "Cost vs. performance",
      valueIntro: "Each dot is a model: higher is a better score, further left is cheaper (input price, log scale). The dashed line joins the models no other model beats on price and score at once.",
      valueFor: "Benchmark: {benchmark}",
      sourceLine: "{source} · {date}",
      bars: {
        title: "Top {n} · {benchmark}",
        desc: "Horizontal bar chart: the top {n} models of {benchmark} ({metric}). {items}.",
        axisNote: "The axis starts at {min}: Elo has no meaningful zero, so bar lengths are not proportional to the full value.",
        errorNote: "The thin line over a bar is ± the standard deviation across runs.",
        showingOf: "showing {n} of {total} models"
      },
      scatter: {
        title: "Score vs. input price",
        xAxis: "Input price (US$ per million tokens, log scale)",
        yAxis: "Score",
        efficientLegend: "Cost/performance frontier",
        keys: "With the keyboard: focus the chart and use the ← → arrow keys to step through models from cheapest to priciest.",
        excluded: "{n} models without a price are not plotted.",
        empty: "There are not enough prices to plot this benchmark. The full table above is still available.",
        desc: "Scatter plot: {n} models of {benchmark}, input price against score. {m} models form the cost/performance frontier: {frontier}.",
        score: "Score",
        inputPrice: "Input",
        outputPrice: "Output",
        rank: "Rank",
        efficientBadge: "No model beats it on price and score at once",
        perMillion: "per million tokens"
      },
      table: {
        search: "Search",
        searchPlaceholder: "Model or provider…",
        provider: "Provider",
        allProviders: "All",
        sort: "Sort",
        sortScore: "Best score first",
        sortScoreAsc: "Lowest score first",
        sortPrice: "Lowest price first",
        sortName: "Name (A–Z)",
        colRank: "#",
        colModel: "Model",
        colProvider: "Provider",
        colScore: "Score",
        colSource: "Benchmark / source",
        colPrice: "Input / output price",
        priceHint: "Price in US$ per million input / output tokens, as reported by the source. “—” = no data.",
        noMatch: "No model matches your search.",
        results: "{n} models",
        guide: "Prompt guide",
        stddev: "Standard deviation across runs"
      },
      calc: {
        title: "Cost calculator",
        intro: "Estimate what your usage would cost on each model of the benchmark selected above, at list price. “Best value” sorts by dollars per score point: the lower, the further each dollar goes.",
        inputTokens: "Input tokens per request",
        outputTokens: "Output tokens per request",
        requests: "Number of requests",
        presets: "Examples",
        presetChat: "Short chat",
        presetDoc: "Long document",
        presetAgent: "Agent",
        sortLabel: "Sort by",
        sortValue: "Best value",
        sortCost: "Lowest cost",
        sortScore: "Best score",
        colModel: "Model",
        colScore: "Score",
        colCost: "Cost per request",
        colPerPoint: "US$ per point",
        colTotal: "Total ({n} requests)",
        summary: "{tokensIn} in and {tokensOut} out per request, {n} requests · {benchmark}",
        excluded: "{n} models without both an input and an output price are left out: we do not count them as free.",
        empty: "No model in this benchmark has the prices needed to compute a cost.",
        estimate: "Estimate at list prices per million tokens (no caching, batching or discounts); real cost may differ. Scores come from the selected benchmark and are not comparable with others.",
        showAll: "Show all {n} models",
        showLess: "Show less",
        bestAiTitle: "Not sure which one fits your task? A benchmark doesn't know your use case.",
        bestAiCta: "Find the best AI",
        guide: "Guide"
      },
    },
    matrix: {"caption":"Each frontier model's rank in every general-capability benchmark","model":"Model","rankIn":"Rank in {benchmark}","notMeasured":"not measured","guide":"Guide"},
    aboutSummary: "What each benchmark measures ({n})",
    frontierTitle: "Frontier models",
    frontierDef: `At Promptea, a model is “frontier” when it ranks in the top ${FRONTIER_TOP_N} of at least one general-capability benchmark in the current snapshot: Artificial Analysis' Intelligence, Coding or Agentic index, or OpenRouter's GPQA Diamond and τ-bench runs.`,
    frontierWhy: "We use these because they measure broad capability — reasoning, coding and agentic work. Specialized rankings (search configurations, design arenas) are shown, but a narrow win there is not enough to call a model “frontier”. The list changes when the data does.",
    frontierWhyLabel: "Why these benchmarks?",
    matrixMore: "Showing {n} of {total} frontier models.",
    context: "What each benchmark measures",
    measures: "Measures",
    limits: "Limitations",
    source: "Source",
    bestAiTitle: "Which one fits your task?",
    bestAiBody: "A benchmark doesn't know your use case. Describe what you want to do and we'll recommend an AI and model, with the reasoning.",
    bestAiCta: "Find the best AI",
  },
  pt: {
    metaTitle: "Benchmarks de modelos de IA",
    metaDescription: "Rankings de modelos de IA por categoria — inteligência geral, programação, agentes, ciência, busca e design — com a fonte, a data e a métrica de cada benchmark.",
    title: "Benchmarks de modelos de IA",
    intro: "Quem lidera cada benchmark hoje, quais modelos estão na fronteira e o que cada teste mede. Cada ranking usa sua própria métrica: não existe uma pontuação universal.",
    live: "Dados ao vivo da OpenRouter",
    asOf: "atualizado em {date}",
    fetched: "consultado em {date}",
    staleTitle: "Mostrando o último snapshot válido",
    staleBody: "Não foi possível atualizar os dados ({reason}). Estes rankings têm {age}.",
    hours: "{n} h",
    lessThanHour: "menos de uma hora",
    emptyTitle: "Os rankings não estão disponíveis agora",
    reasons: {
      not_configured: "a conexão com a fonte de dados ainda não está configurada",
      unauthorized: "a fonte rejeitou a credencial",
      rate_limited: "a fonte está limitando as requisições temporariamente",
      timeout: "a fonte demorou demais para responder",
      upstream_error: "a fonte respondeu com um erro",
      invalid_response: "a fonte retornou dados em um formato inesperado",
      empty: "a fonte não retornou resultados",
    } as Record<FetchFailure, string>,
    emptyBody: "Motivo: {reason}. Preferimos não mostrar nada a mostrar rankings inventados ou desatualizados sem aviso.",
    nav: { label: "Nesta página", ranking: "Ranking", value: "Custo vs. desempenho", frontier: "Modelos de fronteira", calculator: "Calculadora de custo", about: "O que cada um mede" },
    dash: {
      rankingTitle: "Ranking por benchmark",
      rankingIntro: "Escolha uma categoria e um benchmark: o gráfico mostra os melhores modelos daquele teste. Cada benchmark tem sua própria métrica: compare apenas dentro do mesmo.",
      category: "Categoria",
      benchmarks: "Benchmarks desta categoria e seu líder",
      leader: "Líder",
      topN: "Número de modelos no gráfico",
      topLabel: "Top {n}",
      fullTable: "Ver a tabela completa ({n} modelos)",
      valueTitle: "Custo vs. desempenho",
      valueIntro: "Cada ponto é um modelo: quanto mais alto, melhor a pontuação; quanto mais à esquerda, mais barato (preço de entrada, escala logarítmica). A linha tracejada une os modelos que nenhum outro supera em preço e pontuação ao mesmo tempo.",
      valueFor: "Benchmark: {benchmark}",
      sourceLine: "{source} · {date}",
      bars: {
        title: "Top {n} · {benchmark}",
        desc: "Gráfico de barras horizontais: os {n} melhores modelos de {benchmark} ({metric}). {items}.",
        axisNote: "O eixo começa em {min}: o Elo não tem um zero com significado, então o comprimento das barras não é proporcional ao valor total.",
        errorNote: "A linha fina sobre a barra é ± o desvio padrão entre execuções.",
        showingOf: "mostrando {n} de {total} modelos"
      },
      scatter: {
        title: "Pontuação vs. preço de entrada",
        xAxis: "Preço de entrada (US$ por milhão de tokens, escala logarítmica)",
        yAxis: "Pontuação",
        efficientLegend: "Fronteira de custo/desempenho",
        keys: "Com o teclado: coloque o foco no gráfico e use as setas ← → para percorrer os modelos do mais barato ao mais caro.",
        excluded: "{n} modelos sem preço não aparecem no gráfico.",
        empty: "Não há preços suficientes para montar o gráfico deste benchmark. A tabela completa acima continua disponível.",
        desc: "Gráfico de dispersão: {n} modelos de {benchmark}, preço de entrada versus pontuação. {m} modelos formam a fronteira de custo/desempenho: {frontier}.",
        score: "Pontuação",
        inputPrice: "Entrada",
        outputPrice: "Saída",
        rank: "Posição",
        efficientBadge: "Nenhum modelo o supera em preço e pontuação ao mesmo tempo",
        perMillion: "por milhão de tokens"
      },
      table: {
        search: "Buscar",
        searchPlaceholder: "Modelo ou provedor…",
        provider: "Provedor",
        allProviders: "Todos",
        sort: "Ordenar",
        sortScore: "Maior pontuação primeiro",
        sortScoreAsc: "Menor pontuação primeiro",
        sortPrice: "Menor preço primeiro",
        sortName: "Nome (A–Z)",
        colRank: "#",
        colModel: "Modelo",
        colProvider: "Provedor",
        colScore: "Pontuação",
        colSource: "Benchmark / fonte",
        colPrice: "Preço de entrada / saída",
        priceHint: "Preço em US$ por milhão de tokens de entrada / saída, conforme informado pela fonte. “—” = sem dados.",
        noMatch: "Nenhum modelo corresponde à sua busca.",
        results: "{n} modelos",
        guide: "Guia de prompts",
        stddev: "Desvio padrão entre execuções"
      },
      calc: {
        title: "Calculadora de custo",
        intro: "Estime quanto o seu uso custaria em cada modelo do benchmark selecionado acima, pelo preço de tabela. “Melhor custo-benefício” ordena por dólares por ponto: quanto menor, mais longe vai cada dólar.",
        inputTokens: "Tokens de entrada por requisição",
        outputTokens: "Tokens de saída por requisição",
        requests: "Número de requisições",
        presets: "Exemplos",
        presetChat: "Chat curto",
        presetDoc: "Documento longo",
        presetAgent: "Agente",
        sortLabel: "Ordenar por",
        sortValue: "Melhor custo-benefício",
        sortCost: "Menor custo",
        sortScore: "Maior pontuação",
        colModel: "Modelo",
        colScore: "Pontuação",
        colCost: "Custo por requisição",
        colPerPoint: "US$ por ponto",
        colTotal: "Total ({n} requisições)",
        summary: "{tokensIn} de entrada e {tokensOut} de saída por requisição, {n} requisições · {benchmark}",
        excluded: "{n} modelos sem preço de entrada e de saída ficam de fora: não os contamos como gratuitos.",
        empty: "Nenhum modelo deste benchmark tem os preços necessários para calcular um custo.",
        estimate: "Estimativa com preços de tabela por milhão de tokens (sem cache, lotes ou descontos); o custo real pode ser diferente. As pontuações vêm do benchmark selecionado e não são comparáveis com as de outros.",
        showAll: "Mostrar todos os {n} modelos",
        showLess: "Mostrar menos",
        bestAiTitle: "Não sabe qual combina com a sua tarefa? Um benchmark não conhece o seu caso de uso.",
        bestAiCta: "Encontrar a melhor IA",
        guide: "Guia"
      },
    },
    matrix: {"caption":"Posição de cada modelo de fronteira em cada benchmark de capacidade geral","model":"Modelo","rankIn":"Posição em {benchmark}","notMeasured":"não medido","guide":"Guia"},
    aboutSummary: "O que cada benchmark mede ({n})",
    frontierTitle: "Modelos de fronteira",
    frontierDef: `No Promptea, um modelo é “de fronteira” quando fica entre os ${FRONTIER_TOP_N} primeiros de pelo menos um benchmark de capacidade geral no snapshot atual: os índices Intelligence, Coding ou Agentic da Artificial Analysis, ou as execuções de GPQA Diamond e τ-bench da OpenRouter.`,
    frontierWhy: "Usamos estes porque medem capacidade ampla — raciocínio, programação e trabalho agêntico. Os rankings especializados (configurações de busca, arenas de design) são exibidos, mas uma vitória pontual ali não basta para chamar um modelo de “fronteira”. A lista muda quando os dados mudam.",
    frontierWhyLabel: "Por que estes benchmarks?",
    matrixMore: "Mostrando {n} de {total} modelos de fronteira.",
    context: "O que cada benchmark mede",
    measures: "Mede",
    limits: "Limitações",
    source: "Fonte",
    bestAiTitle: "Qual combina com a sua tarefa?",
    bestAiBody: "Um benchmark não conhece o seu caso de uso. Descreva o que você quer fazer e recomendamos uma IA e um modelo, com a justificativa.",
    bestAiCta: "Encontrar a melhor IA",
  },
  zh: {
    metaTitle: "AI模型基准测试",
    metaDescription: "按类别划分的AI模型排名，涵盖通用智能、编程、智能体、科学、搜索和设计，并注明每项基准测试的来源、日期和指标。",
    title: "AI模型基准测试",
    intro: "当前谁在各项基准测试中领先、哪些模型处于前沿，以及每项测试衡量什么。每个排名都使用自己的指标：不存在通用的评分。",
    live: "来自OpenRouter的实时数据",
    asOf: "更新于{date}",
    fetched: "获取于{date}",
    staleTitle: "正在显示最近一次有效的快照",
    staleBody: "我们无法更新数据（{reason}）。这些排名是{age}前的数据。",
    hours: "{n}小时",
    lessThanHour: "不到一小时",
    emptyTitle: "排名暂时无法显示",
    reasons: {
      not_configured: "与数据源的连接尚未配置",
      unauthorized: "数据源拒绝了凭证",
      rate_limited: "数据源暂时限制了请求频率",
      timeout: "数据源响应超时",
      upstream_error: "数据源返回了错误",
      invalid_response: "数据源返回的数据格式不符合预期",
      empty: "数据源没有返回任何结果",
    } as Record<FetchFailure, string>,
    emptyBody: "原因：{reason}。我们宁可什么都不显示，也不愿展示编造的或悄悄过时的排名。",
    nav: { label: "本页内容", ranking: "排名", value: "成本与性能", frontier: "前沿模型", calculator: "成本计算器", about: "各项测试衡量什么" },
    dash: {
      rankingTitle: "按基准测试排名",
      rankingIntro: "选择一个类别和一项基准测试：图表会显示该测试中排名靠前的模型。每项基准测试都有自己的指标：只在同一项测试内进行比较。",
      category: "类别",
      benchmarks: "该类别中的基准测试及其领先者",
      leader: "领先者",
      topN: "图表中的模型数量",
      topLabel: "前{n}名",
      fullTable: "查看完整表格（{n}个模型）",
      valueTitle: "成本与性能",
      valueIntro: "每个点代表一个模型：越靠上评分越高，越靠左越便宜（输入价格，对数刻度）。虚线连接的，是在价格和评分上都没有被其他任何模型同时超越的模型。",
      valueFor: "基准测试：{benchmark}",
      sourceLine: "{source} · {date}",
      bars: {
        title: "前{n}名 · {benchmark}",
        desc: "水平条形图：{benchmark}中排名前{n}的模型（{metric}）。{items}。",
        axisNote: "坐标轴从{min}开始：Elo没有有意义的零点，因此条形长度与完整数值不成比例。",
        errorNote: "条形上的细线表示多次运行之间的±标准差。",
        showingOf: "显示{total}个模型中的{n}个"
      },
      scatter: {
        title: "评分与输入价格",
        xAxis: "输入价格（每百万token的美元价格，对数刻度）",
        yAxis: "评分",
        efficientLegend: "成本/性能前沿",
        keys: "使用键盘：聚焦图表后，用← →方向键从最便宜到最贵依次浏览各个模型。",
        excluded: "{n}个没有价格的模型未在图中绘出。",
        empty: "价格数据不足，无法为这项基准测试绘图。上方的完整表格仍然可用。",
        desc: "散点图：{benchmark}中的{n}个模型，输入价格对比评分。{m}个模型构成成本/性能前沿：{frontier}。",
        score: "评分",
        inputPrice: "输入",
        outputPrice: "输出",
        rank: "排名",
        efficientBadge: "没有任何模型能在价格和评分上同时超越它",
        perMillion: "每百万token"
      },
      table: {
        search: "搜索",
        searchPlaceholder: "模型或提供商…",
        provider: "提供商",
        allProviders: "全部",
        sort: "排序",
        sortScore: "评分从高到低",
        sortScoreAsc: "评分从低到高",
        sortPrice: "价格从低到高",
        sortName: "名称（A–Z）",
        colRank: "#",
        colModel: "模型",
        colProvider: "提供商",
        colScore: "评分",
        colSource: "基准测试 / 来源",
        colPrice: "输入 / 输出价格",
        priceHint: "价格为每百万输入 / 输出token的美元价格，以来源公布的数据为准。“—”表示无数据。",
        noMatch: "没有与搜索匹配的模型。",
        results: "{n}个模型",
        guide: "提示词指南",
        stddev: "多次运行之间的标准差"
      },
      calc: {
        title: "成本计算器",
        intro: "按标价估算你的用量在上方所选基准测试的每个模型上要花多少钱。“最佳性价比”按每个评分点的美元成本排序：数值越低，每一美元带来的效果越多。",
        inputTokens: "每次请求的输入token数",
        outputTokens: "每次请求的输出token数",
        requests: "请求次数",
        presets: "示例",
        presetChat: "简短对话",
        presetDoc: "长文档",
        presetAgent: "智能体",
        sortLabel: "排序方式",
        sortValue: "最佳性价比",
        sortCost: "成本最低",
        sortScore: "评分最高",
        colModel: "模型",
        colScore: "评分",
        colCost: "每次请求成本",
        colPerPoint: "每评分点美元成本",
        colTotal: "总计（{n}次请求）",
        summary: "每次请求{tokensIn}输入token、{tokensOut}输出token，共{n}次请求 · {benchmark}",
        excluded: "{n}个缺少输入价格或输出价格的模型未列入：我们不会把它们当作免费模型。",
        empty: "这项基准测试中没有任何模型具备计算成本所需的价格。",
        estimate: "按每百万token的标价估算（不含缓存、批处理或折扣）；实际费用可能不同。评分来自所选基准测试，不能与其他测试的评分比较。",
        showAll: "显示全部{n}个模型",
        showLess: "收起",
        bestAiTitle: "不确定哪个适合你的任务？基准测试并不了解你的使用场景。",
        bestAiCta: "找到最合适的AI",
        guide: "指南"
      },
    },
    matrix: {"caption":"每个前沿模型在各项通用能力基准测试中的排名","model":"模型","rankIn":"在{benchmark}中的排名","notMeasured":"未测量","guide":"指南"},
    aboutSummary: "各项基准测试衡量什么（{n}）",
    frontierTitle: "前沿模型",
    frontierDef: `在Promptea中，如果一个模型在当前快照里至少一项通用能力基准测试中排进前${FRONTIER_TOP_N}名，它就是“前沿模型”。这些基准测试是：Artificial Analysis的Intelligence、Coding或Agentic指数，以及OpenRouter的GPQA Diamond和τ-bench测试结果。`,
    frontierWhy: "我们选用这些测试，是因为它们衡量的是广泛的能力：推理、编程和智能体任务。专项排名（搜索配置、设计竞技场）也会展示，但在这些方面的单项胜出不足以让一个模型被称为“前沿模型”。数据变化时，名单也会随之变化。",
    frontierWhyLabel: "为什么是这些基准测试？",
    matrixMore: "显示{total}个前沿模型中的{n}个。",
    context: "各项基准测试衡量什么",
    measures: "衡量内容",
    limits: "局限性",
    source: "来源",
    bestAiTitle: "哪个适合你的任务？",
    bestAiBody: "基准测试并不了解你的使用场景。描述你想做的事，我们会推荐一款AI和一个模型，并说明理由。",
    bestAiCta: "找到最合适的AI",
  },
};

function fmtDate(iso: string | null, lang: Lang): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(INTL_LOCALE[lang], { dateStyle: "long", timeZone: "America/Argentina/Buenos_Aires" }).format(d);
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l = toLang(lang);
  const c = COPY[l];
  const path = `/${l}/benchmarks`;
  return pageMetadata({ lang: l, path, title: c.metaTitle, description: c.metaDescription, markdownPath: markdownPathOf(path) });
}

export default async function BenchmarksPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = lang as Lang;
  const c = COPY[l];

  const dict = await getDictionary(l);
  const result = await getBenchmarks();
  const snapshot = result.status === "unavailable" ? null : result.snapshot;
  const frontier = snapshot ? frontierModels(snapshot) : [];
  const matrix = snapshot ? frontierMatrix(snapshot.tables, frontier.slice(0, MATRIX_MAX_MODELS).map((m) => m.modelId)) : null;
  const now = new Date();
  const dateLabel = snapshot ? (fmtDate(snapshot.asOf, l) ?? fmtDate(snapshot.fetchedAt, l)) : null;
  // Dataset JSON-LD only when a snapshot is on the page: it describes the data shown, nothing else.
  const jsonLd = benchmarksGraph({ lang: l, title: c.title, description: c.intro, snapshot });

  const navItems = [
    { id: "ranking", label: c.nav.ranking },
    { id: "value", label: c.nav.value },
    { id: "calculator", label: c.nav.calculator },
    { id: "frontier", label: c.nav.frontier },
    { id: "about", label: c.nav.about },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:pt-8">
      <JsonLd data={jsonLd} />
      <header className="max-w-3xl">
        <h1 className="font-title text-3xl font-semibold leading-tight sm:text-4xl">{c.title}</h1>
        <p className="mt-3 text-base leading-relaxed text-ink-muted sm:text-lg">{c.intro}</p>

        {result.status === "live" ? (
          <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <span className="badge badge-success">{c.live}</span>
            <span>
              {fmtDate(result.snapshot.asOf, l)
                ? c.asOf.replace("{date}", fmtDate(result.snapshot.asOf, l)!)
                : c.fetched.replace("{date}", fmtDate(result.snapshot.fetchedAt, l) ?? "")}
            </span>
          </p>
        ) : null}
      </header>

      {result.status === "stale" ? (
        <div role="status" className="surface-soft mt-6 max-w-3xl border-l-4 p-4" style={{ borderLeftColor: "var(--warning)" }}>
          <p className="text-sm font-medium text-ink">{c.staleTitle}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {c.staleBody
              .replace("{reason}", c.reasons[result.reason])
              .replace("{age}", snapshotAgeHours(result.snapshot, now) < 1 ? c.lessThanHour : c.hours.replace("{n}", String(snapshotAgeHours(result.snapshot, now))))}
          </p>
        </div>
      ) : null}

      {!snapshot ? (
        <section className="surface mt-10 max-w-3xl p-8">
          <h2 className="font-title text-xl font-semibold">{c.emptyTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{c.emptyBody.replace("{reason}", c.reasons[result.status === "unavailable" ? result.reason : "empty"])}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/${l}/best-ai`} className="btn btn-primary h-9 px-4">
              {c.bestAiCta}
            </Link>
            <Link href={`/${l}/models`} className="btn btn-ghost h-9 px-4">
              {pick(l, { es: "Guías por modelo", en: "Model guides", pt: "Guias de modelos", zh: "模型指南" })}
            </Link>
          </div>
        </section>
      ) : (
        <>
          {/* Sticky in-page navigation: one screen of context instead of a long scroll */}
          <nav
            aria-label={c.nav.label}
            className="bm-subnav sticky top-2 z-30 mt-6 -mx-1 overflow-x-auto rounded-xl border border-line bg-[var(--overlay-fill)] px-2 py-1.5 shadow-sm"
          >
            <ul className="m-0 flex min-w-max list-none items-center gap-1 p-0 text-sm">
              {navItems.map((n) => (
                <li key={n.id}>
                  <a href={`#${n.id}`} className="block rounded-lg px-3 py-1.5 text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-10">
            <BenchmarkDashboard
              tables={compactTables(snapshot.tables)}
              lang={l}
              copy={{ ...c.dash, share: dict.benchmarks.share, ...MODEL_COPY[l] } as DashboardCopy}
              dateLabel={dateLabel}
              texts={Object.fromEntries(snapshot.tables.map((t) => [t.def.key, { measures: t.def.measures[l], limitations: t.def.limitations[l] }]))}
              frontier={{
                title: c.frontierTitle,
                def: c.frontierDef,
                why: c.frontierWhy,
                whyLabel: c.frontierWhyLabel,
                more: c.matrixMore,
                matrix,
                total: frontier.length,
                copy: c.matrix,
              }}
            />
          </div>

          <section id="about" aria-labelledby="bm-context" className="mt-16 scroll-mt-24">
            <h2 id="bm-context" className="font-title text-2xl font-semibold">{c.context}</h2>
            <details className="surface-soft mt-4 p-4">
              <summary className="cursor-pointer text-sm font-medium text-ink">{c.aboutSummary.replace("{n}", String(snapshot.tables.length))}</summary>
              <dl className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {snapshot.tables.map((t) => (
                  <div key={t.def.key} className="rounded-xl border border-line p-5">
                    <dt className="font-title text-base font-semibold text-ink">
                      {t.def.label[l]} <span className="text-xs font-normal text-ink-muted">· {CATEGORY_LABELS[t.def.category][l]}</span>
                    </dt>
                    <dd className="mt-2 space-y-2 text-sm leading-relaxed text-ink-muted">
                      <p>
                        <span className="font-medium text-ink">{c.measures}: </span>
                        {t.def.measures[l]}
                      </p>
                      <p>
                        <span className="font-medium text-ink">{c.limits}: </span>
                        {t.def.limitations[l]}
                      </p>
                      <p className="text-xs">
                        {c.source}:{" "}
                        <a href={SOURCE_INFO[t.def.source].url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
                          {SOURCE_INFO[t.def.source].name}
                        </a>{" "}
                        · {t.def.metricLabel[l]}
                      </p>
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          </section>
        </>
      )}

      <section className="surface mt-16 flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-title text-lg font-semibold">{c.bestAiTitle}</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">{c.bestAiBody}</p>
        </div>
        <Link href={`/${l}/best-ai`} className="btn btn-primary h-10 shrink-0 px-5">
          {c.bestAiCta} →
        </Link>
      </section>
    </main>
  );
}
