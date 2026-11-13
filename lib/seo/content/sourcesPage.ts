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

const tr = (lang: Locale) => <T,>(en: T, es: T, pt: T): T => ({ en, es, pt })[lang];

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
    ),
    description: t(
      "The three source tiers behind AI Daily and AI Daily Tech, what a story needs before it is published, who we read, and how corrections work.",
      "Los tres niveles de fuentes de IA al Día e IA al Día Tech, qué necesita una nota para publicarse, a quién leemos y cómo funcionan las correcciones.",
      "Os três níveis de fontes do AI Daily e do AI Daily Tech, o que uma notícia precisa para ser publicada, quem lemos e como funcionam as correções.",
    ),
    h1: t("How we choose and verify sources", "Cómo elegimos y verificamos las fuentes", "Como escolhemos e verificamos as fontes"),
    tldr: t(
      `AI Daily and AI Daily Tech publish a story only when it rests on a primary source: the company, project or institution that did the thing, saying so itself. Independent press adds context and confirmation; aggregators are only where a story is noticed and are never cited. The working list has ${total} sources in three tiers, each URL fetched and checked on ${verified}.`,
      `IA al Día e IA al Día Tech publican una nota solo cuando se apoya en una fuente primaria: la empresa, el proyecto o la institución que hizo la cosa, diciéndolo ella misma. La prensa independiente suma contexto y confirmación; los agregadores son solo el lugar donde se detecta una nota y nunca se citan. La lista de trabajo tiene ${total} fuentes en tres niveles, cada URL consultada y revisada el ${verified}.`,
      `O AI Daily e o AI Daily Tech só publicam uma notícia quando ela se apoia em uma fonte primária: a empresa, o projeto ou a instituição que fez a coisa, dizendo isso ela mesma. A imprensa independente acrescenta contexto e confirmação; os agregadores são apenas o lugar onde uma notícia é percebida e nunca são citados. A lista de trabalho tem ${total} fontes em três níveis, com cada URL acessada e conferida em ${verified}.`,
    ),
    sections: [
      {
        id: "tiers",
        heading: t("The three tiers", "Los tres niveles", "Os três níveis"),
        blocks: [
          {
            type: "dl",
            items: [
              {
                term: t(`Tier 1 — primary (${counts[1]} sources)`, `Nivel 1 — primarias (${counts[1]} fuentes)`, `Nível 1 — primárias (${counts[1]} fontes)`),
                text: t(
                  "Official blogs, changelogs, release notes, documentation, repositories, papers and public filings: the party responsible for the news, in its own words. A story needs at least one. A claim about what a product does, costs or changes is only stated as fact when a Tier 1 source says it.",
                  "Blogs oficiales, changelogs, notas de versión, documentación, repositorios, papers y presentaciones públicas: el responsable de la noticia, con sus propias palabras. Una nota necesita al menos una. Lo que un producto hace, cuesta o cambia solo se afirma como hecho cuando lo dice una fuente de nivel 1.",
                  "Blogs oficiais, changelogs, notas de versão, documentação, repositórios, artigos científicos e documentos públicos: o responsável pela notícia, com suas próprias palavras. Uma notícia precisa de pelo menos uma. O que um produto faz, custa ou muda só é afirmado como fato quando uma fonte de nível 1 diz isso.",
                ),
              },
              {
                term: t(`Tier 2 — trusted technical press (${counts[2]} sources)`, `Nivel 2 — prensa técnica confiable (${counts[2]} fuentes)`, `Nível 2 — imprensa técnica confiável (${counts[2]} fontes)`),
                text: t(
                  "Independent reporting with editorial standards. It is used for context, for what a company did not say, and as the second, independent source. It is never the only basis of a claim, and what it reports is attributed to it by name.",
                  "Periodismo independiente con estándares editoriales. Se usa para dar contexto, para lo que una empresa no dijo y como segunda fuente independiente. Nunca es la única base de una afirmación, y lo que informa se le atribuye por su nombre.",
                  "Jornalismo independente com padrões editoriais. É usado para dar contexto, para o que uma empresa não disse e como segunda fonte independente. Nunca é a única base de uma afirmação, e o que ele informa é atribuído a ele pelo nome.",
                ),
              },
              {
                term: t(`Tier 3 — discovery only (${counts[3]} sources)`, `Nivel 3 — solo descubrimiento (${counts[3]} fuentes)`, `Nível 3 — apenas descoberta (${counts[3]} fontes)`),
                text: t(
                  "Aggregators, trending lists and individual commentary. They show what people are talking about and point to the original. They are never cited and never the basis of a story: if the original cannot be found and read, the story is not published.",
                  "Agregadores, listas de tendencias y comentarios de particulares. Muestran de qué se está hablando y señalan el original. Nunca se citan y nunca son la base de una nota: si el original no se puede encontrar y leer, la nota no se publica.",
                  "Agregadores, listas de tendências e comentários de indivíduos. Mostram do que se está falando e apontam para o original. Nunca são citados e nunca são a base de uma notícia: se o original não pode ser encontrado e lido, a notícia não é publicada.",
                ),
              },
            ],
          },
        ],
      },
      {
        id: "requirements",
        heading: t("What a story needs before it is published", "Qué necesita una nota para publicarse", "O que uma notícia precisa para ser publicada"),
        blocks: [
          {
            type: "p",
            text: t(
              "These rules are checked by the publishing system itself, not left to judgement. A story that does not meet them is rejected, and a day with no story that meets them has no story.",
              "Estas reglas las verifica el propio sistema de publicación, no quedan a criterio. Una nota que no las cumple se rechaza, y un día sin ninguna nota que las cumpla no tiene nota.",
              "Essas regras são verificadas pelo próprio sistema de publicação, não ficam a critério de ninguém. Uma notícia que não as cumpre é rejeitada, e um dia sem nenhuma notícia que as cumpra fica sem notícia.",
            ),
          },
          {
            type: "ul",
            items: [
              t(
                "At least one primary source, marked as such on the article.",
                "Al menos una fuente primaria, marcada como tal en la nota.",
                "Pelo menos uma fonte primária, identificada como tal na notícia.",
              ),
              t(
                "A second source, or a written explanation of why there is only one. That explanation is shown to the reader on the article (\"Single-source story\").",
                "Una segunda fuente, o una explicación escrita de por qué hay una sola. Esa explicación se le muestra al lector en la nota (\"Nota con una sola fuente\").",
                "Uma segunda fonte, ou uma explicação por escrito de por que há apenas uma. Essa explicação é mostrada ao leitor na notícia (\"Notícia de fonte única\").",
              ),
              t(
                "The event happened today, in the editorial timezone (Buenos Aires). The date of the event is stored separately from the date of publication so that a late publication cannot pass yesterday's news off as today's.",
                "El hecho ocurrió hoy, en la zona horaria editorial (Buenos Aires). La fecha del hecho se guarda aparte de la fecha de publicación para que una publicación tardía no pueda hacer pasar la noticia de ayer por la de hoy.",
                "O fato aconteceu hoje, no fuso horário editorial (Buenos Aires). A data do fato é guardada separadamente da data de publicação, para que uma publicação atrasada não faça a notícia de ontem passar pela de hoje.",
              ),
              t(
                "Every source is listed under the article with its publisher, a working https link, what kind of source it is, and the day it was read.",
                "Cada fuente figura al pie de la nota con su editor, un link https que funciona, qué tipo de fuente es y el día en que se leyó.",
                "Cada fonte aparece ao pé da notícia com quem a publica, um link https que funciona, que tipo de fonte é e o dia em que foi lida.",
              ),
              t(
                "The English and Spanish versions tell the same story: same facts, same number of key takeaways. Neither is a machine translation of the other.",
                "Las versiones en inglés y en español cuentan la misma nota: los mismos hechos, la misma cantidad de puntos clave. Ninguna es una traducción automática de la otra.",
                "As versões em inglês e em espanhol contam a mesma notícia: os mesmos fatos, o mesmo número de pontos principais. Nenhuma é tradução automática da outra.",
              ),
            ],
          },
        ],
      },
      {
        id: "who-we-read",
        heading: t("Who we read", "A quién leemos", "Quem lemos"),
        blocks: [
          {
            type: "p",
            text: t(
              `The list is a working tool, not a wall: a story can cite a primary source that is not on it (a company covered for the first time), under the same rules. Verified on ${verified}.`,
              `La lista es una herramienta de trabajo, no un muro: una nota puede citar una fuente primaria que no esté en ella (una empresa que se cubre por primera vez), con las mismas reglas. Verificada el ${verified}.`,
              `A lista é uma ferramenta de trabalho, não um muro: uma notícia pode citar uma fonte primária que não está nela (uma empresa coberta pela primeira vez), sob as mesmas regras. Verificada em ${verified}.`,
            ),
          },
          {
            type: "dl",
            items: [
              { term: t("Tier 1 — primary", "Nivel 1 — primarias", "Nível 1 — primárias"), text: list(1) },
              { term: t("Tier 2 — press", "Nivel 2 — prensa", "Nível 2 — imprensa"), text: list(2) },
              { term: t("Tier 3 — discovery", "Nivel 3 — descubrimiento", "Nível 3 — descoberta"), text: list(3) },
            ],
          },
        ],
      },
      {
        id: "editions",
        heading: t("AI Daily and AI Daily Tech", "IA al Día e IA al Día Tech", "AI Daily e AI Daily Tech"),
        blocks: [
          {
            type: "p",
            text: t(
              "AI Daily covers what happened in AI: models, products, research, policy, funding. AI Daily Tech covers one technology story a day — cloud and hosting platforms, web frameworks and runtimes, developer tools, hardware — and only when it has something to do with AI or with building software. A changelog entry is not a story because it exists; it is one when it changes what someone who builds with these tools can do, must do, or pays.",
              "IA al Día cubre lo que pasó en IA: modelos, productos, investigación, regulación, inversiones. IA al Día Tech cubre una nota de tecnología por día (nube y plataformas, frameworks y runtimes web, herramientas para desarrollar, hardware) y solo cuando tiene que ver con la IA o con desarrollar software. Una entrada de changelog no es una nota por existir; lo es cuando cambia lo que puede hacer, lo que tiene que hacer o lo que paga alguien que construye con esas herramientas.",
              "O AI Daily cobre o que aconteceu em IA: modelos, produtos, pesquisa, regulação, investimentos. O AI Daily Tech cobre uma notícia de tecnologia por dia (nuvem e plataformas, frameworks e runtimes web, ferramentas de desenvolvimento, hardware) e só quando ela tem a ver com IA ou com desenvolver software. Um item de changelog não é notícia por existir; é quando muda o que pode fazer, o que precisa fazer ou o que paga quem constrói com essas ferramentas.",
            ),
          },
          {
            type: "p",
            text: t(
              "Both editions follow the same rules on this page. Both are researched with AI assistance and signed \"Promptea Editorial\": there is no invented human byline.",
              "Las dos ediciones siguen las mismas reglas de esta página. Las dos se investigan con asistencia de IA y se firman \"Promptea Editorial\": no hay una firma humana inventada.",
              "As duas edições seguem as mesmas regras desta página. As duas são pesquisadas com assistência de IA e assinadas \"Promptea Editorial\": não há assinatura humana inventada.",
            ),
          },
        ],
      },
      {
        id: "corrections",
        heading: t("Corrections and late stories", "Correcciones y notas tardías", "Correções e notícias atrasadas"),
        blocks: [
          {
            type: "ul",
            items: [
              t(
                "A published article is never edited silently. A correction keeps the same URL and the original publication date, marks the article as corrected and shows a note saying what changed and when.",
                "Una nota publicada nunca se edita en silencio. Una corrección conserva la misma URL y la fecha de publicación original, marca la nota como corregida y muestra un aviso que dice qué cambió y cuándo.",
                "Uma notícia publicada nunca é editada em silêncio. Uma correção mantém a mesma URL e a data de publicação original, marca a notícia como corrigida e mostra um aviso dizendo o que mudou e quando.",
              ),
              t(
                "An article that should not have been published is withdrawn: it leaves the index, the sitemap and the feeds, and its address stops working.",
                "Una nota que no debió publicarse se retira: sale del índice, del sitemap y de los feeds, y su dirección deja de funcionar.",
                "Uma notícia que não deveria ter sido publicada é retirada: sai do índice, do sitemap e dos feeds, e o endereço deixa de funcionar.",
              ),
              t(
                `A story about an earlier event can only be published by a person, on purpose, up to ${MAX_BACKDATE_DAYS} days late, and the article shows the date of the event, the date of publication and the reason. The automated routine cannot do it.`,
                `Una nota sobre un hecho anterior solo la puede publicar una persona, a propósito, hasta ${MAX_BACKDATE_DAYS} días tarde, y la nota muestra la fecha del hecho, la fecha de publicación y el motivo. La rutina automática no puede hacerlo.`,
                `Uma notícia sobre um fato anterior só pode ser publicada por uma pessoa, de propósito, com até ${MAX_BACKDATE_DAYS} dias de atraso, e a notícia mostra a data do fato, a data de publicação e o motivo. A rotina automática não pode fazer isso.`,
              ),
            ],
          },
          {
            type: "p",
            text: t(
              `Found an error? Promptea is built by ${STUDIO_NAME}: write through the Feedback link at the bottom of any page, or at ${STUDIO_URL.replace("https://", "")}.`,
              `¿Encontraste un error? Promptea la desarrolla ${STUDIO_NAME}: escribinos desde el link Feedback al pie de cualquier página, o en ${STUDIO_URL.replace("https://", "")}.`,
              `Encontrou um erro? O Promptea é feito pela ${STUDIO_NAME}: escreva pelo link Feedback no rodapé de qualquer página, ou em ${STUDIO_URL.replace("https://", "")}.`,
            ),
          },
        ],
      },
      {
        id: "limits",
        heading: t("What this does not guarantee", "Qué no garantiza esto", "O que isso não garante"),
        blocks: [
          {
            type: "ul",
            items: [
              t(
                "A primary source is primary for what its author says, not proof that it is true. A company's announcement is reported as an announcement; a preprint is reported as a preprint.",
                "Una fuente primaria es primaria respecto de lo que dice su autor, no una prueba de que sea cierto. El anuncio de una empresa se cuenta como anuncio; un preprint se cuenta como preprint.",
                "Uma fonte primária é primária quanto ao que seu autor diz, não uma prova de que seja verdade. O anúncio de uma empresa é contado como anúncio; um preprint é contado como preprint.",
              ),
              t(
                "Research and writing are assisted by AI and checked against the sources by an automated process. There is no human editor reading every story before it goes out.",
                "La investigación y la redacción están asistidas por IA y se contrastan con las fuentes mediante un proceso automático. No hay un editor humano que lea cada nota antes de que salga.",
                "A pesquisa e a redação são assistidas por IA e conferidas com as fontes por um processo automático. Não há um editor humano lendo cada notícia antes de ela sair.",
              ),
              t(
                "Being on the list is not an endorsement, and a source can be removed when it stops being reliable or reachable.",
                "Estar en la lista no es un aval, y una fuente se puede quitar cuando deja de ser confiable o de estar disponible.",
                "Estar na lista não é um endosso, e uma fonte pode ser removida quando deixa de ser confiável ou de estar disponível.",
              ),
            ],
          },
        ],
      },
    ],
    faq: [
      {
        q: t("Do you cite Hacker News, Reddit or social media posts?", "¿Citan Hacker News, Reddit o publicaciones de redes sociales?", "Vocês citam Hacker News, Reddit ou publicações de redes sociais?"),
        a: t(
          "No. Aggregators and social feeds are Tier 3: they are where a story is noticed. The article cites the original document they point to, after reading it.",
          "No. Los agregadores y las redes son nivel 3: son el lugar donde se detecta una nota. La nota cita el documento original al que apuntan, después de leerlo.",
          "Não. Agregadores e redes sociais são nível 3: são o lugar onde uma notícia é percebida. A notícia cita o documento original para o qual eles apontam, depois de lê-lo.",
        ),
      },
      {
        q: t("Can a story have only one source?", "¿Una nota puede tener una sola fuente?", "Uma notícia pode ter uma única fonte?"),
        a: t(
          "Only when that source is primary and the article says why there is no second one yet, for example an announcement nobody else has reported on. The explanation is shown on the article.",
          "Solo cuando esa fuente es primaria y la nota dice por qué todavía no hay una segunda, por ejemplo un anuncio sobre el que nadie más informó. La explicación se muestra en la nota.",
          "Só quando essa fonte é primária e a notícia diz por que ainda não há uma segunda, por exemplo um anúncio sobre o qual ninguém mais informou. A explicação é mostrada na notícia.",
        ),
      },
      {
        q: t("How is the list kept up to date?", "¿Cómo se mantiene al día la lista?", "Como a lista é mantida atualizada?"),
        a: t(
          `Every URL on it is fetched by a script, and an address that does not answer is not added. The last full check was on ${verified}; the date on this page changes with each new check.`,
          `Un script consulta cada URL de la lista, y una dirección que no responde no se agrega. La última revisión completa fue el ${verified}; la fecha de esta página cambia con cada revisión nueva.`,
          `Um script acessa cada URL da lista, e um endereço que não responde não é adicionado. A última verificação completa foi em ${verified}; a data desta página muda a cada nova verificação.`,
        ),
      },
    ],
    updated: CONTENT_UPDATED.sources,
  };
}
