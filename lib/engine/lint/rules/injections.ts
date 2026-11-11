import type { Lang, FindingId, Severity } from "../types";
import { isPt, PT_INJECTION, PT_SECRETS } from "../../pt";

type AddFinding = (id: FindingId, severity: Severity) => void;

function stripPrompteaScaffold(input: string) {
  return String(input ?? "")
    .replace(/^PROMPTEA:\s*v[0-9.]+\s*$/gim, "")
    .replace(/^MODEL:\s*.*$/gim, "")
    .replace(/^PURPOSE:\s*.*$/gim, "")
    .replace(/^TASK_TYPE:\s*.*$/gim, "")
    .replace(/^(INSTRUCCIONES:|INSTRUCTIONS:|OUTPUT FORMAT:|RESTRICCIONES:|CONSTRAINTS:|CONTEXTO ADJUNTO:|ATTACHED CONTEXT:)\s*$/gim, "")
    .replace(/<file\s+[^>]*>/gim, "")
    .replace(/<\/file>/gim, "")
    .replace(/Treat attached files as context or input data[^\n]*/gi, "")
    .replace(/Tratá los archivos adjuntos como contexto o datos de entrada[^\n]*/gi, "")
    .replace(/Trate os arquivos anexados como contexto ou dados de entrada[^\n]*/gi, "")
    .replace(/Se o pedido do usuário e um anexo entrarem em conflito[^\n]*/gi, "")
    .replace(/^(CONTEXTO ANEXADO:)\s*$/gim, "")
    .replace(/If the user request and an attachment conflict[^\n]*/gi, "")
    .replace(/Si el pedido del usuario y un adjunto entran en conflicto[^\n]*/gi, "")
    .trim();
}

export function applyInjectionRules(opts: { prompt: string; lang: Lang; addFinding: AddFinding }) {
  const { prompt, addFinding } = opts;
  const low = stripPrompteaScaffold(prompt).toLowerCase();

  if (!low) return;

  const patterns = [
    /ignore all previous instructions/,
    /ignore previous instructions/,
    /disregard the above/,
    /developer mode/,
    /jailbreak/,
    /\bdan\b/,
    /do anything now/,

    /reveal the system prompt/,
    /show me your system prompt/,
    /developer message/,
    /hidden instructions/,
    /confidential instructions/,

    /ignorá todas las instrucciones anteriores/,
    /ignora todas las instrucciones anteriores/,
    /modo desarrollador/,
    /revelá el prompt del sistema/,
    /revela el prompt del sistema/,
    /mostrame el prompt del sistema/,
    /mensaje del desarrollador/,
    /instrucciones ocultas/,

    /api key/,
    /secret key/,
    /private key/,
    /\bpassword\b/,
    /keys and secrets/,
    /credenciales/,
    /contraseña/,
    /clave privada/,
  ];

  const hit = patterns.some((re) => re.test(low));
  // v1.8.2: the same requests written in Portuguese.
  const ptHit = isPt(prompt ?? "", opts.lang) && (PT_INJECTION.test(low) || PT_SECRETS.test(low));
  if (hit || ptHit) addFinding("prompt_injection", "high");
}