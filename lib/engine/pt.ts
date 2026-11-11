// lib/engine/pt.ts
//
// v1.8.2 (engine 2.4.0) — the Portuguese vocabulary of the engine's detectors.
//
// The detectors (features, signals, classifier, linter) are keyword-based and
// were written for Spanish and English. Portuguese is added HERE, in one place,
// instead of being mixed into every existing pattern, for two reasons:
//
//   1. No regression for Spanish/English. These patterns are consulted only
//      when the prompt is read as Portuguese (`isPt()` below): the interface is
//      Portuguese, or the prompt itself clearly is. A Spanish or English prompt
//      analyzed from /es or /en never reaches them, so its score, findings and
//      task type are exactly those of engine 2.3.0.
//   2. Portuguese shares many words with Spanish ("objetivo", "contexto",
//      "formato", "json") that the existing patterns already catch. What is
//      listed here is what Portuguese spells differently ("tabela", "saída",
//      "público-alvo", "não", "resumo") plus its verb forms.
//
// Every pattern uses Unicode-aware word edges: JS `\b` is ASCII-only and never
// matches next to "ç", "ã" or "é".

import type { Lang } from "@/lib/domain";
import { readsAsPortuguese } from "@/lib/refine/language";

const L = "\\p{L}\\p{N}_";

/** Case-insensitive Unicode regex matching any alternative as a whole word/phrase. */
function w(alternation: string): RegExp {
  return new RegExp(`(?<![${L}])(?:${alternation})(?![${L}])`, "iu");
}

// One-entry memo: every detector of one analysis asks about the same prompt.
let lastKey = "";
let lastValue = false;

/**
 * True when `text` should be read with the Portuguese vocabulary: the
 * interface is Portuguese (and the prompt is not clearly Spanish/English), or
 * the prompt itself clearly reads as Portuguese.
 */
export function isPt(text: string, lang: Lang | undefined): boolean {
  const ui: Lang = lang ?? "en";
  const key = `${ui}\u0000${text}`;
  if (key === lastKey) return lastValue;
  lastKey = key;
  lastValue = readsAsPortuguese(text, ui);
  return lastValue;
}

// ---------------------------------------------------------------------------
// Goal
// ---------------------------------------------------------------------------

/** Imperative / request verbs (você-imperative, infinitive and informal 3rd person). */
export const PT_GOAL_VERBS = w(
  [
    "quero|queria|gostaria|preciso|busco|objetivo|meta|meu objetivo [ée]",
    "tire|tirar|retire|retirar|pegue|pegar|separe|separar|organize|organizar|monte|simule|simular|continue|complete|completar",
    "escreva|escreve|escrever|redija|redigir|reescreva|reescreve|reescrever|crie|cria|criar|fa[çc]a|faz|fazer",
    "monte|montar|gere|gera|gerar|desenhe|desenhar|elabore|elaborar|produza|produzir|prepare|preparar",
    "me d[eê]|me diga|me conte|me mostre|me ajude|me ajuda|me explique|me explica|me ensine|ajude|ajudar",
    "explique|explica|explicar|resuma|resume|resumir|traduza|traduz|traduzir|extraia|extrai|extrair|converta|converter|transforme|transformar|formate|formatar",
    "corrija|corrige|corrigir|conserte|consertar|arrume|arrumar|depure|depurar|refatore|refatorar|implemente|implementar|migre|migrar",
    "adicione|adicionar|acrescente|acrescentar|atualize|atualizar|remova|remover|exclua|excluir|renomeie|renomear|revise|revisar|audite|auditar",
    "analise|analisar|compare|comparar|pesquise|pesquisar|investigue|investigar|encontre|encontrar|busque|buscar|liste|listar",
    "planeje|planejar|esboce|esbo[çc]ar|proponha|propor|sugira|sugerir|recomende|recomendar",
    "melhore|melhora|melhorar|otimize|otimizar|encurte|encurtar|expanda|expandir|responda|responder|descreva|descrever|ensine|ensinar|calcule|calcular",
    "classifique|classificar|avalie|avaliar|convide|convidar|pinte|pintar|ilustre|ilustrar|renderize|renderizar",
    "voc[eê] pode|voc[eê] poderia|poderia|pode me|d[aá] para|por favor|tarefa",
  ].join("|"),
);

