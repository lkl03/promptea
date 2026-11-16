#!/usr/bin/env node
// scripts/release/engine-qa.mjs — v1.8.3 (zh: v1.8.7). The analysis engine in four languages,
// end to end through POST /api/analyze on a LOCAL server (never production: the
// endpoint writes telemetry where Firestore is configured).
//
//   node scripts/release/engine-qa.mjs --base=http://localhost:3181 [--json=out.json]
//
// For the 8 purposes × a real prompt written in zh, pt, es and en it checks:
//   same language   prompt language == interface language: a 0–100 score, the six
//                   dimensions, the before → after score (meta.optimizedScore),
//                   no `language_mismatch` finding, and no interface text of
//                   another language in findings / recommendations (sentinels);
//   cross interface the Portuguese prompt analysed from /es and /en, and the Chinese
//                   one from /es, /en and /pt: same task type, same finding ids, score
//                   within ±3 (docs/engine-contract.md §E), and no `language_mismatch`;
//   idempotence     re-analysing the optimized prompt does not make it grow, does
//                   not repeat a heading, and (image prompts aside) keeps the score
//                   within ±10 (§A, §C);
//   no keys         engine "deterministic" with fallbackReason "disabled", no judge.
// Exit code 1 on any failure.

import { writeFile } from "node:fs/promises";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split(/=(.*)/s).slice(0, 2)));
const BASE = (args.base ?? "http://localhost:3181").replace(/\/+$/, "");
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)) {
  console.error("engine-qa only runs against localhost (it posts to /api/analyze).");
  process.exit(2);
}
/** With provider keys configured the refiner answers instead; pass --keys=1 to skip the "no keys" assertions. */
const EXPECT_DETERMINISTIC = args.keys !== "1";

const PROMPTS = {
  text: {
    pt: "Escreva uma mensagem de boas-vindas para os novos membros de um clube de leitura. Tom amigável, no máximo 120 palavras.",
    zh: "给读书会的新成员写一段欢迎词，语气友好，不超过120字。",
    es: "Escribí un mensaje de bienvenida para nuevos socios de un club de lectura. Tono amable, menos de 120 palabras.",
    en: "Write a welcome message for new members of a book club. Friendly tone, under 120 words.",
  },
  study: {
    pt: "Explique a fotossíntese para uma criança de 12 anos com um exemplo do dia a dia e três perguntas de revisão.",
    zh: "用一个日常生活中的例子，给12岁的孩子讲解光合作用，并出三道复习题。",
    es: "Explicame la fotosíntesis para un chico de 12 años con un ejemplo cotidiano y tres preguntas de repaso.",
    en: "Explain photosynthesis to a 12 year old with one everyday example and three quiz questions.",
  },
  code: {
    pt: "Escreva uma função em TypeScript que remova duplicados de um array de objetos pelo id e mantenha o último. Inclua testes.",
    zh: "用TypeScript写一个函数，按id去除对象数组中的重复项并保留最后一个，附上测试。",
    es: "Escribí una función en TypeScript que elimine duplicados de un array de objetos por id y conserve el último. Incluí tests.",
    en: "Write a TypeScript function that deduplicates an array of objects by id and keeps the last one. Include tests.",
  },
  data: {
    pt: "Extraia nome, data e total deste texto de nota fiscal e devolva um JSON com essas três chaves.",
    zh: "从这段发票文本中提取名称、日期和总金额，返回包含这三个键的JSON。",
    es: "Extraé nombre, fecha y total de este texto de factura y devolvé un JSON con esas tres claves.",
    en: "Extract name, date and total from this invoice text and return JSON with those three keys.",
  },
  image: {
    pt: "Um farol sobre um penhasco ao entardecer, estilo aquarela, luz quente e suave, plano geral.",
    zh: "黄昏时分悬崖上的灯塔，水彩风格，温暖柔和的光线，远景。",
    es: "Un faro sobre un acantilado al atardecer, estilo acuarela, luz cálida suave, plano general.",
    en: "A lighthouse on a cliff at dusk, watercolor style, soft warm light, wide shot.",
  },
  marketing: {
    pt: "Escreva três assuntos para um e-mail que anuncia 20% de desconto em tênis de corrida para clientes recorrentes.",
    zh: "为一封面向老客户、宣布跑鞋八折优惠的邮件写三个主题行。",
    es: "Escribí tres asuntos para un mail que anuncia 20 % de descuento en zapatillas de running para clientes recurrentes.",
    en: "Write three subject lines for an email announcing a 20% discount on running shoes for returning customers.",
  },
  translation: {
    pt: "Traduza esta descrição de produto para o espanhol da Argentina, mantendo os nomes das marcas em inglês.",
    zh: "把这段产品描述翻译成阿根廷西班牙语，品牌名称保留英文。",
    es: "Traducí esta descripción de producto al inglés de Estados Unidos, manteniendo los nombres de marca.",
    en: "Translate this product description into Spanish for Argentina, keeping the brand names in English.",
  },
  summarization: {
    pt: "Resuma as seguintes anotações de reunião em cinco tópicos com responsáveis e prazos.",
    zh: "把下面的会议记录总结成五个要点，写明负责人和截止日期。",
    es: "Resumí las siguientes notas de reunión en cinco viñetas con responsables y fechas límite.",
    en: "Summarize the following meeting notes in five bullet points with owners and deadlines.",
  },
};
const LANGS = ["zh", "pt", "es", "en"];
/** Prompts that must read the same from the other interfaces (their own language first). */
const CROSS = { pt: ["es", "en"], zh: ["es", "en", "pt"] };
const DIMS = ["clarity", "context", "constraints", "output", "verifiability", "safety"];

