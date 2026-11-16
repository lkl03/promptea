// lib/seo/content/sourcesPage.ts
//
// v1.8.3 — the document behind /{lang}/sources ("How we choose and verify
// sources") and its markdown twin. Same shape as the about / methodology
// documents (PageDoc), so the page, the twin and the JSON-LD share one text.
//
// Everything that can be computed IS computed from the registry
// (lib/blog/sources.ts): how many sources each tier has, who they are and when
// they were last verified. The prose states only rules that the code enforces
// (lib/blog/types.ts, lib/blog/dates.ts) or that the routine prompts require
// (docs/editorial/). Nothing here promises a review process that does not exist.

import { MAX_BACKDATE_DAYS } from "@/lib/domain";
import { SOURCES_VERIFIED_AT, publishersByTier, sourceCounts } from "@/lib/blog/sources";
import { CONTENT_UPDATED, formatDay } from "../dates";
import { STUDIO_NAME, STUDIO_URL, type Locale } from "../site";
import type { PageDoc } from "./sitePages";

// v1.8.7: zh is optional while the Chinese text is written; it falls back to English.
const tr = (lang: Locale) => <T,>(en: T, es: T, pt: T, zh: T = en): T => ({ en, es, pt, zh })[lang];

export function sourcesDoc(lang: Locale): PageDoc {
  const t = tr(lang);
  const counts = sourceCounts();
  const total = counts[1] + counts[2] + counts[3];
  const verified = formatDay(SOURCES_VERIFIED_AT, lang);
  const list = (tier: 1 | 2 | 3) => publishersByTier(tier).join(", ");

  return {
    title: t(
      "How AI Daily chooses and verifies its sources",
      "Cómo IA al Día elige y verifica sus fuentes",
      "Como o AI Daily escolhe e verifica suas fontes",
      "AI Daily如何选择和核实来源",
    ),
    description: t(
      "The three source tiers behind AI Daily and AI Daily Tech, what a story needs before it is published, who we read, and how corrections work.",
      "Los tres niveles de fuentes de IA al Día e IA al Día Tech, qué necesita una nota para publicarse, a quién leemos y cómo funcionan las correcciones.",
      "Os três níveis de fontes do AI Daily e do AI Daily Tech, o que uma notícia precisa para ser publicada, quem lemos e como funcionam as correções.",
      "AI Daily和AI Daily Tech背后的三个来源等级、一篇报道发布前需要满足的条件、我们关注哪些信息源，以及更正如何进行。",
    ),
    h1: t("How we choose and verify sources", "Cómo elegimos y verificamos las fuentes", "Como escolhemos e verificamos as fontes", "我们如何选择和核实来源"),
    tldr: t(
      `AI Daily and AI Daily Tech publish a story only when it rests on a primary source: the company, project or institution that did the thing, saying so itself. Independent press adds context and confirmation; aggregators are only where a story is noticed and are never cited. The working list has ${total} sources in three tiers, each URL fetched and checked on ${verified}.`,
      `IA al Día e IA al Día Tech publican una nota solo cuando se apoya en una fuente primaria: la empresa, el proyecto o la institución que hizo la cosa, diciéndolo ella misma. La prensa independiente suma contexto y confirmación; los agregadores son solo el lugar donde se detecta una nota y nunca se citan. La lista de trabajo tiene ${total} fuentes en tres niveles, cada URL consultada y revisada el ${verified}.`,
      `O AI Daily e o AI Daily Tech só publicam uma notícia quando ela se apoia em uma fonte primária: a empresa, o projeto ou a instituição que fez a coisa, dizendo isso ela mesma. A imprensa independente acrescenta contexto e confirmação; os agregadores são apenas o lugar onde uma notícia é percebida e nunca são citados. A lista de trabalho tem ${total} fontes em três níveis, com cada URL acessada e conferida em ${verified}.`,
      `AI Daily和AI Daily Tech只发布以一手来源为依据的报道。一手来源是指做了这件事的公司、项目或机构亲自发布的说法。独立媒体提供背景和佐证；聚合平台只是发现新闻的地方，从不被引用。工作清单共有${total}个来源，分为三个等级，每个URL都已在${verified}访问并检查。`,
    ),
    sections: [
      {
        id: "tiers",
        heading: t("The three tiers", "Los tres niveles", "Os três níveis", "三个等级"),
        blocks: [
          {
            type: "dl",
            items: [
              {
                term: t(`Tier 1 — primary (${counts[1]} sources)`, `Nivel 1 — primarias (${counts[1]} fuentes)`, `Nível 1 — primárias (${counts[1]} fontes)`, `第1级——一手来源（${counts[1]}个）`),
                text: t(
                  "Official blogs, changelogs, release notes, documentation, repositories, papers and public filings: the party responsible for the news, in its own words. A story needs at least one. A claim about what a product does, costs or changes is only stated as fact when a Tier 1 source says it.",
                  "Blogs oficiales, changelogs, notas de versión, documentación, repositorios, papers y presentaciones públicas: el responsable de la noticia, con sus propias palabras. Una nota necesita al menos una. Lo que un producto hace, cuesta o cambia solo se afirma como hecho cuando lo dice una fuente de nivel 1.",
                  "Blogs oficiais, changelogs, notas de versão, documentação, repositórios, artigos científicos e documentos públicos: o responsável pela notícia, com suas próprias palavras. Uma notícia precisa de pelo menos uma. O que um produto faz, custa ou muda só é afirmado como fato quando uma fonte de nível 1 diz isso.",
                  "官方博客、更新日志、版本说明、文档、代码仓库、论文和公开文件：由新闻的责任方用自己的话说明。一篇报道至少需要一个这样的来源。关于某个产品能做什么、价格多少或有什么变化的说法，只有在第1级来源这样说时，才会作为事实陈述。",
                ),
              },
              {
                term: t(`Tier 2 — trusted technical press (${counts[2]} sources)`, `Nivel 2 — prensa técnica confiable (${counts[2]} fuentes)`, `Nível 2 — imprensa técnica confiável (${counts[2]} fontes)`, `第2级——可信的科技媒体（${counts[2]}个）`),
                text: t(
                  "Independent reporting with editorial standards. It is used for context, for what a company did not say, and as the second, independent source. It is never the only basis of a claim, and what it reports is attributed to it by name.",
                  "Periodismo independiente con estándares editoriales. Se usa para dar contexto, para lo que una empresa no dijo y como segunda fuente independiente. Nunca es la única base de una afirmación, y lo que informa se le atribuye por su nombre.",
                  "Jornalismo independente com padrões editoriais. É usado para dar contexto, para o que uma empresa não disse e como segunda fonte independente. Nunca é a única base de uma afirmação, e o que ele informa é atribuído a ele pelo nome.",
                  "具有编辑标准的独立报道。它们用于提供背景、补充公司没有说的内容，以及充当第二个独立来源。它们从不是某项说法的唯一依据，所报道的内容会注明出自哪家媒体。",
                ),
              },
              {
                term: t(`Tier 3 — discovery only (${counts[3]} sources)`, `Nivel 3 — solo descubrimiento (${counts[3]} fuentes)`, `Nível 3 — apenas descoberta (${counts[3]} fontes)`, `第3级——仅用于发现线索（${counts[3]}个）`),
                text: t(
                  "Aggregators, trending lists and individual commentary. They show what people are talking about and point to the original. They are never cited and never the basis of a story: if the original cannot be found and read, the story is not published.",
                  "Agregadores, listas de tendencias y comentarios de particulares. Muestran de qué se está hablando y señalan el original. Nunca se citan y nunca son la base de una nota: si el original no se puede encontrar y leer, la nota no se publica.",
                  "Agregadores, listas de tendências e comentários de indivíduos. Mostram do que se está falando e apontam para o original. Nunca são citados e nunca são a base de uma notícia: se o original não pode ser encontrado e lido, a notícia não é publicada.",
                  "聚合平台、热门榜单和个人评论。它们显示大家在讨论什么，并指向原始内容。它们从不被引用，也从不作为报道的依据：如果找不到或无法阅读原始内容，这篇报道就不会发布。",
                ),
              },
            ],
          },
        ],
      },
      {
        id: "requirements",
        heading: t("What a story needs before it is published", "Qué necesita una nota para publicarse", "O que uma notícia precisa para ser publicada", "一篇报道发布前需要满足什么条件"),
        blocks: [
          {
            type: "p",
            text: t(
              "These rules are checked by the publishing system itself, not left to judgement. A story that does not meet them is rejected, and a day with no story that meets them has no story.",
              "Estas reglas las verifica el propio sistema de publicación, no quedan a criterio. Una nota que no las cumple se rechaza, y un día sin ninguna nota que las cumpla no tiene nota.",
              "Essas regras são verificadas pelo próprio sistema de publicação, não ficam a critério de ninguém. Uma notícia que não as cumpre é rejeitada, e um dia sem nenhuma notícia que as cumpra fica sem notícia.",
              "这些规则由发布系统本身检查，而不是靠主观判断。不符合规则的报道会被拒绝；如果某一天没有符合规则的报道，那天就不发布。",
            ),
          },
          {
            type: "ul",
            items: [
              t(
                "At least one primary source, marked as such on the article.",
                "Al menos una fuente primaria, marcada como tal en la nota.",
                "Pelo menos uma fonte primária, identificada como tal na notícia.",
                "至少一个一手来源，并在文章中标明。",
              ),
              t(
                "A second source, or a written explanation of why there is only one. That explanation is shown to the reader on the article (\"Single-source story\").",
                "Una segunda fuente, o una explicación escrita de por qué hay una sola. Esa explicación se le muestra al lector en la nota (\"Nota con una sola fuente\").",
                "Uma segunda fonte, ou uma explicação por escrito de por que há apenas uma. Essa explicação é mostrada ao leitor na notícia (\"Notícia de fonte única\").",
                "第二个来源，或者书面说明为什么只有一个来源。这一说明会在文章中展示给读者（“单一来源报道”）。",
              ),
              t(
                "The event happened today, in the editorial timezone (Buenos Aires). The date of the event is stored separately from the date of publication so that a late publication cannot pass yesterday's news off as today's.",
                "El hecho ocurrió hoy, en la zona horaria editorial (Buenos Aires). La fecha del hecho se guarda aparte de la fecha de publicación para que una publicación tardía no pueda hacer pasar la noticia de ayer por la de hoy.",
                "O fato aconteceu hoje, no fuso horário editorial (Buenos Aires). A data do fato é guardada separadamente da data de publicação, para que uma publicação atrasada não faça a notícia de ontem passar pela de hoje.",
                "事件发生在今天（以编辑时区布宜诺斯艾利斯时间为准）。事件日期与发布日期分开保存，这样即使延迟发布，也无法把昨天的新闻冒充成今天的。",
              ),
              t(
                "Every source is listed under the article with its publisher, a working https link, what kind of source it is, and the day it was read.",
                "Cada fuente figura al pie de la nota con su editor, un link https que funciona, qué tipo de fuente es y el día en que se leyó.",
                "Cada fonte aparece ao pé da notícia com quem a publica, um link https que funciona, que tipo de fonte é e o dia em que foi lida.",
                "每个来源都列在文章下方，注明发布方、一个有效的https链接、来源类型以及阅读日期。",
              ),
              t(
                "The English and Spanish versions tell the same story: same facts, same number of key takeaways. Neither is a machine translation of the other.",
                "Las versiones en inglés y en español cuentan la misma nota: los mismos hechos, la misma cantidad de puntos clave. Ninguna es una traducción automática de la otra.",
                "As versões em inglês e em espanhol contam a mesma notícia: os mesmos fatos, o mesmo número de pontos principais. Nenhuma é tradução automática da outra.",
                "英文版和西班牙文版讲述的是同一条新闻：相同的事实，相同数量的要点。两个版本都不是对方的机器翻译。",
              ),
            ],
          },
        ],
      },
      {
        id: "who-we-read",
        heading: t("Who we read", "A quién leemos", "Quem lemos", "我们关注哪些信息源"),
        blocks: [
          {
            type: "p",
            text: t(
              `The list is a working tool, not a wall: a story can cite a primary source that is not on it (a company covered for the first time), under the same rules. Verified on ${verified}.`,
              `La lista es una herramienta de trabajo, no un muro: una nota puede citar una fuente primaria que no esté en ella (una empresa que se cubre por primera vez), con las mismas reglas. Verificada el ${verified}.`,
              `A lista é uma ferramenta de trabalho, não um muro: uma notícia pode citar uma fonte primária que não está nela (uma empresa coberta pela primeira vez), sob as mesmas regras. Verificada em ${verified}.`,
              `这份清单是工作工具，不是围墙：报道可以引用不在清单上的一手来源（例如第一次报道的公司），但要遵守同样的规则。核实于${verified}。`,
            ),
          },
          {
            type: "dl",
            items: [
              { term: t("Tier 1 — primary", "Nivel 1 — primarias", "Nível 1 — primárias", "第1级——一手来源"), text: list(1) },
              { term: t("Tier 2 — press", "Nivel 2 — prensa", "Nível 2 — imprensa", "第2级——媒体"), text: list(2) },
              { term: t("Tier 3 — discovery", "Nivel 3 — descubrimiento", "Nível 3 — descoberta", "第3级——发现线索"), text: list(3) },
            ],
          },
        ],
      },
      {
        id: "editions",
        heading: t("AI Daily and AI Daily Tech", "IA al Día e IA al Día Tech", "AI Daily e AI Daily Tech", "AI Daily和AI Daily Tech"),
        blocks: [
          {
            type: "p",
            text: t(
              "AI Daily covers what happened in AI: models, products, research, policy, funding. AI Daily Tech covers one technology story a day — cloud and hosting platforms, web frameworks and runtimes, developer tools, hardware — and only when it has something to do with AI or with building software. A changelog entry is not a story because it exists; it is one when it changes what someone who builds with these tools can do, must do, or pays.",
              "IA al Día cubre lo que pasó en IA: modelos, productos, investigación, regulación, inversiones. IA al Día Tech cubre una nota de tecnología por día (nube y plataformas, frameworks y runtimes web, herramientas para desarrollar, hardware) y solo cuando tiene que ver con la IA o con desarrollar software. Una entrada de changelog no es una nota por existir; lo es cuando cambia lo que puede hacer, lo que tiene que hacer o lo que paga alguien que construye con esas herramientas.",
              "O AI Daily cobre o que aconteceu em IA: modelos, produtos, pesquisa, regulação, investimentos. O AI Daily Tech cobre uma notícia de tecnologia por dia (nuvem e plataformas, frameworks e runtimes web, ferramentas de desenvolvimento, hardware) e só quando ela tem a ver com IA ou com desenvolver software. Um item de changelog não é notícia por existir; é quando muda o que pode fazer, o que precisa fazer ou o que paga quem constrói com essas ferramentas.",
              "AI Daily报道AI领域发生的事：模型、产品、研究、政策、融资。AI Daily Tech每天报道一条科技新闻（云与托管平台、Web框架与运行时、开发者工具、硬件），且只报道与AI或软件开发有关的内容。一条更新日志并不因为存在就成为新闻；只有当它改变了用这些工具做开发的人能做什么、必须做什么或要付多少钱时，才算新闻。",
            ),
          },
          {
            type: "p",
            text: t(
              "Both editions follow the same rules on this page. Both are researched with AI assistance and signed \"Promptea Editorial\": there is no invented human byline.",
              "Las dos ediciones siguen las mismas reglas de esta página. Las dos se investigan con asistencia de IA y se firman \"Promptea Editorial\": no hay una firma humana inventada.",
              "As duas edições seguem as mesmas regras desta página. As duas são pesquisadas com assistência de IA e assinadas \"Promptea Editorial\": não há assinatura humana inventada.",
              "两个版本都遵循本页的同一套规则。两者都在AI协助下完成调研，署名为“Promptea Editorial”：没有虚构的人类作者署名。",
            ),
          },
        ],
      },
      {
        id: "corrections",
        heading: t("Corrections and late stories", "Correcciones y notas tardías", "Correções e notícias atrasadas", "更正和延迟发布的报道"),
        blocks: [
          {
            type: "ul",
            items: [
              t(
                "A published article is never edited silently. A correction keeps the same URL and the original publication date, marks the article as corrected and shows a note saying what changed and when.",
                "Una nota publicada nunca se edita en silencio. Una corrección conserva la misma URL y la fecha de publicación original, marca la nota como corregida y muestra un aviso que dice qué cambió y cuándo.",
                "Uma notícia publicada nunca é editada em silêncio. Uma correção mantém a mesma URL e a data de publicação original, marca a notícia como corrigida e mostra um aviso dizendo o que mudou e quando.",
                "已发布的文章从不悄悄修改。更正会保留同一个URL和原始发布日期，把文章标记为已更正，并显示一条说明，写明改了什么、何时改的。",
              ),
              t(
                "An article that should not have been published is withdrawn: it leaves the index, the sitemap and the feeds, and its address stops working.",
                "Una nota que no debió publicarse se retira: sale del índice, del sitemap y de los feeds, y su dirección deja de funcionar.",
                "Uma notícia que não deveria ter sido publicada é retirada: sai do índice, do sitemap e dos feeds, e o endereço deixa de funcionar.",
                "不应该发布的文章会被撤下：它会从索引、站点地图和订阅源中移除，其地址也会失效。",
              ),
              t(
                `A story about an earlier event can only be published by a person, on purpose, up to ${MAX_BACKDATE_DAYS} days late, and the article shows the date of the event, the date of publication and the reason. The automated routine cannot do it.`,
                `Una nota sobre un hecho anterior solo la puede publicar una persona, a propósito, hasta ${MAX_BACKDATE_DAYS} días tarde, y la nota muestra la fecha del hecho, la fecha de publicación y el motivo. La rutina automática no puede hacerlo.`,
                `Uma notícia sobre um fato anterior só pode ser publicada por uma pessoa, de propósito, com até ${MAX_BACKDATE_DAYS} dias de atraso, e a notícia mostra a data do fato, a data de publicação e o motivo. A rotina automática não pode fazer isso.`,
                `关于更早事件的报道只能由人有意发布，最多延迟${MAX_BACKDATE_DAYS}天，文章会显示事件日期、发布日期和原因。自动化流程无法这样做。`,
              ),
            ],
          },
          {
            type: "p",
            text: t(
              `Found an error? Promptea is built by ${STUDIO_NAME}: write through the Feedback link at the bottom of any page, or at ${STUDIO_URL.replace("https://", "")}.`,
              `¿Encontraste un error? Promptea la desarrolla ${STUDIO_NAME}: escribinos desde el link Feedback al pie de cualquier página, o en ${STUDIO_URL.replace("https://", "")}.`,
              `Encontrou um erro? O Promptea é feito pela ${STUDIO_NAME}: escreva pelo link Feedback no rodapé de qualquer página, ou em ${STUDIO_URL.replace("https://", "")}.`,
              `发现了错误？Promptea由${STUDIO_NAME}开发：请通过任意页面底部的“反馈”链接联系我们，或访问${STUDIO_URL.replace("https://", "")}。`,
            ),
          },
        ],
      },
      {
        id: "limits",
        heading: t("What this does not guarantee", "Qué no garantiza esto", "O que isso não garante", "这些规则不能保证什么"),
        blocks: [
          {
            type: "ul",
            items: [
              t(
                "A primary source is primary for what its author says, not proof that it is true. A company's announcement is reported as an announcement; a preprint is reported as a preprint.",
                "Una fuente primaria es primaria respecto de lo que dice su autor, no una prueba de que sea cierto. El anuncio de una empresa se cuenta como anuncio; un preprint se cuenta como preprint.",
                "Uma fonte primária é primária quanto ao que seu autor diz, não uma prova de que seja verdade. O anúncio de uma empresa é contado como anúncio; um preprint é contado como preprint.",
                "一手来源只是其作者所说内容的一手来源，并不能证明内容属实。公司公告会作为公告来报道；预印本会作为预印本来报道。",
              ),
              t(
                "Research and writing are assisted by AI and checked against the sources by an automated process. There is no human editor reading every story before it goes out.",
                "La investigación y la redacción están asistidas por IA y se contrastan con las fuentes mediante un proceso automático. No hay un editor humano que lea cada nota antes de que salga.",
                "A pesquisa e a redação são assistidas por IA e conferidas com as fontes por um processo automático. Não há um editor humano lendo cada notícia antes de ela sair.",
                "调研和写作由AI辅助，并通过自动化流程与来源进行核对。没有人工编辑在每篇报道发出前通读。",
              ),
              t(
                "Being on the list is not an endorsement, and a source can be removed when it stops being reliable or reachable.",
                "Estar en la lista no es un aval, y una fuente se puede quitar cuando deja de ser confiable o de estar disponible.",
                "Estar na lista não é um endosso, e uma fonte pode ser removida quando deixa de ser confiável ou de estar disponível.",
                "被列入清单并不代表认可；当某个来源不再可靠或无法访问时，可以将其移除。",
              ),
            ],
          },
        ],
      },
    ],
    faq: [
      {
        q: t("Do you cite Hacker News, Reddit or social media posts?", "¿Citan Hacker News, Reddit o publicaciones de redes sociales?", "Vocês citam Hacker News, Reddit ou publicações de redes sociais?", "你们会引用Hacker News、Reddit或社交媒体帖子吗？"),
        a: t(
          "No. Aggregators and social feeds are Tier 3: they are where a story is noticed. The article cites the original document they point to, after reading it.",
          "No. Los agregadores y las redes son nivel 3: son el lugar donde se detecta una nota. La nota cita el documento original al que apuntan, después de leerlo.",
          "Não. Agregadores e redes sociais são nível 3: são o lugar onde uma notícia é percebida. A notícia cita o documento original para o qual eles apontam, depois de lê-lo.",
          "不会。聚合平台和社交媒体属于第3级：它们是发现新闻的地方。文章引用的是它们所指向的原始文件，而且是在读过之后。",
        ),
      },
      {
        q: t("Can a story have only one source?", "¿Una nota puede tener una sola fuente?", "Uma notícia pode ter uma única fonte?", "一篇报道可以只有一个来源吗？"),
        a: t(
          "Only when that source is primary and the article says why there is no second one yet, for example an announcement nobody else has reported on. The explanation is shown on the article.",
          "Solo cuando esa fuente es primaria y la nota dice por qué todavía no hay una segunda, por ejemplo un anuncio sobre el que nadie más informó. La explicación se muestra en la nota.",
          "Só quando essa fonte é primária e a notícia diz por que ainda não há uma segunda, por exemplo um anúncio sobre o qual ninguém mais informou. A explicação é mostrada na notícia.",
          "只有当这个来源是一手来源，并且文章说明了为什么暂时还没有第二个来源时才可以，例如一则还没有其他媒体报道的公告。这一说明会显示在文章中。",
        ),
      },
      {
        q: t("How is the list kept up to date?", "¿Cómo se mantiene al día la lista?", "Como a lista é mantida atualizada?", "这份清单如何保持更新？"),
        a: t(
          `Every URL on it is fetched by a script, and an address that does not answer is not added. The last full check was on ${verified}; the date on this page changes with each new check.`,
          `Un script consulta cada URL de la lista, y una dirección que no responde no se agrega. La última revisión completa fue el ${verified}; la fecha de esta página cambia con cada revisión nueva.`,
          `Um script acessa cada URL da lista, e um endereço que não responde não é adicionado. A última verificação completa foi em ${verified}; a data desta página muda a cada nova verificação.`,
          `清单上的每个URL都由脚本访问，没有响应的地址不会被加入。最近一次完整检查是在${verified}；每次重新检查后，本页上的日期都会更新。`,
        ),
      },
    ],
    updated: CONTENT_UPDATED.sources,
  };
}