export const PT_GOAL_LABEL = /(?:^|\n)\s*(objetivo|meta|tarefa|pedido)\s*:/i;

/** Task-specific goal words (the fallback of detectGoal when no request verb is present). */
export const PT_TASK_GOAL: Record<string, RegExp> = {
  summarization: w("resumo|resuma|resumir|resume|s[ií]ntese|pontos principais"),
  translation: w("traduza|traduzir|traduz|tradu[çc][ãa]o|vers[ãa]o em"),
  study: w("explique|explicar|explica|ensine|me ensine|me ajude a entender|estudar|aprender"),
  marketing: w("an[úu]ncios?|copy|campanha|texto de venda|cta|marketing"),
  coding: w("corrija|corrigir|depure|depurar|refatore|refatorar|implemente|implementar|c[óo]digo"),
  debugging: w("corrija|corrigir|depure|depurar|refatore|refatorar|implemente|implementar|c[óo]digo"),
  refactor: w("corrija|corrigir|depure|depurar|refatore|refatorar|implemente|implementar|c[óo]digo"),
  data_extraction: w("extraia|extrair|extra[çc][ãa]o|campos|json|schema|esquema"),
};

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

export const PT_INPUTS =
  /(?<![\p{L}\p{N}_])(texto:|contexto:|artigo:|documento:|c[óo]digo:|e-?mail:|dados:|entrada:|planilha:|mensagem:|transcri[çc][ãa]o:)|(?<![\p{L}\p{N}_])(texto original|texto de origem|texto a seguir|texto abaixo|arquivo|arquivos|anexo|anexos|anexado|anexada|em anexo|planilha|registros|conjunto de dados)(?![\p{L}\p{N}_])/iu;

export const PT_AUDIENCE = w(
  [
    "p[úu]blico|p[úu]blico-alvo|audi[êe]ncia|para iniciantes|para executivos|para desenvolvedores|para leigos|clientes?|usu[áa]rios?",
    "n[íi]vel m[ée]dio|ensino m[ée]dio|ensino fundamental|n[íi]vel universit[áa]rio|faculdade|gradua[çc][ãa]o|b[áa]sico|intermedi[áa]rio|avan[çc]ado",
    "estudantes?|alunos?|recrutadores?|executivos?|diretoria|iniciantes?|gestores?|gerentes?|crian[çc]as|pais|jovens|adolescentes|investidores?|colegas|leigos|leitores?",
  ].join("|"),
);

export const PT_EXAMPLES = w("exemplos?|por exemplo|ex\\.");

export const PT_CONSTRAINTS = w(
  [
    "restri[çc][õo]es|restri[çc][ãa]o|limites?|limita[çc][õo]es|evite|evitar|n[ãa]o use|n[ãa]o inclua|n[ãa]o invente|n[ãa]o mencione|n[ãa]o utilize",
    "deve|devem|precisa|precisam|obrigat[óo]rio|obrigatoriamente|no m[áa]ximo|at[ée] \\d+|sem \\p{L}{3,}",
    "formal|informal|casual|neutro|literal|natural|tom|tamanho|foco",
  ].join("|"),
);

export const PT_TRANSLATION_TARGET = w(
  "idioma de destino|l[íi]ngua de destino|para o (?:ingl[êe]s|espanhol|portugu[êe]s|franc[êe]s|alem[ãa]o|italiano)|para (?:ingl[êe]s|espanhol|portugu[êe]s|franc[êe]s|alem[ãa]o|italiano)|em (?:ingl[êe]s|espanhol|portugu[êe]s|franc[êe]s|alem[ãa]o|italiano)|ao (?:ingl[êe]s|espanhol|portugu[êe]s)",
);

