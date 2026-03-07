// lib/engine/sanitize.ts

export type SanitizedCorePrompt = {
  clean: string;
  removed: number;
  flags: string[];
};

type Rule = {
  id: string;
  re: RegExp;
};

const BLOCK_RULES: Rule[] = [
  {
    id: "role_block",
    re: /<\s*(system|developer|assistant|tool)\s*>[\s\S]*?<\s*\/\s*(system|developer|assistant|tool)\s*>/gi,
  },
  {
    id: "prompt_block",
    re: /begin\s+(system|developer)\s+prompt[\s\S]*?end\s+\1\s+prompt/gi,
  },
];

const LINE_RULES: Rule[] = [
  // jailbreak / override
  { id: "ignore_previous", re: /\b(ignore|disregard|forget)\b.*\b(previous|prior|above)\b.*\b(instruction|instructions)\b/i },
  { id: "ignore_previous_es", re: /\b(ignora|ignorá|olvida|olvidá|desestimá|desestima)\b.*\b(instrucciones?)\b.*\b(anteriores|previas)\b/i },
  { id: "developer_mode", re: /\b(developer mode|modo desarrollador|jailbreak|do anything now|dan)\b/i },

  // system / hidden prompt exfil
  { id: "system_prompt_exfil", re: /\b(reveal|show|print|dump)\b.*\b(system prompt|developer message|hidden instructions|confidential instructions)\b/i },
  { id: "system_prompt_exfil_es", re: /\b(revela|revelá|mostrá|muestra|mostrame|muéstrame)\b.*\b(prompt del sistema|mensaje del desarrollador|instrucciones ocultas|instrucciones confidenciales)\b/i },

  // secret exfil
  { id: "secret_exfil", re: /\b(api key|secret key|private key|password|token|access token|keys and secrets)\b/i },
  { id: "secret_exfil_es", re: /\b(credenciales|contraseña|clave privada|token|secreto|secretos)\b/i },
];

function normalize(input: string) {
  return String(input ?? "").replace(/\r\n/g, "\n").trim();
}

function compactBlankLines(text: string) {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sanitizeCorePrompt(input: string): SanitizedCorePrompt {
  let text = normalize(input);
  if (!text) {
    return { clean: "", removed: 0, flags: [] };
  }

  let removed = 0;
  const flags = new Set<string>();

  // 1) remover bloques claramente peligrosos
  for (const rule of BLOCK_RULES) {
    const matches = text.match(rule.re);
    if (matches?.length) {
      removed += matches.length;
      flags.add(rule.id);
      text = text.replace(rule.re, "").trim();
    }
  }

  // 2) remover líneas sospechosas, pero conservar el resto del prompt
  const kept: string[] = [];
  for (const line of text.split("\n")) {
    const candidate = line.trim();

    if (!candidate) {
      kept.push("");
      continue;
    }

    const hit = LINE_RULES.find((rule) => rule.re.test(candidate));
    if (hit) {
      removed += 1;
      flags.add(hit.id);
      continue;
    }

    kept.push(line);
  }

  const clean = compactBlankLines(kept.join("\n"));

  return {
    clean,
    removed,
    flags: Array.from(flags),
  };
}