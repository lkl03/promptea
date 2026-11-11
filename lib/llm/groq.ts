import type { Lang } from "@/lib/domain";
// lib/llm/groq.ts
//
// Optional Groq API integration. The app fully works without it.
// Set GROQ_API_KEY (server-only) in your hosting environment to enable
// LLM-assisted follow-up hints (see app/api/analyze-llm). The adaptive
// prompt-refinement layer moved to lib/refine/adaptive.ts in v1.2.0.
// Set GROQ_MODEL to override the default inference model.
// Never expose this key to the client.

const GROQ_DEFAULT_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const GROQ_TIMEOUT_MS = 8000;

export type GroqHint = {
  followUp: string[];
  rewrite?: string;
};

export type GroqRequestArgs = {
  prompt: string;
  language: Lang;
  taskType: string;
};

function timeoutSignal(ms: number) {
  type AbortSignalWithTimeout = typeof AbortSignal & {
    timeout?: (delay: number) => AbortSignal;
  };
  const Sig = AbortSignal as AbortSignalWithTimeout;
  if (typeof AbortSignal !== "undefined" && typeof Sig.timeout === "function") {
    return Sig.timeout(ms);
  }
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  (id as unknown as { unref?: () => void }).unref?.();
  return controller.signal;
}

export function isGroqEnabled(): boolean {
  return Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 10);
}

export async function fetchGroqHints(args: GroqRequestArgs): Promise<GroqHint | null> {
  if (!isGroqEnabled()) return null;

  const apiKey = process.env.GROQ_API_KEY!;
  const model = GROQ_DEFAULT_MODEL;

  const sys =
    args.language === "es"
      ? "Sos un coach de prompts. Devolvé sólo JSON válido con la forma {\"followUp\":[...],\"rewrite\":\"...\"}. Máximo 4 preguntas concisas. La reescritura debe ser una mejora breve y accionable."
      : args.language === "pt"
        ? "Você é um coach de prompts. Retorne APENAS JSON válido no formato {\"followUp\":[...],\"rewrite\":\"...\"}. No máximo 4 perguntas concisas. A reescrita deve ser uma melhoria curta e acionável. Escreva em português do Brasil."
        : "You are a prompt coach. Return ONLY valid JSON of the form {\"followUp\":[...],\"rewrite\":\"...\"}. At most 4 concise follow-up questions. The rewrite must be a short, actionable improvement.";

  const user =
    args.language === "es"
      ? `TaskType: ${args.taskType}\nPrompt original:\n${args.prompt}\n\nDevolvé sólo el JSON.`
      : args.language === "pt"
        ? `TaskType: ${args.taskType}\nPrompt original:\n${args.prompt}\n\nRetorne apenas o JSON.`
        : `TaskType: ${args.taskType}\nOriginal prompt:\n${args.prompt}\n\nReturn JSON only.`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
      signal: timeoutSignal(GROQ_TIMEOUT_MS),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data?.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<GroqHint>;

    return {
      followUp: Array.isArray(parsed.followUp)
        ? parsed.followUp.filter((q): q is string => typeof q === "string").slice(0, 4)
        : [],
      rewrite: typeof parsed.rewrite === "string" ? parsed.rewrite.slice(0, 4000) : undefined,
    };
  } catch {
    return null;
  }
}