export const PT_SUMMARY_SHAPE = w("t[óo]picos?|bullets?|par[áa]grafos?|se[çc][õo]es|tamanho|breve|curto|curta|longo|longa|extenso|foco|linhas|frases");

export const PT_OUTPUT_FORMAT = w(
  "formato de sa[íi]da|formato da resposta|formato|json|tabela|passos|etapas|t[óo]picos?|bullets?|lista|par[áa]grafos?|se[çc][õo]es|markdown|csv|planilha",
);
export const PT_OUTPUT_LABEL = /(?:^|\n|\.\s)\s*(sa[íi]da|formato|entreg[áa]vel|formato da resposta|formato de sa[íi]da|retorne|devolva)\s*:/i;

export const PT_SUCCESS = w(
  "crit[ée]rios? de sucesso|crit[ée]rios? de aceita[çc][ãa]o|deve incluir|devem incluir|precisa incluir|que inclua|validar|valida[çc][ãa]o|verificar|verifica[çc][ãa]o",
);

export const PT_TONE = w("tom|formal|informal|casual|amig[áa]vel|s[ée]rio|literal|natural|profissional\\p{L}*|descontra[íi]do|direto|emp[áa]tico");

export const PT_LENGTH = w(
  "curto|curta|breve|resumido|conciso|concisa|longo|longa|extenso|detalhado|detalhada|\\d+ par[áa]grafos?|\\d+ t[óo]picos?|\\d+ linhas|\\d+ frases",
);
export const PT_LENGTH_LIMIT = /(?<![\p{L}])(m[áa]x|m[áa]ximo|m[íi]nimo|no m[áa]ximo|pelo menos|at[ée])(?![\p{L}]).{0,12}\d+|\d+\s*(palavras|caracteres|linhas|frases|par[áa]grafos?)(?![\p{L}])/iu;

export const PT_TIMEFRAME = w(
  "[úu]ltim[oa]s?|recentes?|atual|atuais|per[íi]odo|este ano|ano passado|janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro",
);

export const PT_REGION = w("brasil|brasileiro|brasileira|portugal|latam|am[ée]rica latina|eua|estados unidos|europa|regi[ãa]o|fuso hor[áa]rio|s[ãa]o paulo|rio de janeiro");

export const PT_ERROR = w("erro|erros|exce[çc][ãa]o|falha|falhas|quebra|quebrou|trava|travou|n[ãa]o funciona|mensagem de erro|stack ?trace|log|logs");

export const PT_REPRO = w("passos para reproduzir|como reproduzir|reproduzir|para reproduzir");

export const PT_INJECTION = w(
  [
    "ignore todas as instru[çc][õo]es anteriores|ignore as instru[çc][õo]es anteriores|ignore tudo (?:o que est[áa] )?acima|desconsidere (?:as instru[çc][õo]es|tudo) (?:anteriores|acima)",
    "modo desenvolvedor|revele o prompt do sistema|mostre o prompt do sistema|mensagem do desenvolvedor|instru[çc][õo]es ocultas|instru[çc][õo]es confidenciais",
  ].join("|"),
);
/** Secrets are an injection-like request in the linter (same list as es/en). */
export const PT_SECRETS = w("chave de api|chave secreta|chave privada|senha|senhas|credenciais");

export const PT_SHORT = w("breve|curto|curta|conciso|concisa|resumido");
export const PT_LONG = w("muito detalhad[oa]|bem detalhad[oa]|exaustiv[oa]|extens[oa]|long[oa]");
export const PT_NO_ASSUME = w("n[ãa]o suponha|n[ãa]o presuma|n[ãa]o assuma");
export const PT_INVENT = w("invente|inventar|fic[çc][ãa]o");
export const PT_ONLY_JSON = w("somente json|apenas json|s[óo] json|somente o json|apenas o json|json v[áa]lido|sem texto extra|sem texto adicional");
export const PT_EXPLANATION = /expli[cq]|racioc[íi]n|coment|passo a passo/i;
export const PT_SUPER_SHORT = /m[áa]x(?:imo)?\.?\s*(?:de\s*)?\d+\s*linhas|uma\s*frase|uma\s*linha/i;

