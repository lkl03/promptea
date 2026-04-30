// lib/llm/groq.ts
//
// Optional Groq API integration. The app fully works without it.
// Set GROQ_API_KEY (server-only) in your hosting environment to enable
// LLM-assisted recommendations. Never expose this key to the client.

const GROQ_DEFAULT_MODEL = process.env.GROQ_MODEL ?? "llama-3.1-70b-versatile";
const GROQ_TIMEOUT_MS = 8000;

export type GroqHint = {
  followUp: string[];
  rewrite?: string;
};

export type GroqRequestArgs = {
  prompt: string;
  language: "es" | "en";
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
      : "You are a prompt coach. Return ONLY valid JSON of the form {\"followUp\":[...],\"rewrite\":\"...\"}. At most 4 concise follow-up questions. The rewrite must be a short, actionable improvement.";

  const user =
    args.language === "es"
      ? `TaskType: ${args.taskType}\nPrompt original:\n${args.prompt}\n\nDevolvé sólo el JSON.`
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