// Interface words that exist in one language only. Matched as whole words against
// the engine's OWN text (finding titles/descriptions/fixes, recommendations,
// explanation) — never against the optimized prompt, which quotes the user.
const HAN = /\p{Script=Han}/u;
const FOREIGN = {
  zh: [/(?<![\p{L}])(the|your|missing|should|which|add|define|añadí|agregá|indicá|definí|falta|restricciones|salida|según|también|você|não|restrições|saída|adicione|defina)(?![\p{L}])/iu],
  pt: [HAN, /\b(the|your|missing|should|which|añadí|agregá|indicá|definí|falta el|falta la|restricciones|salida|según|también|qué|cómo)\b/i],
  es: [HAN, /\b(the|your|missing|should|which|você|não|restrições|saída|também|informe|adicione|defina o|falta o|são)\b/i],
  en: [HAN, /\b(falta|agregá|indicá|definí|restricciones|você|não|restrições|saída|também|adicione|según)\b/i],
};

const results = [];
const rows = [];
const ok = (group, name, pass, detail = "") => {
  results.push({ group, name, pass, detail });
  console.log(`${pass ? "ok  " : "FAIL"} [${group}] ${name}${detail ? " — " + detail : ""}`);
};

// /api/analyze allows 30 requests a minute per client (v1.8.3) and this script sends
// ~100. Locally the client address is whatever x-forwarded-for says, so each call
// presents its own (documentation-range) address; in production the platform sets
// that header, so a real client cannot do this.
let calls = 0;
async function analyze(prompt, lang, purpose) {
  calls++;
  const res = await fetch(`${BASE}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-ui-lang": lang, "x-forwarded-for": `203.0.113.${calls % 250}` },
    body: JSON.stringify({ prompt, lang, purpose, target: "claude", sessionId: "engine-qa-release-check" }),
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

const engineText = (b) =>
  [
    ...(b.findings ?? []).flatMap((f) => [f.title, f.description, f.fix]),
    ...(b.recommendations ?? []).flatMap((r) => [r.title, r.detail]),
  ]
    .filter((s) => typeof s === "string")
    .join("\n");

// Chinese headings are a short Han label with a full-width colon ("目标：").
const headings = (text) => (text.match(/^(?:#{1,4} .+|[A-ZÁÉÍÓÚÃÕÇ][A-ZÁÉÍÓÚÃÕÇ /]{3,40}:?|\p{Script=Han}[\p{Script=Han}（）/]{1,15}：)$/gmu) ?? []).map((h) => h.trim());

for (const [purpose, byLang] of Object.entries(PROMPTS)) {
  const own = {};
  for (const lang of LANGS) {
    const name = `${purpose}/${lang}`;
    try {
      const { status, body } = await analyze(byLang[lang], lang, purpose);
      if (status !== 200 || !body) {
        ok("same language", name, false, `status ${status}`);
        continue;
      }
      const meta = body.meta ?? {};
      const problems = [];
      const score = body.score;
      const after = meta.optimizedScore;
      if (!(Number.isInteger(score) && score >= 0 && score <= 100)) problems.push(`score ${score}`);
      if (!(Number.isInteger(after) && after >= 0 && after <= 100)) problems.push(`optimizedScore ${after}`);
      for (const d of DIMS) if (typeof meta.scoreBreakdown?.[d] !== "number") problems.push(`breakdown.${d} missing`);
      if (typeof body.optimizedPrompt !== "string" || body.optimizedPrompt.trim().length < 10) problems.push("no optimized prompt");
      const ids = (body.findings ?? []).map((f) => f.id);
      if (ids.includes("language_mismatch")) problems.push("language_mismatch on a prompt written in the interface language");
      const text = engineText(body);
      for (const re of FOREIGN[lang]) {
        const m = re.exec(text);
        if (m) problems.push(`foreign word "${m[0]}" in engine text: «${text.slice(Math.max(0, m.index - 30), m.index + 40).replace(/\n/g, " ")}»`);
      }
      const execution = meta.refinement?.execution ?? {};
      if (EXPECT_DETERMINISTIC) {
        if (execution.engine !== "deterministic") problems.push(`engine ${execution.engine}`);
        if (execution.fallbackReason !== "disabled") problems.push(`fallbackReason ${execution.fallbackReason}`);
        if (meta.judge !== undefined) problems.push("judge present with PROMPT_JUDGE_ENABLED off");
      }
      rows.push({ purpose, lang, score, after, taskType: meta.taskType, findings: ids.join(","), optimizedPromptLang: meta.optimizedPromptLang ?? lang });
      ok("same language", name, problems.length === 0, problems.join("; ") || `score ${score} → ${after} (${meta.taskType})`);
      if (CROSS[lang]) own[lang] = { score, taskType: meta.taskType, ids: [...ids].sort().join(",") };

      // Idempotence: analyse the optimized prompt again.
      const again = await analyze(body.optimizedPrompt, lang, purpose);
      if (again.status !== 200 || !again.body) {
        ok("idempotence", name, false, `re-analysis status ${again.status}`);
      } else {
        const first = body.optimizedPrompt;
        const second = again.body.optimizedPrompt ?? "";
        const p2 = [];
        // "Does not grow": a few characters of whitespace/punctuation normalisation are not growth.
        if (second.length > first.length + 8) p2.push(`optimized prompt grew ${first.length} → ${second.length} chars`);
        const hs = headings(second);
        const dup = hs.find((h, i) => hs.indexOf(h) !== i);
        if (dup) p2.push(`heading repeated: "${dup}"`);
        const drift = Math.abs(again.body.score - after);
        if (purpose !== "image" && drift > 10) p2.push(`score of the optimized prompt ${after} vs re-analysis ${again.body.score}`);
        ok("idempotence", name, p2.length === 0, p2.join("; ") || `${first.length} → ${second.length} chars, re-score ${again.body.score}`);
      }
    } catch (e) {
      ok("same language", name, false, e.message);
    }
  }

  // The Portuguese and Chinese prompts from the other interfaces.
  for (const [written, uis] of Object.entries(CROSS)) {
    for (const ui of uis) {
      const name = `${purpose}: ${written} prompt from /${ui}`;
      try {
        const { status, body } = await analyze(byLang[written], ui, purpose);
        const ref = own[written];
        if (status !== 200 || !body || !ref) {
          ok("cross interface", name, false, `status ${status}`);
          continue;
        }
        const ids = (body.findings ?? []).map((f) => f.id).sort().join(",");
        const problems = [];
        if (body.meta?.taskType !== ref.taskType) problems.push(`taskType ${body.meta?.taskType} vs ${ref.taskType}`);
        if (ids !== ref.ids) problems.push(`findings [${ids}] vs [${ref.ids}]`);
        if (Math.abs(body.score - ref.score) > 3) problems.push(`score ${body.score} vs ${ref.score}`);
        if (ids.includes("language_mismatch")) problems.push(`language_mismatch on a prompt written in ${written}`);
        ok("cross interface", name, problems.length === 0, problems.join("; ") || `score ${body.score} (${written} UI: ${ref.score})`);
      } catch (e) {
        ok("cross interface", name, false, e.message);
      }
    }
  }
}

const failed = results.filter((r) => !r.pass);
console.log("\nengine summary:");
console.table(rows);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
if (args.json) await writeFile(args.json, JSON.stringify({ base: BASE, at: new Date().toISOString(), results, rows }, null, 2));
process.exit(failed.length ? 1 : 0);