// ---------------------------------------------------------------------------
// Implicit output spec ("3 títulos", "no máximo 120 palavras")
// ---------------------------------------------------------------------------

const PT_NUMBER_WORDS = "\\d+|um|uma|dois|duas|tr[êe]s|quatro|cinco|seis|sete|oito|nove|dez|doze";
const PT_OUTPUT_UNITS =
  "palavras|caracteres|linhas|par[áa]grafos?|frases|variantes|vers[õo]es|t[íi]tulos|manchetes|assuntos|" +
  "t[óo]picos?|bullets?|pontos|perguntas|quest[õo]es|exemplos|ideias|op[çc][õo]es|" +
  "passos|etapas|se[çc][õo]es|slides|posts|itens|alternativas|flashcards|exerc[íi]cios|an[úu]ncios|ganchos|legendas";

export const PT_COUNT_WITH_UNIT = new RegExp(
  `(?<![\\p{L}])(?:${PT_NUMBER_WORDS})(?:\\s+|-)(?:[\\p{L}-]+\\s+){0,2}(?:${PT_OUTPUT_UNITS})(?![\\p{L}])`,
  "iu",
);
export const PT_N_QUESTION = /\d+[- ](perguntas?|quest(?:ão|ões|ao|oes)|itens|item|passos?|etapas?)(?![\p{L}])/iu;

// ---------------------------------------------------------------------------
// Image prompts
// ---------------------------------------------------------------------------

export const PT_IMAGE_NEGATIVE = w("sem|evite|evitar|nada de|exceto|menos|prompt negativo");

export const PT_IMAGE_SPEC = w(
  [
    "propor[çc][ãa]o|quadrad[ao]|vertical|horizontal|retrato|paisagem|panor[âa]mic[ao]",
    "foto|fotografia|fotorrealista|ilustra[çc][ãa]o|aquarela|[óo]leo|pintura a [óo]leo|vetor|vetorial|desenho|esbo[çc]o|isom[ée]tric[ao]|cinematogr[áa]fic[ao]",
    "p[ôo]ster|cartaz|logo|logotipo|[íi]cone|adesivo|figurinha|papel de parede",
  ].join("|"),
);

// ---------------------------------------------------------------------------
// Coding specs
// ---------------------------------------------------------------------------

export const PT_CODE_CONSTRAINT = /(?<![\p{L}])(com|usando|utilizando)\s+(pydantic|zod|sqlalchemy|prisma|postgres(ql)?|mysql|sqlite|redis|tailwind|typescript|jest|vitest|pytest)(?![\p{L}])/iu;
export const PT_CODE_DELIVERABLE = w("inclua testes|incluir testes|com testes|testes unit[áa]rios|testes automatizados|docstrings?|readme|tipagem|type hints");
export const PT_CODE_SUCCESS = /(?<![\p{L}])(retorne|retornar|devolva|devolver|responda|responder)\s+(um\s+|com\s+)?(status\s+)?[1-5]\d\d(?![\p{L}\p{N}])|(?<![\p{L}])testes?\s+(passem|passam|passar)(?![\p{L}])|(?<![\p{L}])esperado:\s/iu;
export const PT_DEBUG_EXPECTED = /(?<![\p{L}])(resultado |comportamento )?esperado:|(?<![\p{L}])deveria (retornar|devolver|responder|mostrar|exibir)(?![\p{L}])|(?<![\p{L}])o esperado (era|[ée])(?![\p{L}])/iu;
export const PT_ERROR_HANDLING = /tratamento de erros?|tratar (?:os )?erros?|erros? esperados?|controle de erros?/giu;

