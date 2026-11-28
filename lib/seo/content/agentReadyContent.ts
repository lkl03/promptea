// lib/seo/content/agentReadyContent.ts
//
// v1.9.0 — the copy of /{lang}/agent-ready that both the HTML page and its
// markdown twin print (how it works, what the score measures, the FAQ), read
// from the same dictionaries the interface uses, plus the part written for
// agents: how to use Promptea's MCP server.

import en from "@/app/[lang]/dictionaries/en.json";
import es from "@/app/[lang]/dictionaries/es.json";
import pt from "@/app/[lang]/dictionaries/pt.json";
import zh from "@/app/[lang]/dictionaries/zh.json";
import { CHECK_WEIGHTS } from "@/lib/agentReady/weights";
import { CATEGORIES, CHECK_IDS, type Category } from "@/lib/agentReady/types";
import type { Lang } from "@/lib/domain";
import type { AgentReadyDict } from "@/lib/uiDict";
import type { DocSection } from "./sitePages";

const COPY: Record<Lang, AgentReadyDict> = { en: en.agentReady, es: es.agentReady, pt: pt.agentReady, zh: zh.agentReady };

export function agentReadyCopy(lang: Lang): AgentReadyDict {
  return COPY[lang];
}

export function agentReadyFaq(lang: Lang): Array<{ q: string; a: string }> {
  return COPY[lang].faq;
}

export const categoryPoints = (category: Category): number => CHECK_IDS.filter((id) => id.startsWith(`${category}.`)).reduce((s, id) => s + CHECK_WEIGHTS[id], 0);

const tr = (lang: Lang) => <T,>(e: T, s: T, p: T, z: T): T => ({ en: e, es: s, pt: p, zh: z })[lang];

/** Sections of the markdown twin. */
export function agentReadySections(lang: Lang): DocSection[] {
  const c = COPY[lang];
  const t = tr(lang);
  return [
    { id: "how", heading: c.howTitle, blocks: [{ type: "ol", items: c.how }] },
    {
      id: "score",
      heading: c.weightsTitle,
      blocks: [
        { type: "p", text: c.weightsBody },
        {
          type: "dl",
          items: CATEGORIES.map((category) => ({
            term: `${c.categories[category]} (${c.weightsUnit.replace("{n}", String(categoryPoints(category)))})`,
            text: CHECK_IDS.filter((id) => id.startsWith(`${category}.`))
              .map((id) => `${c.checks[id].title} (${CHECK_WEIGHTS[id]})`)
              .join(", "),
          })),
        },
      ],
    },
    {
      id: "agents",
      heading: t("For agents: the MCP server", "Para agentes: el servidor MCP", "Para agentes: o servidor MCP", "面向智能体：MCP服务器"),
      blocks: [
        {
          type: "p",
          text: t(
            "Each audit is saved as a session and gets its own remote MCP server (Streamable HTTP) at `/api/mcp/<session id>`. The page shows the address after a scan; in Claude Code it is added with `claude mcp add --transport http promptea-audit <address>`. Sessions last 14 days.",
            "Cada auditoría se guarda como una sesión y tiene su propio servidor MCP remoto (Streamable HTTP) en `/api/mcp/<id de sesión>`. La página muestra la dirección después del escaneo; en Claude Code se agrega con `claude mcp add --transport http promptea-audit <dirección>`. Las sesiones duran 14 días.",
            "Cada auditoria é salva como uma sessão e ganha o próprio servidor MCP remoto (Streamable HTTP) em `/api/mcp/<id da sessão>`. A página mostra o endereço depois do escaneamento; no Claude Code ele é adicionado com `claude mcp add --transport http promptea-audit <endereço>`. As sessões duram 14 dias.",
            "每次审计都会保存为一个会话，并拥有自己的远程MCP服务器（Streamable HTTP），地址为 `/api/mcp/<会话ID>`。扫描完成后页面会显示该地址；在Claude Code中用 `claude mcp add --transport http promptea-audit <地址>` 添加。会话保留14天。",
          ),
        },
        {
          type: "dl",
          items: [
            { term: "get_audit", text: t("The score, the level, each check's status and the detected stack.", "El puntaje, el nivel, el estado de cada chequeo y el stack detectado.", "A nota, o nível, o estado de cada verificação e o stack detectado.", "评分、等级、每项检查的状态和检测到的技术栈。") },
            { term: "list_fixes", text: t("The open fixes in the order to work on them.", "Los arreglos abiertos en el orden en que conviene hacerlos.", "As correções abertas na ordem em que convém fazê-las.", "按处理顺序列出待完成的修复。") },
            { term: "get_fix", text: t("One fix: why, steps, files with code and an acceptance command.", "Un arreglo: por qué, pasos, archivos con código y un comando de aceptación.", "Uma correção: por quê, passos, arquivos com código e um comando de aceitação.", "单项修复：原因、步骤、含代码的文件和验收命令。") },
            { term: "mark_fix_done", text: t("Records that a fix was implemented.", "Registra que un arreglo quedó implementado.", "Registra que uma correção foi implementada.", "记录某项修复已实现。") },
            { term: "recheck", text: t("Scans the live site again and reports what changed.", "Vuelve a escanear el sitio en vivo e informa qué cambió.", "Escaneia de novo o site no ar e informa o que mudou.", "重新扫描线上网站并报告变化。") },
          ],
        },
        {
          type: "p",
          text: t(
            "Discovery: the server card is at `/api/mcp/server-card` and the AI catalog at `/.well-known/ard.json` (also `/.well-known/ai-catalog.json`). The audit itself runs from the page; there is no public scanning API.",
            "Descubrimiento: la server card está en `/api/mcp/server-card` y el catálogo de IA en `/.well-known/ard.json` (también en `/.well-known/ai-catalog.json`). La auditoría se corre desde la página; no hay una API pública de escaneo.",
            "Descoberta: o server card fica em `/api/mcp/server-card` e o catálogo de IA em `/.well-known/ard.json` (também em `/.well-known/ai-catalog.json`). A auditoria roda a partir da página; não há uma API pública de escaneamento.",
            "发现机制：服务器卡片位于 `/api/mcp/server-card`，AI目录位于 `/.well-known/ard.json`（以及 `/.well-known/ai-catalog.json`）。审计需在页面上发起；没有公开的扫描API。",
          ),
        },
      ],
    },
  ];
}