// ---------------------------------------------------------------------------
// Linter cue lists (substring lists, as in lib/engine/lint)
// ---------------------------------------------------------------------------

export const PT_CONTEXT_CUES = ["contexto", "cenário", "cenario", "público", "publico", "audiência", "para quem", "para que", "uso", "entrada", "inputs"];
export const PT_WORK_MATERIAL = ["texto:", "logs", "log", "stacktrace", "stack trace", "traceback", "erro:", "arquivo", "anexo", "anexado", "dataset", "csv", "código", "codigo", "texto original", "texto de origem", "artigo:", "documento:", "dados:", "planilha"];
export const PT_GENERIC_CONSTRAINTS = ["restri", "limite", "máx", "max ", "no máximo", "sem ", "evite", "evitar", "não use", "não inclua", "tom", "tamanho", "foco"];
export const PT_SOURCE_LABELS = ["texto:", "artigo:", "documento:", "arquivo", "anexo", "transcrição:", "e-mail:", "email:", "mensagem:"];
export const PT_INLINE_SOURCE = /(?:^|\s)(isto|isso|o seguinte|a seguir|texto a seguir|texto abaixo|seguinte texto)\s*:\s*\S/i;
export const PT_SUMMARY_LENGTH = ["breve", "curto", "curta", "conciso", "longo", "detalhado", "tópicos", "topicos", "bullets", "parágrafo", "paragrafo", "seções", "secoes", "linhas", "frases", "palavras"];
export const PT_SUMMARY_SCOPE = ["foco", "focado", "focada", "ideias principais", "ideias-chave", "pontos principais", "por seção", "por secao", "por seções", "por tema", "por temas", "o mais importante", "decisões", "decisoes"];
export const PT_TARGET_LANGUAGE = ["inglês", "ingles", "espanhol", "português", "portugues", "francês", "frances", "alemão", "alemao", "italiano", "idioma de destino", "língua de destino", "para o ", "em português"];
export const PT_REGISTER = ["formal", "informal", "neutro", "natural", "literal", "casual", "profissional", "amigável", "amigavel", "coloquial", "respeitoso", "descontraído"];
export const PT_STUDY_LEVEL = ["iniciante", "para leigos", "ensino médio", "ensino medio", "ensino fundamental", "faculdade", "universitário", "universitario", "graduação", "graduacao", "pós-graduação", "mestrado", "doutorado", "básico", "basico", "intermediário", "intermediario", "avançado", "avancado", "vestibular", "enem", "primeiro ano", "segundo ano", "terceiro ano"];
export const PT_MARKETING_AUDIENCE = ["público", "publico", "público-alvo", "persona", "cliente ideal", "clientes", "comprador", "audiência", "para fundadores", "para donos", "para profissionais"];
export const PT_MARKETING_CTA = ["cta", "chamada para ação", "chamada para acao", "cadastre", "cadastro", "inscreva", "assine", "compre", "comprar", "agende", "agendar", "baixe", "saiba mais", "clique"];
export const PT_EXTRACTION_WORDS = ["extraia", "extrair", "extração", "extracao", "parse", "campos:", "chaves:", "fields:"];
export const PT_DEBUG_WORDS = ["bug", "erro", "crash", "não funciona", "nao funciona", "quebra", "quebrou", "trava", "stacktrace", "stack trace", "traceback", "dá erro", "da erro"];
export const PT_INPUT_LABEL = /(?<![\p{L}])(fatura|nota fiscal|csv|dados|registros?|log|transcri[çc][ãa]o|mensagem|e-?mail|texto|entrada)\s*:\s*\S/iu;
export const PT_TYPED_FIELD = /(?:string|number|integer|int|float|decimal|boolean|bool|date|datetime|array|object|texto|n[úu]mero|inteiro|data|booleano|lista)/i;
export const PT_REPRO_WORD = /passos|etapas|reproduz/i;

/** Output-format detection (lib/engine/lint/detectOutputFormat.ts). */
export const PT_FORMAT = {
  strictJson: /(?:somente|apenas|s[óo])\s+(?:o\s+)?json(?![\p{L}])|json\s+v[áa]lido|sem\s+texto\s+(?:extra|adicional)|n[ãa]o\s+inclua\s+texto/iu,
  json: w("json|schema|esquema|campos"),
  table: w("tabela|tabular"),
  steps: w("passos|etapas|passo 1|etapa 1|numerad[ao]s?"),
  bullets: w("t[óo]picos?|bullets?|lista|checklist|marcadores"),
};

// ---------------------------------------------------------------------------
// Classifier: Portuguese alternatives, aligned BY INDEX with the patterns of
// classifyTaskDetailed() so a signal never counts twice.
// ---------------------------------------------------------------------------

export const PT_TASK: Record<string, RegExp[]> = {
  coding: [
    /(?<![\p{L}])(c[óo]digo|fun[çc][ãa]o|componente|endpoint|script)(?![\p{L}])/iu,
    /(?<![\p{L}])(implemente|implementar|implementa)(?![\p{L}])|(?<![\p{L}])(escreva|escrever|crie|criar|fa[çc]a|fazer)\s+(uma\s+|um\s+)?(fun[çc][ãa]o|classe|endpoint|script|componente|api)/iu,
  ],
  debugging: [/(bug|erro|exce[çc][ãa]o|falha|quebr[ao]u?|trav[ao]u?|crash|n[ãa]o funciona|d[áa] erro)/iu],
  refactor: [/(refator|reestrutur|limpar o c[óo]digo|otimizar o c[óo]digo|melhorar o c[óo]digo)/iu],
  research: [
    /(pesquis|investig|fontes|artigos cient[íi]ficos|estudos|evid[êe]ncias?)/iu,
    /(?<![\p{L}])(revisado por pares|cita[çc][õo]es|metan[áa]lise|literatura|bibliografia|refer[êe]ncias)(?![\p{L}])/iu,
  ],
  marketing: [
    /(?<![\p{L}])(marketing|campanha)(?![\p{L}])/iu,
    /(?<![\p{L}])(an[úu]ncios?|copy|copywriting|t[íi]tulos|manchetes|slogan)(?![\p{L}])/iu,
    /(?<![\p{L}])(cta|chamada para a[çc][ãa]o|convers[ãa]o|landing)(?![\p{L}])/iu,
    /(?<![\p{L}])(seo|marca|p[úu]blico-alvo|p[úu]blico alvo)(?![\p{L}])/iu,
  ],
  summarization: [/(resumo|resum[aie]|resumir|s[íi]ntese|pontos principais|tl;dr)/iu],
  translation: [/(tradu[zçc]|vers[ãa]o em (ingl|espanh|portugu))/iu],
  data_extraction: [/(extra(ia|ir|i|[çc][ãa]o)|parse|parser)/iu, /(json|schema|esquema)/iu, /(campos|chaves:)/iu, /(tabela com colunas|colunas:)/iu],
  planning: [
    /(?<![\p{L}])(plano|planos|planejamento|roadmap|cronograma|roteiro)(?![\p{L}])|planej/iu,
    /(?<![\p{L}])(marcos|checklist|passo a passo)(?![\p{L}])/iu,
    /(?<![\p{L}])(riscos|respons[áa]veis|depend[êe]ncias|rollback|mitiga[çc][ãa]o)(?![\p{L}])/iu,
  ],
  customer_support: [/(suporte|atendimento|chamado|ticket|reclama[çc][ãa]o|queixa)/iu, /(cliente)/iu, /(desculpas?|lamentamos|sentimos muito)/iu],
  writing: [/(escrev|redij|reda[çc]|hist[óo]ria|conto|roteiro|artigo|post)/iu],
  study: [/(expli(que|car|ca)|ensin|aprender|estudar)/iu],
};
