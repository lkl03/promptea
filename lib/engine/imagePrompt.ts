// lib/engine/imagePrompt.ts
//
// v1.6.0 — deterministic image-prompt composer.
//
// Before v1.6.0 the image shape told the user WHAT to add ("subject, style,
// composition, lighting…"). This module WRITES the finished prompt instead:
// it reads the user's sparse request, keeps every explicit detail verbatim,
// and resolves the missing art-direction decisions (medium treatment,
// composition, camera or rendering, light, palette, mood, aspect ratio,
// exclusions) into one coherent direction that can be pasted straight into
// an image generator.
//
// Principles (each one is test-enforced in lib/__tests__/image.prompts.test.ts):
// - Fill ART DIRECTION, never identity: no invented names, ethnicity,
//   nationality, religion, brands, logos, or text.
// - Never contradict the user: a stated time of day, light, palette, style,
//   medium, aspect ratio, or exclusion always wins over the presets, and the
//   presets are chosen so they cannot conflict with each other (one light
//   direction, one depth-of-field decision, one framing).
// - Medium-aware vocabulary: lens/aperture language only for photography;
//   brushwork for illustration and painting; materials/shading for 3D;
//   layout/hierarchy for graphic design.
// - No placeholders and no quality-keyword spam ("8k, masterpiece…").
// - Language follows the user's prompt (ES/EN).
// - Idempotent: a prompt that is already a developed image prompt (its own
//   output included) is returned unchanged.
//
// The adaptive refiner (lib/refine) can go further semantically; this module
// is the always-available baseline, so the feature never collapses when the
// external provider is down.

import type { Lang } from "@/lib/domain";
import { detectPromptLanguage } from "@/lib/refine/language";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImageMedium = "photo" | "illustration" | "painting" | "3d" | "graphic";

type IllustrationStyle = "watercolor" | "storybook" | "anime" | "vector" | "ink" | "pixel" | "comic" | "digital";
type PaintingStyle = "oil" | "acrylic" | "impressionist" | "gouache" | "generic";
type GraphicKind = "logo" | "poster" | "icon" | "social" | "generic";

export type SubjectKind =
  | "person"
  | "creature"
  | "animal"
  | "vehicle"
  | "food"
  | "product"
  | "interior"
  | "architecture"
  | "landscape"
  | "general";

type Setting = "studio" | "urban" | "nature" | "coast" | "interior" | "none";
type TimeCue = "night" | "golden" | "dawn" | "day" | "overcast";
type Weather = "rain" | "fog" | "snow" | "storm";

export type ImageBrief = {
  lang: Lang;
  /** The user's subject phrase, verbatim (only request scaffolding removed). */
  subject: string;
  /** Head noun of the subject and (ES) its article — used for references in prose. */
  subjectNoun: string | null;
  subjectArticle: "el" | "la" | null;
  /** User segments we could not classify — kept verbatim as extra details. */
  extras: string[];
  medium: ImageMedium;
  illustrationStyle: IllustrationStyle | null;
  paintingStyle: PaintingStyle | null;
  graphicKind: GraphicKind | null;
  isometric: boolean;
  subjectKind: SubjectKind;
  setting: Setting;
  time: TimeCue | null;
  weather: Weather | null;
  gaze: boolean;
  motion: boolean;
  closeUp: boolean;
  minimal: boolean;
  /** Verbatim user segments that already decide these dimensions. */
  userStyle: string[];
  userLighting: string[];
  userPalette: string[];
  userMood: string[];
  userCamera: string[];
  aspectRatio: string | null;
  negatives: string[];
  /** Text the user explicitly asked to render (quoted), if any. */
  requestedText: string | null;
  /** A specific generator the user named (syntax is adapted for it). */
  generator: "midjourney" | "stable-diffusion" | null;
};

export type ComposedImagePrompt = {
  prompt: string;
  brief: ImageBrief;
  /** Structured decisions, reused by the JSON output format. */
  direction: {
    medium: string;
    subject: string;
    composition: string;
    camera: string | null;
    environment: string | null;
    lighting: string;
    palette: string;
    treatment: string;
    mood: string;
    aspectRatio: string;
    avoid: string[];
  };
};

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------


/**
 * JavaScript's \b and \w are ASCII-only, so "óleo", "café" or "generá" never
 * sit on a word boundary. Detection runs on accent-folded text; everything the
 * user wrote is still carried into the prompt verbatim from the raw input.
 */
export function fold(text: string): string {
  return String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const RE = {
  photo: /\b(photo|photos|photograph|photography|photographic|photoreal\w*|realistic|hyperreal\w*|dslr|35mm film|film still|foto|fotos|fotograf[ií]a|fotogr[aá]fic[ao]|fotorrealista|realista|hiperrealista|product shot|packshot|editorial)\b/i,
  illustration: /\b(illustration|illustrated|drawing|drawn|cartoon|anime|manga|comic|storybook|picture[- ]book|children'?s|kids'?|watercolou?r|gouache|ink|sketch|line art|vector|flat design|flat illustration|pixel art|ilustraci[oó]n|ilustrad[ao]|dibujo|dibujad[ao]|caricatura|historieta|c[oó]mic|infantil|cuento|acuarela|tinta|boceto|vectorial|pixel)\b/i,
  painting: /\b(oil painting|painting|painted|acrylic|impressionis\w*|[oó]leo|pintura|pintad[ao]|acr[ií]lico|impresionis\w*)\b/i,
  threeD: /\b(3d|3-d|cgi|render(ed|ing)?|blender|octane|unreal engine|isometric|claymation|clay|low[- ]poly|renderizad[ao]|isom[eé]tric[ao]|plastilina)\b/i,
  graphic: /\b(logo|logotipo|poster|p[oó]ster|flyer|banner|icon|[ií]cono|icono|infographic|infograf[ií]a|thumbnail|miniatura|cover art|portada|sticker|app icon|social media post|post para (instagram|redes)|instagram post)\b/i,
};

const SUBJECT_WORDS: Record<Exclude<SubjectKind, "general">, { en: string[]; es: Array<[string, "el" | "la"]> }> = {
  person: {
    en: ["woman", "man", "girl", "boy", "person", "people", "child", "kid", "lady", "gentleman", "chef", "doctor", "model", "couple", "family", "grandmother", "grandfather", "teenager", "athlete", "dancer", "musician", "worker", "student", "samurai", "warrior", "knight", "soldier", "ninja", "pirate", "astronaut", "cowboy", "firefighter", "nurse", "farmer", "surfer", "skater", "portrait"],
    es: [["mujer", "la"], ["hombre", "el"], ["chica", "la"], ["chico", "el"], ["niña", "la"], ["niño", "el"], ["persona", "la"], ["señora", "la"], ["señor", "el"], ["abuela", "la"], ["abuelo", "el"], ["pareja", "la"], ["familia", "la"], ["modelo", "la"], ["adolescente", "la"], ["bailarina", "la"], ["bailarín", "el"], ["músico", "el"], ["estudiante", "la"], ["cocinero", "el"], ["cocinera", "la"], ["samurái", "el"], ["samurai", "el"], ["guerrero", "el"], ["guerrera", "la"], ["caballero", "el"], ["soldado", "el"], ["pirata", "el"], ["astronauta", "la"], ["vaquero", "el"], ["bombero", "el"], ["enfermera", "la"], ["surfista", "la"], ["retrato", "el"], ["gente", "la"]],
  },
  creature: {
    en: ["dragon", "unicorn", "fairy", "monster", "goblin", "elf", "wizard", "witch", "mermaid", "robot", "alien", "phoenix", "griffin", "troll", "creature"],
    es: [["dragón", "el"], ["dragon", "el"], ["unicornio", "el"], ["hada", "la"], ["monstruo", "el"], ["duende", "el"], ["elfo", "el"], ["mago", "el"], ["bruja", "la"], ["sirena", "la"], ["robot", "el"], ["alienígena", "el"], ["fénix", "el"], ["grifo", "el"], ["criatura", "la"]],
  },
  animal: {
    en: ["cat", "dog", "puppy", "kitten", "bird", "horse", "fox", "owl", "lion", "tiger", "wolf", "bear", "fish", "rabbit", "deer", "elephant", "eagle", "butterfly", "turtle", "whale", "penguin"],
    es: [["gato", "el"], ["gata", "la"], ["perro", "el"], ["perra", "la"], ["cachorro", "el"], ["pájaro", "el"], ["ave", "el"], ["caballo", "el"], ["zorro", "el"], ["búho", "el"], ["león", "el"], ["tigre", "el"], ["lobo", "el"], ["oso", "el"], ["pez", "el"], ["conejo", "el"], ["ciervo", "el"], ["elefante", "el"], ["águila", "el"], ["mariposa", "la"], ["tortuga", "la"], ["ballena", "la"], ["pingüino", "el"]],
  },
  vehicle: {
    en: ["sports car", "car", "truck", "motorcycle", "motorbike", "bike", "bicycle", "bus", "train", "plane", "airplane", "boat", "ship", "van", "jeep", "scooter", "vehicle"],
    es: [["auto deportivo", "el"], ["auto", "el"], ["coche", "el"], ["carro", "el"], ["camión", "el"], ["camioneta", "la"], ["moto", "la"], ["motocicleta", "la"], ["bicicleta", "la"], ["colectivo", "el"], ["autobús", "el"], ["tren", "el"], ["avión", "el"], ["barco", "el"], ["velero", "el"], ["lancha", "la"], ["vehículo", "el"]],
  },
  food: {
    en: ["burger", "hamburger", "pizza", "coffee", "latte", "cake", "dish", "plate", "salad", "sushi", "pasta", "bread", "cocktail", "dessert", "ice cream", "soup", "breakfast", "croissant", "cupcake", "steak", "tacos"],
    es: [["hamburguesa", "la"], ["pizza", "la"], ["café", "el"], ["torta", "la"], ["pastel", "el"], ["plato", "el"], ["ensalada", "la"], ["sushi", "el"], ["pasta", "la"], ["pan", "el"], ["cóctel", "el"], ["trago", "el"], ["postre", "el"], ["helado", "el"], ["sopa", "la"], ["desayuno", "el"], ["medialuna", "la"], ["empanada", "la"], ["asado", "el"]],
  },
  product: {
    en: ["wristwatch", "watch", "bottle", "perfume", "sneaker", "sneakers", "shoe", "shoes", "phone", "smartphone", "headphones", "earbuds", "handbag", "bag", "backpack", "mug", "can", "packaging", "jar", "lipstick", "cosmetics", "laptop", "chair", "lamp", "sunglasses", "ring", "necklace", "candle", "product"],
    es: [["reloj", "el"], ["botella", "la"], ["perfume", "el"], ["zapatilla", "la"], ["zapatillas", "la"], ["zapato", "el"], ["celular", "el"], ["teléfono", "el"], ["auriculares", "el"], ["cartera", "la"], ["bolso", "el"], ["mochila", "la"], ["taza", "la"], ["lata", "la"], ["packaging", "el"], ["frasco", "el"], ["labial", "el"], ["notebook", "la"], ["silla", "la"], ["lámpara", "la"], ["anteojos", "el"], ["anillo", "el"], ["collar", "el"], ["vela", "la"], ["producto", "el"]],
  },
  interior: {
    en: ["room", "bedroom", "living room", "kitchen", "office", "library", "reading nook", "nook", "cafe interior", "restaurant", "studio apartment", "bathroom", "hallway", "classroom"],
    es: [["habitación", "la"], ["cuarto", "el"], ["dormitorio", "el"], ["living", "el"], ["cocina", "la"], ["oficina", "la"], ["biblioteca", "la"], ["rincón de lectura", "el"], ["rincón", "el"], ["restaurante", "el"], ["baño", "el"], ["pasillo", "el"], ["aula", "el"]],
  },
  architecture: {
    en: ["house", "building", "tower", "bridge", "cathedral", "church", "castle", "lighthouse", "cabin", "skyscraper", "temple", "villa", "facade", "barn"],
    es: [["casa", "la"], ["edificio", "el"], ["torre", "la"], ["puente", "el"], ["catedral", "la"], ["iglesia", "la"], ["castillo", "el"], ["faro", "el"], ["cabaña", "la"], ["rascacielos", "el"], ["templo", "el"], ["fachada", "la"], ["granero", "el"]],
  },
  landscape: {
    en: ["landscape", "mountain", "mountains", "beach", "forest", "lake", "sea", "ocean", "desert", "valley", "field", "river", "waterfall", "sky", "skyline", "coast", "island", "meadow", "canyon", "glacier", "city", "street"],
    es: [["paisaje", "el"], ["montaña", "la"], ["montañas", "la"], ["playa", "la"], ["bosque", "el"], ["lago", "el"], ["mar", "el"], ["océano", "el"], ["desierto", "el"], ["valle", "el"], ["campo", "el"], ["río", "el"], ["cascada", "la"], ["cielo", "el"], ["costa", "la"], ["isla", "la"], ["pradera", "la"], ["cañón", "el"], ["glaciar", "el"], ["ciudad", "la"], ["calle", "la"]],
  },
};

const KIND_PRIORITY: Array<Exclude<SubjectKind, "general">> = [
  "person",
  "creature",
  "animal",
  "vehicle",
  "food",
  "product",
  "interior",
  "architecture",
  "landscape",
];

const CITY_NAMES =
  /\b(tokyo|tokio|new york|nueva york|paris|par[ií]s|london|londres|buenos aires|mexico city|ciudad de m[eé]xico|madrid|barcelona|rome|roma|hong kong|seoul|se[uú]l|shanghai|dubai|dub[aá]i|los angeles|berlin|berl[ií]n|singapore|singapur|chicago|san francisco|miami|rio de janeiro|s[aã]o paulo|bogot[aá]|lima|santiago|montevideo|osaka|kyoto|venice|venecia|amsterdam|[aá]msterdam|istanbul|estambul|bangkok|mumbai|cairo|el cairo)\b/i;

const SETTING_RE: Record<Exclude<Setting, "none">, RegExp> = {
  studio: /\b(studio|estudio|seamless|backdrop|fondo (liso|blanco|neutro)|white background|plain background)\b/i,
  urban: /\b(city|cities|street|streets|downtown|urban|alley|avenue|skyline|rooftop|ciudad|calle|calles|centro|urbano|urbana|callej[oó]n|avenida|azotea|terraza)\b/i,
  coast: /\b(beach|coast|shore|sea|ocean|seaside|harbor|harbour|playa|costa|orilla|mar|oc[eé]ano|puerto)\b/i,
  interior: /\b(room|bedroom|kitchen|office|library|nook|indoors|interior|inside|restaurant|caf[eé]|habitaci[oó]n|cuarto|dormitorio|cocina|oficina|biblioteca|rinc[oó]n|adentro|interior|restaurante)\b/i,
  nature: /\b(landscape|mountain|mountains|forest|woods|lake|valley|field|meadow|river|waterfall|desert|countryside|hills|jungle|canyon|glacier|paisaje|monta[nñ]a|monta[nñ]as|bosque|lago|valle|campo|pradera|r[ií]o|cascada|desierto|colinas|selva|ca[nñ][oó]n|glaciar)\b/i,
};

const TIME_RE: Record<TimeCue, RegExp> = {
  night: /\b(night|nighttime|midnight|moonlight|moonlit|neon|after dark|noche|nocturn[ao]|medianoche|luz de luna|ne[oó]n)\b/i,
  golden: /\b(golden hour|sunset|sundown|dusk|late afternoon|hora dorada|atardecer|puesta de sol|ocaso|[uú]ltima luz)\b/i,
  dawn: /\b(dawn|sunrise|early morning|daybreak|amanecer|alba|madrugada)\b/i,
  day: /\b(midday|noon|daytime|sunny|broad daylight|mediod[ií]a|de d[ií]a|soleado|pleno d[ií]a)\b/i,
  overcast: /\b(overcast|cloudy|gray sky|grey sky|nublado|cielo gris)\b/i,
};

const WEATHER_RE: Record<Weather, RegExp> = {
  storm: /\b(storm|stormy|thunderstorm|lightning|tempest|tormenta|tempestad|rel[aá]mpago)\b/i,
  rain: /\b(rain|rainy|raining|drizzle|lluvia|lluvioso|lloviendo|llovizna)\b/i,
  fog: /\b(fog|foggy|mist|misty|haze|niebla|neblina|bruma)\b/i,
  snow: /\b(snow|snowy|snowing|blizzard|nieve|nevado|nevando)\b/i,
};

const GAZE_RE = /\b(looking (at|out|toward|towards|over)|gazing|watching|staring|contemplating|admiring|facing|mirando|contemplando|observando|admirando)\b/i;
const MOTION_RE = /\b(driving|racing|speeding|running|flying|riding|galloping|sailing|moving|conduciendo|manejando|corriendo|volando|andando|navegando|galopando|a toda velocidad|en movimiento|circulando)\b/i;
const CLOSEUP_RE = /\b(close[- ]?up|closeup|portrait|headshot|macro|primer plano|primer[ií]simo|retrato|macro)\b/i;
const MINIMAL_RE = /\b(minimal|minimalist|minimalism|clean|simple|minimalista|limpi[ao]|sencill[ao])\b/i;
const LIGHTING_SEG_RE = /\b(light|lighting|lit|backlit|backlight|rim light|glow|glowing|shadows?|softbox|luz|iluminaci[oó]n|iluminad[ao]|contraluz|sombras?|resplandor)\b/i;
const PALETTE_SEG_RE = /\b(tones?|tonos?|palette|paleta|colou?rs?|colores|colou?red|hues?|monochrom\w*|monocrom\w*|pastel|black and white|blanco y negro|b&w|sepia|desaturated|desaturad[ao]|vibrant|vibrante|muted|apagad[ao]s?)\b/i;
const MOOD_SEG_RE = /\b(mood|atmosphere|ambiance|vibe|feeling|cozy|cosy|melanchol\w*|dramatic|serene|dreamy|eerie|whimsical|nostalgic|epic|romantic|ambiente|atm[oó]sfera|clima|acogedor[a]?|melanc[oó]lic[ao]|dram[aá]tic[ao]|seren[ao]|so[nñ]ador[a]?|nost[aá]lgic[ao]|[eé]pic[ao]|rom[aá]ntic[ao]|m[aá]gic[ao]|magical)\b/i;
const CAMERA_SEG_RE = /\b(\d{2,3}\s?mm|lens|f\/\d|aperture|bokeh|depth of field|wide[- ]angle|telephoto|drone|aerial|low angle|high angle|bird'?s[- ]eye|eye level|objetivo|lente|apertura|profundidad de campo|gran angular|teleobjetivo|dron|a[eé]re[ao]|contrapicado|picado|a la altura de los ojos)\b/i;
const ASPECT_SEG_RE = /\b\d{1,2}\s*[:x]\s*\d{1,2}\b|\b(aspect ratio|relaci[oó]n de aspecto|formato (vertical|horizontal|cuadrado)|vertical|horizontal|square|cuadrad[ao]|panor[aá]mic[ao]|panoramic|widescreen|landscape format|portrait format)\b/i;
const NEGATIVE_SEG_RE = /^(no|sin|without|avoid|avoiding|evit[aá]r?|nada de|excepto|except|nothing)\b/i;

const ARTICLE_START = /^(a|an|the|un|una|unos|unas|el|la|los|las)\s/i;

// ---------------------------------------------------------------------------
// Developed-prompt detection (idempotency + minimal edits)
// ---------------------------------------------------------------------------

const DIMENSION_MARKERS: RegExp[] = [
  /\b(light|lighting|lit|sun|sunlight|backlight|rim|glow|softbox|luz|iluminaci[oó]n|sol|contraluz|resplandor)\b/i,
  /\b(shot|angle|lens|\d{2,3}\s?mm|framing|frame|composition|close-up|wide|plano|[aá]ngulo|objetivo|encuadre|composici[oó]n|tercio)\b/i,
  /\b(palette|tones?|hues?|colou?rs?|saturated|paleta|tonos?|colores|saturad[ao])\b/i,
  /\b(texture|textures|brush|brushwork|render|rendered|grain|material|materials|shading|textura|texturas|pincelada|grano|materiales|sombreado)\b/i,
  /\b(mood|atmosphere|serene|cinematic|contemplative|cozy|atm[oó]sfera|ambiente|seren[ao]|cinematogr[aá]fic[ao]|contemplativ[ao]|acogedor[a]?)\b/i,
  /\b(aspect ratio|relaci[oó]n de aspecto|--ar\s|\b\d{1,2}:\d{1,2}\b)/i,
  /\b(avoid|evitar|negative prompt|--no\s)\b/i,
];

/** True when `text` already reads as a fully developed image prompt. */
export function isDevelopedImagePrompt(text: string): boolean {
  const src = String(text ?? "").trim();
  const words = src.split(/\s+/).filter(Boolean).length;
  if (words < 45) return false;
  const folded = fold(src);
  const hits = DIMENSION_MARKERS.filter((re) => re.test(folded)).length;
  return hits >= 5;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

const LEAD_INS: RegExp[] = [
  /^(please|por favor)[,\s]+/i,
  /^(can|could|would) you\s+(please\s+)?/i,
  /^(podr[ií]as|pod[eé]s|puedes|me podr[ií]as)\s+/i,
  /^i\s*(?:'d| would)? ?(want|need|would like|'d like|like)\s+(to\s+)?((create|make|generate|get|have|draw|design|render)\s+)?/i,
  /^(quiero|quisiera|necesito|me gustar[ií]a)\s+(que\s+(me\s+)?(crees|generes|hagas|dibujes)\s+)?((crear|generar|hacer|tener|obtener|dibujar|dise[nñ]ar)\s+)?/i,
  /^(create|generate|make|draw|design|render|produce|paint|illustrate|imagine)\s+(me\s+)?/i,
  /^(cre[aá]|creame|cr[eé]ame|crea|crear|gener[aá]|generame|gen[eé]rame|genera|generar|hac[eé]|haceme|h[aá]zme|haz|hacer|dibuj[aá]|dibujame|dib[uú]jame|dise[nñ][aá]|dise[nñ]ame|pint[aá]|imagin[aá])\s+(me\s+)?/i,
];

const MEDIUM_NOUN_EN =
  /^(?:(?:an?|the|one)\s+)?((?:[\w'’-]+\s+){0,3}?)(image|picture|photo|photograph|shot|illustration|render|rendering|drawing|painting|artwork|art|poster|logo|icon|wallpaper|portrait|scene|sketch|graphic|visual)\s+(of|showing|depicting|featuring|with|for)\s+/i;
const MEDIUM_NOUN_ES =
  /^(?:(?:una?|la|el)\s+)?(imagen|foto|fotograf[ií]a|ilustraci[oó]n|render|renderizado|dibujo|pintura|p[oó]ster|logo|logotipo|[ií]cono|icono|fondo de pantalla|retrato|escena|boceto|gr[aá]fico)\s*((?:[\wáéíóúñü'’-]+\s+){0,3}?)(de|del|con|que muestre|mostrando|para)\s+/i;

function stripLeadIns(text: string): { rest: string; mediumWords: string } {
  let rest = text.trim();
  for (let pass = 0; pass < 3; pass++) {
    const before = rest;
    for (const re of LEAD_INS) rest = rest.replace(re, "").trim();
    if (rest === before) break;
  }

  let mediumWords = "";
  const en = rest.match(MEDIUM_NOUN_EN);
  if (en && en.index === 0) {
    mediumWords = `${en[1] ?? ""}${en[2]}`.trim();
    // "a logo FOR my bakery" keeps the preposition in the subject.
    const keepPrep = /^(for|with)$/i.test(en[3]);
    rest = (keepPrep ? `${en[3]} ` : "") + rest.slice(en[0].length);
    return { rest: rest.trim(), mediumWords };
  }
  const es = rest.match(MEDIUM_NOUN_ES);
  if (es && es.index === 0) {
    mediumWords = `${es[1]} ${es[2] ?? ""}`.trim();
    const prep = es[3].toLowerCase();
    const keepPrep = prep === "con" || prep === "para";
    rest = (keepPrep ? `${es[3]} ` : "") + rest.slice(es[0].length);
    if (prep === "del") rest = `el ${rest}`;
  }
  return { rest: rest.trim(), mediumWords };
}

/** Split on commas/semicolons that are not inside quotes. */
function splitSegments(text: string): string[] {
  const out: string[] = [];
  let buf = "";
  let quote: string | null = null;
  for (const ch of text) {
    if (quote) {
      if (ch === quote || (quote === "“" && ch === "”")) quote = null;
      buf += ch;
      continue;
    }
    if (ch === '"' || ch === "“" || ch === "'" && /\s$|^$/.test(buf)) {
      quote = ch === "“" ? "“" : ch;
      buf += ch;
      continue;
    }
    if (ch === "," || ch === ";" || ch === "\n") {
      if (buf.trim()) out.push(buf.trim());
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out.map((s) => s.replace(/[.。]+$/, "").trim()).filter(Boolean);
}

function kindOf(text: string): { kind: SubjectKind; noun: string | null; article: "el" | "la" | null } {
  const lower = text.toLowerCase();
  for (const kind of KIND_PRIORITY) {
    const words = SUBJECT_WORDS[kind];
    for (const w of words.en) {
      if (new RegExp(`\\b${w}s?\\b`, "i").test(lower)) return { kind, noun: w, article: null };
    }
    for (const [w, art] of words.es) {
      if (new RegExp(`(^|[^\\p{L}])${w}(es|s)?($|[^\\p{L}])`, "iu").test(lower)) return { kind, noun: w, article: art };
    }
  }
  return { kind: "general", noun: null, article: null };
}

function detectSetting(raw: string): Setting {
  const text = fold(raw);
  if (SETTING_RE.studio.test(text)) return "studio";
  if (SETTING_RE.interior.test(text)) return "interior";
  if (SETTING_RE.urban.test(text) || CITY_NAMES.test(text)) return "urban";
  if (SETTING_RE.coast.test(text)) return "coast";
  if (SETTING_RE.nature.test(text)) return "nature";
  return "none";
}

function detectTime(raw: string): TimeCue | null {
  const text = fold(raw);
  for (const cue of ["night", "golden", "dawn", "overcast", "day"] as TimeCue[]) {
    if (TIME_RE[cue].test(text)) return cue;
  }
  return null;
}

function detectWeather(raw: string): Weather | null {
  const text = fold(raw);
  for (const w of ["storm", "rain", "fog", "snow"] as Weather[]) {
    if (WEATHER_RE[w].test(text)) return w;
  }
  return null;
}

function illustrationStyleOf(raw: string): IllustrationStyle {
  const text = fold(raw);
  if (/\b(children'?s|kids'?|storybook|picture[- ]book|infantil|cuento|para ni[nñ][oa]s)\b/i.test(text)) return "storybook";
  if (/\b(watercolou?r|acuarela)\b/i.test(text)) return "watercolor";
  if (/\b(anime|manga)\b/i.test(text)) return "anime";
  if (/\b(vector|vectorial|flat design|flat illustration|flat)\b/i.test(text)) return "vector";
  if (/\b(pixel art|pixel)\b/i.test(text)) return "pixel";
  if (/\b(comic|c[oó]mic|historieta)\b/i.test(text)) return "comic";
  if (/\b(ink|tinta|line art|sketch|boceto)\b/i.test(text)) return "ink";
  return "digital";
}

function paintingStyleOf(raw: string): PaintingStyle {
  const text = fold(raw);
  if (/\b(oil|[oó]leo)\b/i.test(text)) return "oil";
  if (/\b(acrylic|acr[ií]lico)\b/i.test(text)) return "acrylic";
  if (/\b(impressionis\w*|impresionis\w*)\b/i.test(text)) return "impressionist";
  if (/\b(gouache)\b/i.test(text)) return "gouache";
  return "generic";
}

function graphicKindOf(raw: string): GraphicKind {
  const text = fold(raw);
  if (/\b(logo|logotipo)\b/i.test(text)) return "logo";
  if (/\b(icon|[ií]cono|icono|app icon)\b/i.test(text)) return "icon";
  if (/\b(poster|p[oó]ster|flyer|banner|cover|portada)\b/i.test(text)) return "poster";
  if (/\b(thumbnail|miniatura|instagram|social|redes)\b/i.test(text)) return "social";
  return "generic";
}

function extractRequestedText(text: string): string | null {
  const m =
    text.match(/\b(?:text|texto|saying|que diga|con la frase|with the words?|titled|titulad[ao]|headline|t[ií]tulo)\s*:?\s*["“']([^"”']{1,80})["”']/i) ??
    text.match(/["“]([^"”]{1,80})["”]/);
  return m ? m[1].trim() : null;
}

export function parseImageRequest(core: string, uiLang: Lang): ImageBrief {
  const raw = String(core ?? "").replace(/\s+/g, " ").trim();
  const lang = detectPromptLanguage(raw, uiLang).lang;
  const { rest, mediumWords } = stripLeadIns(raw);

  const segments = splitSegments(rest);
  let subject = "";
  const extras: string[] = [];
  const userStyle: string[] = [];
  const userLighting: string[] = [];
  const userPalette: string[] = [];
  const userMood: string[] = [];
  const userCamera: string[] = [];
  const negatives: string[] = [];
  let aspectRatio: string | null = null;
  let generator: ImageBrief["generator"] = null;

  const isStyleSegment = (raw: string) => {
    const s = fold(raw);
    return (
    RE.photo.test(s) || RE.illustration.test(s) || RE.painting.test(s) || RE.threeD.test(s) || RE.graphic.test(s) || /\b(style|estilo|aesthetic|est[eé]tica|cinematic|cinematogr[aá]fic[ao])\b/i.test(s)
    );
  };

  segments.forEach((seg, idx) => {
    if (/\b(midjourney)\b/i.test(seg)) generator = "midjourney";
    else if (/\b(stable diffusion|sdxl|comfyui)\b/i.test(seg)) generator = "stable-diffusion";

    const generatorOnly = /^(for |para |in |en |using |con |with )?(midjourney|stable diffusion|sdxl|dall[- ]?e|nano banana|gpt[- ]?image|flux|ideogram)$/i.test(seg);
    if (generatorOnly) return;

    const fseg = fold(seg);
    if (NEGATIVE_SEG_RE.test(fseg)) {
      negatives.push(seg.replace(/^(no|sin|without|avoid|avoiding|evit[aá]r?|nada de|excepto|except|nothing)(?![\wáéíóúñ])\s*/i, "").replace(/^\s*(de\s+)?/i, "").trim());
      return;
    }
    const ar = seg.match(/\b(\d{1,2})\s*[:x]\s*(\d{1,2})\b/);
    if (ar && ASPECT_SEG_RE.test(fseg) && (idx > 0 || subject)) {
      aspectRatio = `${ar[1]}:${ar[2]}`;
      return;
    }
    if (idx > 0 && ASPECT_SEG_RE.test(fseg) && !ar && seg.split(/\s+/).length <= 4) {
      aspectRatio = /vertical|portrait format/i.test(fseg) ? "4:5" : /square|cuadrad/i.test(fseg) ? "1:1" : "16:9";
      return;
    }
    if (idx === 0 && !isStyleSegment(seg)) {
      subject = seg;
      return;
    }
    if (idx === 0 && !subject) {
      // "minimal studio photo of X" was already split by the medium noun; a
      // first segment that is ONLY style ("watercolor, a fox") is style.
      if (seg.split(/\s+/).length > 6) {
        subject = seg;
        return;
      }
    }
    if (isStyleSegment(seg)) userStyle.push(seg);
    else if (LIGHTING_SEG_RE.test(fseg)) userLighting.push(seg);
    else if (PALETTE_SEG_RE.test(fseg)) userPalette.push(seg);
    else if (MOOD_SEG_RE.test(fseg)) userMood.push(seg);
    else if (CAMERA_SEG_RE.test(fseg)) userCamera.push(seg);
    else if (!subject) subject = seg;
    else extras.push(seg);
  });

  if (!subject) subject = extras.shift() ?? rest ?? raw;

  const all = `${mediumWords} ${raw}`;
  const styleText = `${mediumWords} ${userStyle.join(" ")}`;

  // Medium: explicit words first (medium noun + style segments), then the
  // whole request, then the subject's nature.
  const pickMedium = (rawT: string): ImageMedium | null => {
    const t = fold(rawT);
    if (RE.graphic.test(t)) return "graphic";
    if (RE.threeD.test(t)) return "3d";
    if (RE.painting.test(t) && !RE.illustration.test(t)) return "painting";
    if (RE.illustration.test(t)) return "illustration";
    if (RE.photo.test(t)) return "photo";
    return null;
  };
  const { kind, noun, article } = kindOf(subject);
  const medium: ImageMedium = pickMedium(styleText) ?? pickMedium(all) ?? (kind === "creature" ? "illustration" : "photo");

  const timeCue = detectTime(all);
  let setting = detectSetting(`${subject} ${extras.join(" ")} ${mediumWords}`);
  if (setting === "none" && (kind === "product" || kind === "food") && medium === "photo") setting = "studio";
  if (setting === "none" && kind === "interior") setting = "interior";
  if (setting === "none" && kind === "landscape") setting = "nature";

  return {
    lang,
    subject: subject.trim(),
    extras,
    medium,
    illustrationStyle: medium === "illustration" ? illustrationStyleOf(all) : null,
    paintingStyle: medium === "painting" ? paintingStyleOf(all) : null,
    graphicKind: medium === "graphic" ? graphicKindOf(all) : null,
    isometric: /\b(isometric|isom[eé]tric[ao])\b/i.test(fold(all)),
    subjectKind: kind,
    setting,
    time: timeCue,
    weather: detectWeather(all),
    gaze: GAZE_RE.test(fold(subject)),
    motion: MOTION_RE.test(fold(subject)),
    closeUp: CLOSEUP_RE.test(fold(all)),
    minimal: MINIMAL_RE.test(fold(all)),
    userStyle,
    userLighting,
    userPalette,
    userMood,
    userCamera,
    aspectRatio,
    negatives: negatives.filter(Boolean),
    requestedText: extractRequestedText(raw),
    generator,
    subjectNoun: noun,
    subjectArticle: article,
  };
}

// ---------------------------------------------------------------------------
// Prose helpers
// ---------------------------------------------------------------------------

type Ctx = {
  b: ImageBrief;
  es: boolean;
  /** "the woman" / "la mujer" */
  ref: string;
  /** "her" / "su" possessive */
  poss: string;
  /** Spanish object form: "a la mujer" / "al hombre" */
  refObj: string;
  /** Spanish genitive: "de la mujer" / "del hombre" (EN: "of the man") */
  refDe: string;
  /** Black-and-white / monochrome request: no color language anywhere. */
  mono: boolean;
};

function T(ctx: Ctx, es: string, en: string): string {
  return ctx.es ? es : en;
}

function refFor(b: ImageBrief): { ref: string; poss: string; refObj: string; refDe: string } {
  const noun = b.subjectNoun;
  const article = b.subjectArticle;
  const es = b.lang === "es";
  const female = /\b(woman|girl|lady|grandmother|mujer|chica|niña|señora|abuela|bailarina|cocinera|modelo)\b/i.test(b.subject);
  const male = /\b(man|boy|gentleman|grandfather|hombre|chico|niño|señor|abuelo|bailarín|cocinero)\b/i.test(b.subject);

  if (es) {
    const n = noun && noun !== "retrato" ? noun : b.subjectKind === "person" ? "persona" : "sujeto";
    const art = n === "persona" ? "la" : n === "sujeto" ? "el" : article ?? "el";
    const ref = `${art} ${n}`;
    const refObj = art === "el" ? `al ${n}` : `a la ${n}`;
    const refDe = art === "el" ? `del ${n}` : `de la ${n}`;
    return { ref, poss: "su", refObj, refDe };
  }
  const n = noun && noun !== "portrait" ? noun : b.subjectKind === "person" ? "person" : "subject";
  const poss = b.subjectKind === "person" ? (female ? "her" : male ? "his" : "their") : "its";
  return { ref: `the ${n}`, poss, refObj: `the ${n}`, refDe: `of the ${n}` };
}

const MONO_RE = /\b(black and white|black-and-white|b&w|monochrome|monochromatic|grayscale|greyscale|blanco y negro|monocrom[aá]tic[ao]|monocrom[ao]|escala de grises)\b/i;

/** "roja" → "rojo": Spanish colors named as "el color X" take the masculine form. */
function esColorMasculine(color: string): string {
  return color
    .replace(/^roj[ao]$/, "rojo")
    .replace(/^negr[ao]$/, "negro")
    .replace(/^blanc[ao]$/, "blanco")
    .replace(/^amarill[ao]$/, "amarillo")
    .replace(/^dorad[ao]$/, "dorado")
    .replace(/^platead[ao]$/, "plateado");
}

/** Whether the subject phrase carries an action ("reading", "corriendo"). */
function hasAction(b: ImageBrief): boolean {
  return b.lang === "es" ? /\b\w+(ando|iendo|endo)\b/i.test(b.subject) : /\b\w{3,}ing\b/i.test(b.subject);
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function lowerArticle(s: string): string {
  return ARTICLE_START.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}

function hairWord(b: ImageBrief): string | null {
  const s = b.subject;
  if (b.lang === "es") {
    if (/\brubi[ao]s?\b/i.test(s)) return "su pelo rubio";
    if (/\bpelirroj[ao]s?\b/i.test(s)) return "su pelo rojizo";
    if (/\bcanos[ao]s?\b|\bpelo (gris|blanco|canoso)\b/i.test(s)) return "su pelo canoso";
    if (/\bcasta[nñ][ao]s?\b/i.test(s)) return "su pelo castaño";
    if (/\bpelo (negro|oscuro)\b|\bmoren[ao]\b/i.test(s)) return "su pelo oscuro";
    return null;
  }
  if (/\bblond(e)?\b/i.test(s)) return "blonde hair";
  if (/\b(red-haired|redhead|ginger|red hair)\b/i.test(s)) return "red hair";
  if (/\b(gray|grey|white|silver)[- ]haired\b|\b(gray|grey|white|silver) hair\b/i.test(s)) return "silver hair";
  if (/\bbrunette\b|\bbrown hair\b/i.test(s)) return "brown hair";
  if (/\bblack hair\b|\bdark[- ]haired\b/i.test(s)) return "dark hair";
  return null;
}

function subjectColor(b: ImageBrief): string | null {
  const m = b.lang === "es"
    ? b.subject.match(/\b(roj[ao]|azul|verde|amarill[ao]|negr[ao]|blanc[ao]|plateado|plateada|dorad[ao]|naranja|violeta|rosa|gris)\b/i)
    : b.subject.match(/\b(red|blue|green|yellow|black|white|silver|gold|golden|orange|purple|pink|gray|grey|matte black)\b/i);
  return m ? m[1].toLowerCase() : null;
}

// ---------------------------------------------------------------------------
// Art-direction decisions
// ---------------------------------------------------------------------------

function leadIn(ctx: Ctx): string {
  const { b } = ctx;
  const subject = lowerArticle(b.subject);
  const join = (lead: string, conn: string) => {
    if (/^(for|with|featuring|para|con)\b/i.test(subject)) return `${lead} ${subject}`;
    const glued = `${lead} ${conn} ${subject}`;
    return ctx.es ? glued.replace(/\bde el\b/g, "del") : glued;
  };

  switch (b.medium) {
    case "photo": {
      if (b.subjectKind === "product" && (b.minimal || b.setting === "studio"))
        return join(T(ctx, b.minimal ? "Fotografía de producto minimalista en estudio" : "Fotografía de producto en estudio", b.minimal ? "Minimal studio product photograph" : "Studio product photograph"), T(ctx, "de", "of"));
      if (b.subjectKind === "food") return join(T(ctx, "Fotografía gastronómica", "Food photograph"), T(ctx, "de", "of"));
      if (b.closeUp && b.subjectKind === "person") return join(T(ctx, "Retrato fotográfico realista", "Photorealistic portrait"), T(ctx, "de", "of"));
      return join(T(ctx, "Fotografía realista", "Photorealistic photograph"), T(ctx, "de", "of"));
    }
    case "illustration": {
      const lead: Record<IllustrationStyle, [string, string]> = {
        storybook: ["Ilustración de libro infantil", "Children's picture-book illustration"],
        watercolor: ["Ilustración en acuarela", "Watercolor illustration"],
        anime: ["Ilustración estilo anime", "Anime-style illustration"],
        vector: ["Ilustración vectorial plana", "Flat vector illustration"],
        ink: ["Dibujo en tinta", "Ink drawing"],
        pixel: ["Pixel art", "Pixel art"],
        comic: ["Ilustración estilo cómic", "Comic-book illustration"],
        digital: ["Ilustración digital pintada", "Painterly digital illustration"],
      };
      const [es, en] = lead[b.illustrationStyle ?? "digital"];
      return join(T(ctx, es, en), T(ctx, "de", "of"));
    }
    case "painting": {
      const lead: Record<PaintingStyle, [string, string]> = {
        oil: ["Pintura al óleo", "Oil painting"],
        acrylic: ["Pintura acrílica", "Acrylic painting"],
        impressionist: ["Pintura impresionista", "Impressionist painting"],
        gouache: ["Pintura en gouache", "Gouache painting"],
        generic: ["Pintura", "Painting"],
      };
      const [es, en] = lead[b.paintingStyle ?? "generic"];
      return join(T(ctx, es, en), T(ctx, "de", "of"));
    }
    case "3d":
      return join(T(ctx, b.isometric ? "Render 3D isométrico" : "Render 3D", b.isometric ? "Isometric 3D render" : "3D render"), T(ctx, "de", "of"));
    case "graphic": {
      const lead: Record<GraphicKind, [string, string]> = {
        logo: ["Diseño de logo", "Logo design"],
        icon: ["Diseño de ícono", "Icon design"],
        poster: ["Diseño de póster", "Poster design"],
        social: ["Pieza gráfica para redes", "Social media graphic"],
        generic: ["Pieza de diseño gráfico", "Graphic design piece"],
      };
      const [es, en] = lead[b.graphicKind ?? "generic"];
      return join(T(ctx, es, en), T(ctx, "de", "featuring"));
    }
  }
}

function environmentLayers(ctx: Ctx): string | null {
  const { b } = ctx;
  const s = fold(`${b.subject} ${b.extras.join(" ")}`);
  const L = (es: string, en: string) => T(ctx, es, en);

  if (b.setting === "studio") return null;
  if (b.setting === "interior") {
    if (/\b(library|biblioteca)\b/i.test(s))
      return L("alrededor, estanterías altas de madera repletas de libros, con pilas de libros en primer plano y el fondo perdiéndose en una penumbra cálida", "around it, tall wooden shelves packed with books, stacks of books in the foreground and the room receding into warm shadow");
    if (/\b(kitchen|cocina)\b/i.test(s))
      return L("una cocina con superficies de trabajo despejadas, utensilios a mano y profundidad hacia una ventana", "a kitchen with uncluttered worktops, utensils within reach, and depth toward a window");
    return L("un interior ordenado con capas de profundidad: muebles en primer plano, el espacio abriéndose detrás", "a tidy interior with layered depth: furniture in the foreground, the space opening up behind");
  }
  if (b.setting === "urban") {
    if (b.time === "night")
      return L("alrededor, una calle densa de ciudad de noche: luces de locales y edificios en capas que se pierden en la profundidad, el asfalto brillante reflejando cada fuente de luz", "around it, a dense city street at night: layered storefront and building lights receding into the distance, the asphalt glossy and mirroring every light source");
    return L("una calle de ciudad con capas de profundidad: vereda en primer plano, fachadas en el plano medio y el perfil urbano al fondo", "a city street with layered depth: sidewalk in the foreground, facades in the midground, and the skyline in the distance");
  }
  if (b.setting === "coast")
    return L("la costa se abre en capas: arena húmeda con finas líneas de espuma en primer plano, olas suaves en el plano medio y el horizonte del mar a lo lejos", "the coast opens out in layers: wet sand with thin lines of foam in the foreground, gentle waves in the midground, and an open sea horizon beyond");
  if (b.setting === "nature" || b.subjectKind === "landscape" || (b.subjectKind === "person" && b.gaze)) {
    if (/\b(mountain|mountains|monta[nñ]a|monta[nñ]as)\b/i.test(s))
      return L("el paisaje se abre en capas: terreno rocoso y pasto alpino en primer plano, un valle profundo en el plano medio y picos recortados a lo lejos", "the landscape opens out in layers: rocky ground and alpine grass in the foreground, a deep valley in the midground, and jagged peaks in the distance");
    if (/\b(forest|woods|bosque|selva|jungle)\b/i.test(s))
      return L("el bosque se abre en capas: helechos y raíces con musgo en primer plano, hileras de troncos altos en el plano medio y luz filtrándose por el follaje al fondo", "the forest opens out in layers: ferns and mossy roots in the foreground, rows of tall trunks in the midground, and light filtering through the canopy beyond");
    if (/\b(lake|lago)\b/i.test(s))
      return L("el paisaje se abre en capas: juncos en la orilla en primer plano, el agua quieta reflejando el cielo y líneas de árboles y colinas al fondo", "the landscape opens out in layers: reeds at the shore in the foreground, still water mirroring the sky, and tree lines and hills beyond");
    if (/\b(desert|desierto)\b/i.test(s))
      return L("el paisaje se abre en capas: arena ondulada en primer plano, dunas en el plano medio y un horizonte que vibra con el calor", "the landscape opens out in layers: rippled sand in the foreground, dunes in the midground, and a heat-hazed horizon");
    if (/\b(field|meadow|campo|pradera)\b/i.test(s))
      return L("el paisaje se abre en capas: flores silvestres en primer plano, un campo abierto en el plano medio y una hilera de árboles al fondo", "the landscape opens out in layers: wildflowers in the foreground, an open field in the midground, and a line of trees in the distance");
    return L("el paisaje se abre ante la escena en capas: pasto alto en primer plano, colinas ondulantes en el plano medio y montañas lejanas en un horizonte apenas brumoso", "the landscape opens out in layers: tall grass in the foreground, rolling hills in the midground, and distant mountains on a softly hazy horizon");
  }
  return null;
}

function compositionFor(ctx: Ctx): string {
  const { b } = ctx;
  const L = (es: string, en: string) => T(ctx, es, en);

  if (b.medium === "graphic") {
    switch (b.graphicKind) {
      case "logo":
      case "icon":
        return L("Una marca simple y memorable, centrada sobre un fondo liso, con formas limpias que se lean bien en tamaños chicos", "A simple, memorable mark centered on a plain background, built from clean shapes that stay legible at small sizes");
      case "poster":
        return L("Jerarquía visual clara: una imagen focal dominante, un área de titular reservada con espacio negativo generoso y el resto de los elementos subordinados", "Clear visual hierarchy: one dominant focal image, a headline area reserved with generous negative space, and every other element subordinate");
      default:
        return L("Composición audaz y de alto contraste, legible de un vistazo en tamaño chico, con un único punto focal y márgenes seguros", "A bold, high-contrast composition readable at a glance at small size, with a single focal point and safe margins");
    }
  }

  switch (b.subjectKind) {
    case "person":
      if (b.closeUp)
        return L(`Retrato de cabeza y hombros, con un giro leve a tres cuartos y la mirada cerca del tercio superior del encuadre`, `Head-and-shoulders framing, ${ctx.ref} turned slightly to three-quarters, eyes near the upper third of the frame`);
      if (b.gaze)
        return L(`Vemos ${ctx.refObj} de espaldas, en un leve ángulo de tres cuartos, en el tercio izquierdo del encuadre, para que compartamos su vista`, `Seen from behind at a slight three-quarter angle, ${ctx.ref} stands in the left third of the frame so we share ${ctx.poss} view`);
      return L(`Vista de tres cuartos a la altura de los ojos, con ${ctx.ref} en una pose natural y relajada, fuera del centro del encuadre`, `Three-quarter view at eye level, ${ctx.ref} in a natural, relaxed pose, placed off-center`);
    case "vehicle":
      return b.motion
        ? L(`Ángulo bajo de tres cuartos frontal, a la altura del paragolpes; ${ctx.ref} ocupa los dos tercios izquierdos de un encuadre amplio, avanzando hacia el borde derecho`, `Low front three-quarter angle at bumper height; ${ctx.ref} fills the left two-thirds of a wide frame, heading toward the right edge`)
        : L(`Ángulo bajo de tres cuartos frontal, sin cortar ninguna parte ${ctx.refDe} y con aire alrededor`, `Low front three-quarter angle, with ${ctx.ref} fully in frame and breathing room around it`);
    case "product":
      return L(`${capitalize(ctx.ref)} descansa en un leve ángulo sobre una superficie mate; vista de tres cuartos a la altura del objeto, algo fuera del centro, con espacio negativo generoso`, `${capitalize(ctx.ref)} resting at a slight angle on a matte surface, seen in three-quarter view at object height, slightly off-center, with generous negative space`);
    case "food":
      return L(`Ángulo de 45 grados, ${ctx.ref} como protagonista en el tercio inferior, con uno o dos ingredientes del propio plato desenfocados detrás`, `45-degree angle, ${ctx.ref} as the hero in the lower third, with one or two of its own ingredients softly out of focus behind`);
    case "creature":
    case "animal":
      if (b.closeUp)
        return L(`Primer plano con los ojos ${ctx.refDe} en foco y en el tercio superior del encuadre`, `Close framing with ${ctx.ref}'s eyes in focus on the upper third of the frame`);
      return hasAction(b)
        ? L(`Plano medio a la altura de los ojos ${ctx.refDe}, con la acción clara y legible y el entorno contando la historia alrededor`, `Medium shot at ${ctx.ref}'s eye level, the action clear and readable, with the setting telling the story around it`)
        : L(`Plano medio a la altura de los ojos ${ctx.refDe}, en una postura natural y relajada, con un entorno simple que no compite`, `Medium shot at ${ctx.ref}'s eye level in a natural, relaxed pose, with a simple setting that doesn't compete`);
    case "interior":
      return L("Plano amplio a la altura de los ojos, con líneas verticales rectas y un punto focal claro en el centro de la escena", "Wide shot at eye level, verticals kept straight, with one clear focal point at the heart of the scene");
    case "architecture":
      return L(`${capitalize(ctx.ref)} como forma dominante, en un ángulo de dos puntos de fuga, con verticales rectas y el entorno dándole escala`, `${capitalize(ctx.ref)} as the dominant form, seen at a two-point-perspective angle with straight verticals and its surroundings giving it scale`);
    case "landscape":
      return L("Plano general con horizonte en el tercio inferior, un elemento de primer plano que guíe la mirada hacia el fondo", "Wide establishing view with the horizon on the lower third and a foreground element leading the eye into the distance");
    default:
      return L("Un único punto focal claro, ubicado según la regla de los tercios, con capas de profundidad alrededor", "A single clear focal point placed on the rule of thirds, with layered depth around it");
  }
}

function cameraFor(ctx: Ctx): string | null {
  const { b } = ctx;
  if (b.userCamera.length) return b.userCamera.join(", ");
  const L = (es: string, en: string) => T(ctx, es, en);

  if (b.medium === "photo") {
    switch (b.subjectKind) {
      case "person":
        return b.closeUp
          ? L("Objetivo de 85 mm, poca profundidad de campo (f/2): ojos nítidos y fondo disuelto en un bokeh suave", "85mm lens, shallow depth of field (f/2): eyes sharp, background dissolving into soft bokeh")
          : L(`Plano general medio, objetivo de 35 mm a la altura de los ojos, profundidad de campo moderada (f/5.6): ${ctx.ref} en foco y el fondo legible pero apenas suave`, `Medium-wide shot, 35mm lens at eye level, moderate depth of field (f/5.6): ${ctx.ref} sharp, the background readable but slightly soft`);
      case "vehicle":
        return b.motion
          ? L(`Objetivo de 35 mm en barrido lento (1/30 s): ${ctx.ref} queda en foco mientras las luces del fondo se estiran en trazos horizontales`, `35mm lens on a slow panning exposure (1/30 s): ${ctx.ref} stays sharp while the background lights stretch into horizontal streaks`)
          : L("Objetivo de 35 mm, f/8 para que todo el vehículo quede nítido", "35mm lens at f/8 so the whole vehicle is sharp");
      case "product":
        return L("Objetivo macro de 100 mm a f/11 para que todo el producto quede nítido de borde a borde", "100mm macro lens at f/11 so the whole product is sharp edge to edge");
      case "food":
        return L(`Objetivo de 50 mm a f/2.8: el frente ${ctx.refDe} en foco y el fondo cayendo suave`, `50mm lens at f/2.8: the front ${ctx.refDe} crisp, the background falling off softly`);
      case "animal":
      case "creature":
        return L("Teleobjetivo de 200 mm a f/4, foco en los ojos, fondo separado en un desenfoque suave", "200mm telephoto at f/4, focus on the eyes, background separated into a soft blur");
      case "interior":
      case "architecture":
        return L("Objetivo de 24 mm con corrección de perspectiva, f/8 para nitidez en todo el encuadre", "24mm tilt-shift lens, f/8 for sharpness across the frame");
      case "landscape":
        return L("Objetivo de 24 mm, f/11, foco hiperfocal para que primer plano y horizonte queden nítidos", "24mm lens at f/11, focused at the hyperfocal distance so foreground and horizon are both sharp");
      default:
        return L("Objetivo de 35 mm a la altura de los ojos, profundidad de campo moderada", "35mm lens at eye level, moderate depth of field");
    }
  }
  if (b.medium === "3d")
    return b.isometric
      ? L("Cámara isométrica con proyección ortográfica, sin distorsión de perspectiva", "Isometric camera with orthographic projection, no perspective distortion")
      : L("Cámara virtual con distancia focal media y una profundidad de campo suave que separa el sujeto del fondo", "Virtual camera at a medium focal length with a gentle depth of field separating the subject from the background");
  return null;
}

function lightingFor(ctx: Ctx): string {
  const { b } = ctx;
  if (b.userLighting.length) return capitalize(b.userLighting.join(", "));
  const L = (es: string, en: string) => T(ctx, es, en);
  const hair = ctx.mono ? null : hairWord(b);

  // Logos, icons and posters are flat graphics: light is not a decision there.
  if (b.medium === "graphic") return "";

  if (b.subjectKind === "food")
    return L(
      "Luz lateral suave desde una fuente grande tipo ventana, un contraluz leve que hace brillar las texturas y un rebote chico que abre las sombras",
      "Soft side light from a large window-like source, a gentle backlight that makes the textures glisten, and a small fill card opening the shadows"
    );

  if (b.setting === "studio") {
    return b.subjectKind === "person"
      ? L("Luz principal suave a 45 grados, relleno sutil y una luz de contorno leve que separa la figura del fondo liso", "Soft key light at 45 degrees, gentle fill, and a subtle rim light separating the figure from a seamless backdrop")
      : L("Una caja de luz grande desde arriba a la izquierda dibuja un degradé suave de brillo, una luz de tira detrás marca un contorno nítido en los bordes y un rebote blanco levanta las sombras", "A large softbox from the upper left lays a soft gradient highlight, a thin strip light behind draws a crisp rim along the edges, and a white bounce card lifts the shadows");
  }

  if (b.weather === "storm")
    return L(`Luz de tormenta dramática: nubes pesadas y oscuras, un claro de luz que cae sobre ${ctx.ref} y lluvia empujada por el viento`, `Dramatic storm light: heavy dark clouds, a break of light falling on ${ctx.ref}, wind-driven rain`);

  switch (b.time) {
    case "night":
      if (b.setting === "urban") {
        if (ctx.mono)
          return L("La luz viene de la ciudad: faroles y vidrieras desde un costado, brillos nítidos sobre las superficies y sombras profundas", "Lighting comes from the city itself: streetlights and shop windows from the side, crisp highlights on glossy surfaces, and deep shadows");
        return L(
          `La luz viene de la ciudad: resplandor de neón cian y magenta desde un costado, faroles cálidos arriba y brillos nítidos que recorren ${b.subjectKind === "vehicle" ? `las curvas ${ctx.refDe}` : "cada superficie"}`,
          `Lighting comes from the city itself: cyan and magenta neon glow from the side, warm streetlights overhead, and crisp highlights sliding along ${b.subjectKind === "vehicle" ? `${ctx.ref}'s curves` : "every surface"}`
        );
      }
      return ctx.mono
        ? L("Luz de luna desde arriba y atrás, sombras profundas y un cielo con estrellas tenues", "Moonlight from above and behind, deep shadows, and a faintly starlit sky")
        : L("Luz de luna fría desde arriba y atrás, sombras azul profundo y un cielo con estrellas tenues", "Cool moonlight from above and behind, deep blue shadows, and a faintly starlit sky");
    case "dawn":
      return ctx.mono
        ? L("Luz suave de amanecer, bruma baja y sombras largas", "Soft dawn light, low mist, and long shadows")
        : L("Luz suave de amanecer: cielo rosa pálido y damasco, bruma baja y sombras frías", "Soft dawn light: a pale pink and apricot sky, low mist, and cool shadows");
    case "day":
      return L("Luz de día clara desde arriba, sombras nítidas y colores naturales", "Clear daylight from high above, crisp shadows, and natural colors");
    case "overcast":
      return L("Luz nublada suave y pareja, sin sombras duras", "Soft, even overcast light with no harsh shadows");
    case "golden":
    default:
      break;
  }

  // No explicit time: weather decides the light when it is given.
  if (!b.time && b.weather === "rain")
    return L("Luz difusa bajo nubes de lluvia pesadas, con la lluvia y las superficies mojadas atrapando cada brillo", "Diffuse light under heavy rain clouds, with the falling rain and wet surfaces catching every highlight");
  if (!b.time && b.weather === "fog")
    return L("Luz suave y sin dirección filtrada por la niebla, con las formas desvaneciéndose con la distancia", "Soft, directionless light filtered through fog, with forms fading into the distance");
  if (!b.time && b.weather === "snow")
    return L("Luz fría y suave rebotando en la nieve, sombras azuladas", "Cold, soft light bouncing off the snow, with bluish shadows");

  if (b.setting === "interior")
    return L("Luz de ventana suave desde un costado mezclada con el brillo cálido de una lámpara, sombras largas y suaves", "Soft window light from one side mixed with a warm lamp glow, long gentle shadows");

  // A close portrait with no stated place reads best in soft directional light.
  if (!b.time && b.subjectKind === "person" && b.closeUp && b.setting === "none")
    return L(
      `Luz suave de ventana desde un costado que modela el rostro, con caída gradual hacia la sombra${hair ? ` y un brillo suave en ${hair}` : ""}`,
      `Soft window light from one side sculpting the face, falling off gradually into shadow${hair ? `, with a gentle sheen on ${ctx.poss} ${hair}` : ""}`
    );

  // Default outdoor light: golden hour (explicit or chosen).
  const halo = ctx.mono ? T(ctx, "un halo de luz", "a halo of light") : T(ctx, "un halo cálido", "a warm halo");
  const subjectRim =
    b.subjectKind === "person"
      ? T(ctx, ` y contornea ${ctx.refObj} con ${halo}${hair ? ` que enciende ${hair}` : ""}`, ` and rims ${ctx.ref} with ${halo}${hair ? ` that lights up ${ctx.poss} ${hair}` : ""}`)
      : T(ctx, ` y contornea ${ctx.refObj} con ${halo}`, ` and rims ${ctx.ref} with ${halo}`);
  const weatherTail =
    b.weather === "fog"
      ? T(ctx, "; niebla en capas suaviza la distancia", "; layered fog softens the distance")
      : b.weather === "rain"
      ? T(ctx, "; superficies mojadas que reflejan la luz", "; wet surfaces catching the light")
      : b.weather === "snow"
      ? T(ctx, "; nieve cayendo suave a contraluz", "; snow drifting down against the light")
      : T(ctx, ", sombras largas y suaves y una bruma leve en la distancia", ", long soft shadows, and a gentle haze in the distance");
  const lead = ctx.mono ? T(ctx, "Luz baja de fin de tarde", "Low late-afternoon light") : T(ctx, "Luz de hora dorada", "Golden-hour light");
  return L(`${lead}: el sol bajo, detrás y a un costado, entra rasante${subjectRim}${weatherTail}`, `${lead}: the low sun, behind and to one side, rakes across the scene${subjectRim}${weatherTail}`);
}

function paletteFor(ctx: Ctx): string {
  const { b } = ctx;
  if (b.userPalette.length) return capitalize(b.userPalette.join(", "));
  const L = (es: string, en: string) => T(ctx, es, en);
  const rawColor = subjectColor(b);
  const color = rawColor && ctx.es ? esColorMasculine(rawColor) : rawColor;

  if (ctx.mono)
    return L("Blanco y negro: gama tonal completa, de negros profundos a blancos limpios, con contraste marcado y sin tintes de color", "Black and white: a full tonal range from deep blacks to clean whites, with strong contrast and no color tint");
  if (b.medium === "graphic")
    return L("Paleta limitada de dos o tres colores planos con contraste alto", "A limited palette of two or three flat colors with strong contrast");
  if (b.illustrationStyle === "storybook")
    return L("Paleta cálida y amigable: verdes suaves, amarillos miel, rosa empolvado y turquesa", "A warm, friendly palette: soft greens, honey yellows, dusty rose, and teal");
  if (b.illustrationStyle === "pixel") return L("Paleta limitada de 16 a 32 colores", "A limited 16 to 32 color palette");
  if (b.subjectKind === "food")
    return L("Tonos cálidos y apetitosos, con acentos frescos de los propios ingredientes", "Warm, appetizing tones with fresh accents from the ingredients themselves");

  if (b.setting === "studio") {
    const light = /white|blanc|silver|platead/i.test(color ?? "");
    return light
      ? L(`Paleta sobria, casi monocroma: ${ctx.ref} contra un fondo gris carbón profundo`, `A restrained, near-monochrome palette: ${ctx.ref} against a deep charcoal backdrop`)
      : L(`Paleta sobria, casi monocroma: ${ctx.ref} contra un fondo gris claro cálido y liso, con un único brillo contenido`, `A restrained, near-monochrome palette: ${ctx.ref} against a warm light-gray seamless backdrop, with a single controlled highlight`);
  }
  if (b.time === "night" && b.setting === "urban")
    return L(
      `Sombras azul negro profundas con acentos de neón cian y magenta${color ? `; el color ${color} ${ctx.refDe} es el más saturado del cuadro` : ""}`,
      `Deep blue-black shadows with cyan and magenta neon accents${color ? `; ${ctx.ref}'s ${color} paint is the most saturated color in the frame` : ""}`
    );
  if (b.time === "night") return L("Azul marino profundo y plateado, con un único acento cálido", "Deep navy and silver-blue, with a single warm accent");
  if (b.time === "dawn") return L("Rosa pálido, damasco y azules fríos", "Pale pink, apricot, and cool blues");
  if (b.weather === "storm") return L("Grises pizarra y azules fríos, con un único claro de luz cálida", "Slate grays and cold blues, with a single break of warm light");
  if (!b.time && b.weather === "rain") return L("Grises azulados fríos con un único acento cálido", "Cool blue-grays with a single warm accent");
  if (!b.time && b.weather === "fog") return L("Grises desaturados y verdes suaves", "Muted, desaturated grays and soft greens");
  if (!b.time && b.weather === "snow") return L("Blanco azulado y grises fríos, con un único acento cálido", "Blue-white and cool grays, with a single warm accent");
  if (b.setting === "interior") return L("Marrones cálidos de madera, ámbar suave y verdes apagados", "Warm wood browns, soft amber, and muted greens");
  if (b.subjectKind === "person" && b.closeUp && b.setting === "none" && !b.time)
    return L("Tonos de piel naturales sobre un fondo neutro y apagado", "Natural skin tones against a muted, neutral background");
  return L("Ámbar y miel cálidos en el cielo y la luz, verdes apagados y azules suaves en la distancia", "Warm amber and honey tones in the sky and light, muted greens and soft blues in the distance");
}

function treatmentFor(ctx: Ctx): string {
  const { b } = ctx;
  const L = (es: string, en: string) => T(ctx, es, en);
  switch (b.medium) {
    case "photo":
      if (b.subjectKind === "product")
        return L("Fotografía comercial nítida y con mucho detalle, materiales fieles (brillo, mate y metal como son en realidad), sin retoques exagerados", "Crisp, high-detail commercial photography with true-to-life materials (gloss, matte, and metal rendered as they really are), no heavy retouching");
      return ctx.mono
        ? L("Fotorrealista, texturas naturales, negros ricos y un grano de película sutil", "Photorealistic, natural textures, rich blacks, and subtle film grain")
        : L("Fotorrealista, texturas naturales, color fiel y un grano de película sutil", "Photorealistic, natural textures, true-to-life color, and subtle film grain");
    case "illustration":
      switch (b.illustrationStyle) {
        case "storybook":
          return L("Texturas suaves de gouache y acuarela, formas redondeadas y amables, siluetas claras y legibles, expresiones cálidas y el grano del papel visible", "Soft gouache and watercolor textures, gentle rounded shapes, clean readable silhouettes, warm friendly expressions, and visible paper grain");
        case "watercolor":
          return L("Acuarela suelta sobre papel texturado: aguadas húmedas, floraciones de pigmento, detalle a pincel seco solo en el punto focal y zonas de papel sin pintar", "Loose watercolor on textured paper: wet-on-wet washes, delicate pigment blooms, dry-brush detail only at the focal point, and some paper left unpainted");
        case "anime":
          return L("Line art limpio y seguro, sombreado cel en dos o tres pasos, fondo pintado", "Clean, confident line art, cel shading in two or three tone steps, and a painted background");
        case "vector":
          return L("Formas geométricas limpias, bordes nítidos, degradés mínimos o nulos", "Clean geometric shapes, crisp edges, minimal or no gradients");
        case "ink":
          return L("Trazo seguro, sombreado con tramado, alto contraste sobre papel", "Confident linework, cross-hatched shading, high contrast on paper");
        case "pixel":
          return L("Píxeles nítidos sin antialiasing, legible en tamaño chico", "Crisp pixels with no anti-aliasing, readable at small size");
        case "comic":
          return L("Contornos entintados marcados, colores planos con tramas de medio tono y encuadre dinámico", "Bold inked outlines, flat colors with halftone shading, and dynamic framing");
        default:
          return L("Pinceladas pictóricas, bordes suaves en el fondo y detalle nítido en el punto focal, color rico pero controlado", "Painterly brushwork, soft edges in the background and crisp detail at the focal point, rich but controlled color");
      }
    case "painting":
      switch (b.paintingStyle) {
        case "oil":
          return L("Pinceladas visibles con empaste, color rico en capas, transiciones suaves en el cielo y textura de tela", "Visible impasto brushstrokes, rich layered color, soft blended transitions in the sky, and canvas texture");
        case "impressionist":
          return L("Pinceladas cortas y quebradas, color puro yuxtapuesto y la luz como protagonista", "Short broken brushstrokes, pure juxtaposed color, and light as the protagonist");
        default:
          return L("Pinceladas visibles y color pictórico en capas, con textura del soporte", "Visible brushwork and layered painterly color, with the texture of the surface showing");
      }
    case "3d":
      return L(
        /\b(clay|plastilina|claymation)\b/i.test(b.userStyle.join(" ") + b.subject) ? "Materiales tipo arcilla mate y suave, iluminación global suave y oclusión ambiental sutil" : "Materiales físicamente correctos, iluminación global suave, oclusión ambiental sutil y geometría limpia",
        /\b(clay|plastilina|claymation)\b/i.test(b.userStyle.join(" ") + b.subject) ? "Soft matte clay-like materials, gentle global illumination, and subtle ambient occlusion" : "Physically based materials, soft global illumination, subtle ambient occlusion, and clean geometry"
      );
    case "graphic":
      return b.graphicKind === "logo" || b.graphicKind === "icon"
        ? L("Formas vectoriales planas y escalables, sin mockups, degradés ni efectos 3D", "Flat, scalable vector shapes, with no mockups, gradients, or 3D effects")
        : L("Formas simplificadas y audaces, tipografía solo donde se pidió, márgenes limpios", "Bold simplified shapes, typography only where requested, clean margins");
  }
}

function moodFor(ctx: Ctx): string {
  const { b } = ctx;
  if (b.userMood.length) return capitalize(b.userMood.join(", "));
  const L = (es: string, en: string) => T(ctx, es, en);
  if (b.medium === "graphic") return L("Claro, directo y memorable", "Clear, direct, and memorable");
  if (b.illustrationStyle === "storybook") return L("Acogedor, curioso y tierno", "Cozy, curious, and gentle");
  if (/\b(cute|adorable|kawaii|tiern[ao]|adorable|lind[ao])\b/i.test(b.subject)) return L("Juguetón y encantador", "Playful and charming");
  if (b.subjectKind === "creature") return L("Mágico y acogedor", "Magical and inviting");
  if (b.subjectKind === "product") return L("Calmo, premium y minimalista", "Calm, premium, and minimal");
  if (b.subjectKind === "vehicle" && b.time === "night") return L("Elegante, enérgico y cinematográfico", "Sleek, energetic, and cinematic");
  if (b.subjectKind === "vehicle") return L("Enérgico y cinematográfico", "Energetic and cinematic");
  if (b.subjectKind === "food") return L("Fresco y apetitoso", "Fresh and inviting");
  if (b.weather === "storm") return L("Dramático y sobrecogedor", "Dramatic and awe-inspiring");
  if (b.subjectKind === "person" && b.gaze) return L("Sereno y contemplativo, con sensación de espacio abierto", "Serene and contemplative, with a sense of open space");
  if (b.setting === "interior") return L("Cálido y acogedor", "Warm and inviting");
  if (b.time === "night") return L("Quieto y misterioso", "Quiet and mysterious");
  return L("Cohesivo, intencional y natural", "Cohesive, intentional, and natural");
}

function aspectFor(b: ImageBrief): string {
  if (b.aspectRatio) return b.aspectRatio;
  if (b.medium === "graphic") return b.graphicKind === "poster" ? "2:3" : b.graphicKind === "social" ? "4:5" : "1:1";
  if (b.illustrationStyle === "storybook") return "4:3";
  switch (b.subjectKind) {
    case "person":
      return b.closeUp ? "4:5" : "3:2";
    case "product":
      return b.minimal ? "1:1" : "4:5";
    case "food":
      return "4:5";
    case "vehicle":
    case "landscape":
      return "16:9";
    default:
      return "3:2";
  }
}

function avoidFor(ctx: Ctx): string[] {
  const { b } = ctx;
  const L = (es: string, en: string) => T(ctx, es, en);
  const out: string[] = [];
  if (!b.requestedText) {
    if (b.medium === "graphic" && (b.graphicKind === "logo" || b.graphicKind === "icon"))
      out.push(L("letras o nombres de marca inventados", "invented lettering or brand names"));
    else out.push(L("texto, marcas de agua y logos", "text, watermarks, and logos"));
  }
  switch (b.subjectKind) {
    case "person":
      if (!/\b(couple|family|people|group|friends|pareja|familia|gente|grupo|amigos|amigas)\b/i.test(b.subject))
        out.push(L("otras personas en cuadro", "extra people in the frame"));
      break;
    case "product":
      out.push(L("nombres de marca o logos sobre el producto, props, polvo y huellas", "brand names or logos on the product, props, dust, and fingerprints"));
      break;
    case "vehicle":
      out.push(L("texto legible en carteles o patentes, otros vehículos tapando la vista", "legible sign or license-plate text, other vehicles blocking the view"));
      break;
    case "creature":
      if (b.illustrationStyle === "storybook") out.push(L("expresiones amenazantes o que den miedo", "menacing or scary expressions"));
      break;
    default:
      break;
  }
  for (const n of b.negatives) if (n) out.push(n);
  // de-duplicate case-insensitively
  const seen = new Set<string>();
  return out.filter((x) => {
    const k = x.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function textDirection(ctx: Ctx): string | null {
  const { b } = ctx;
  if (!b.requestedText) return null;
  return T(
    ctx,
    `Incluí el texto “${b.requestedText}” exactamente así, con tipografía limpia y legible, integrado en la composición sin tapar al sujeto.`,
    `Render the text “${b.requestedText}” exactly as written, in clean, legible typography, integrated into the composition without covering the subject.`
  );
}

// ---------------------------------------------------------------------------
// Composer
// ---------------------------------------------------------------------------

const MAPPED_STYLE_WORDS =
  /\b(style|styled|estilo|illustration|illustrated|ilustraci[oó]n|ilustrad[ao]|children'?s|kids'?|infantil|cuento|storybook|picture[- ]book|watercolou?r|acuarela|gouache|anime|manga|vector|vectorial|flat|pixel|art|comic|c[oó]mic|ink|tinta|sketch|boceto|drawing|dibujo|photo|photograph|photography|foto|fotograf[ií]a|photorealistic|fotorrealista|realistic|realista|3d|render|rendered|renderizado|cgi|isometric|isom[eé]tric[ao]|oil|[oó]leo|painting|pintura|acrylic|acr[ií]lico|digital|studio|estudio|minimal|minimalist|minimalista|logo|poster|p[oó]ster|icon|[ií]cono|a|an|the|in|of|de|en|un|una|el|la)\b/gi;

function residualStyleWords(segment: string): string[] {
  return segment
    .replace(MAPPED_STYLE_WORDS, " ")
    .split(/[\s,;:/-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2);
}

function sentence(s: string | null | undefined): string {
  const t = String(s ?? "").trim();
  if (!t) return "";
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}

export function composeImagePrompt(core: string, uiLang: Lang): ComposedImagePrompt | null {
  const text = String(core ?? "").trim();
  if (!text) return null;

  const b = parseImageRequest(text, uiLang);
  const es = b.lang === "es";
  const { ref, poss, refObj, refDe } = refFor(b);
  const ctx: Ctx = { b, es, ref, poss, refObj, refDe, mono: MONO_RE.test(fold(text)) };

  const lead = leadIn(ctx);
  const composition = compositionFor(ctx);
  const environment = environmentLayers(ctx);
  const camera = cameraFor(ctx);
  const lighting = lightingFor(ctx);
  const palette = paletteFor(ctx);
  const treatment = treatmentFor(ctx);
  const mood = moodFor(ctx);
  const aspect = aspectFor(b);
  const avoid = avoidFor(ctx);

  const L = (es_: string, en_: string) => (es ? es_ : en_);

  const extrasLine = b.extras.length ? sentence(`${L("Incluí además", "Also include")}: ${b.extras.join("; ")}`) : "";
  // A style segment the lead-in and treatment already express ("children's
  // illustration", "estilo acuarela") is not repeated; one carrying extra
  // intent ("Ghibli-inspired", "cinematic style") is kept verbatim.
  const styleNotes = b.userStyle.filter((s) => residualStyleWords(s).length > 0);
  const styleLine = styleNotes.length ? sentence(`${L("Estilo pedido", "Requested style")}: ${styleNotes.join("; ")}`) : "";

  // Neutral wardrobe only for generic people: a samurai, astronaut or chef
  // already implies what they wear, and stated clothing always wins.
  const genericPerson = /\b(woman|man|girl|boy|person|people|child|kid|lady|gentleman|couple|family|grandmother|grandfather|teenager|student|model|mujer|hombre|chica|chico|niña|niño|persona|señora|señor|abuela|abuelo|pareja|familia|adolescente|estudiante|modelo|gente)\b/i;
  const wardrobe =
    b.subjectKind === "person" &&
    b.medium !== "graphic" &&
    genericPerson.test(b.subject) &&
    !/\b(wearing|dress|shirt|jacket|suit|coat|uniform|armor|armour|vestid[ao]|vestido|camisa|campera|traje|abrigo|uniforme|armadura|con ropa)\b/i.test(b.subject)
      ? L("Ropa simple y sobria, en tonos neutros, que no compite con la escena", "Simple, understated clothing in neutral tones that doesn't compete with the scene")
      : "";

  const scene = environment ? `${composition}; ${environment}` : composition;
  const paragraph1 = [sentence(lead), sentence(scene), extrasLine, wardrobe ? sentence(wardrobe) : ""].filter(Boolean).join(" ");
  const paragraph2 = [camera ? sentence(camera) : "", lighting ? sentence(lighting) : "", sentence(palette)].filter(Boolean).join(" ");
  const paragraph3 = [sentence(treatment), styleLine, textDirection(ctx) ?? "", sentence(`${L("Tono", "Mood")}: ${mood.charAt(0).toLowerCase()}${mood.slice(1)}`)]
    .filter(Boolean)
    .join(" ");

  let closing: string;
  if (b.generator === "midjourney") {
    // --no takes plain comma-separated terms, not phrases with "and".
    const noTerms = [...(b.requestedText ? [] : es ? ["texto", "marca de agua", "logo"] : ["text", "watermark", "logo"]), ...b.negatives];
    closing = `--ar ${aspect}${noTerms.length ? ` --no ${noTerms.join(", ")}` : ""}`;
  } else if (b.generator === "stable-diffusion") {
    closing = [sentence(`${L("Relación de aspecto", "Aspect ratio")} ${aspect}`), `${L("Prompt negativo", "Negative prompt")}: ${avoid.join(", ")}`].join("\n");
  } else {
    closing = [sentence(`${L("Relación de aspecto", "Aspect ratio")} ${aspect}`), avoid.length ? sentence(`${L("Evitar", "Avoid")}: ${avoid.join("; ")}`) : ""]
      .filter(Boolean)
      .join(" ");
  }

  const prompt = [paragraph1, paragraph2, paragraph3, closing].filter(Boolean).join("\n\n");

  return {
    prompt,
    brief: b,
    direction: {
      medium: lead,
      subject: b.subject,
      composition: scene,
      camera,
      environment,
      lighting,
      palette,
      treatment,
      mood,
      aspectRatio: aspect,
      avoid,
    },
  };
}

/**
 * Build the finished image prompt for the deterministic path. A prompt that
 * is already developed (the user's own detailed prompt, or a previous
 * Promptea result) is returned unchanged — minimal edits and idempotency.
 */
export function buildImagePrompt(core: string, uiLang: Lang): string {
  const text = String(core ?? "").trim();
  if (!text || isDevelopedImagePrompt(text)) return text;
  return composeImagePrompt(text, uiLang)?.prompt ?? text;
}

// ---------------------------------------------------------------------------
// Quality evaluation (shared by the adaptive quality gate and the tests)
// ---------------------------------------------------------------------------

const PLACEHOLDER_RE = /\[(?:[a-záéíóúñ _/-]{3,40})\]|<\s*(?:insert|add|your|agreg[aá]|insert[aá]|tu)\b[^>]*>|\{\s*(?:[a-z_ ]{3,30})\s*\}/i;
const META_INSTRUCTION_RE =
  /\b(specify|choose|pick|select|add|describe|define|include|indicate|decide)\s+(?:the\s+|a\s+|an\s+|your\s+)?(subject|style|lighting|composition|mood|aspect ratio|camera|background|framing|colou?r palette|palette)\b|\b(especific[aá]|eleg[ií]|agreg[aá]|describ[ií]|defin[ií]|inclu[ií]|indic[aá]|decid[ií])\s+(?:el\s+|la\s+|los\s+|las\s+|un\s+|una\s+|tu\s+)?(sujeto|estilo|iluminaci[oó]n|composici[oó]n|mood|clima|relaci[oó]n de aspecto|c[aá]mara|fondo|encuadre|paleta)\b/i;
const SPAM_TOKENS = [
  "masterpiece",
  "best quality",
  "ultra quality",
  "8k",
  "4k",
  "16k",
  "uhd",
  "ultra hd",
  "hyperdetailed",
  "hyper-detailed",
  "ultra-detailed",
  "ultra detailed",
  "insane detail",
  "award-winning",
  "award winning",
  "trending on artstation",
  "stunning",
  "breathtaking",
  "obra maestra",
  "ultra detallado",
  "hiperdetallado",
  "calidad 8k",
  "máxima calidad",
];
const CONTRADICTIONS: Array<[RegExp, RegExp, string]> = [
  [/\b(close[- ]?up|primer plano)\b/i, /\b(wide establishing|establishing shot|plano general amplio|gran plano general)\b/i, "closeup_vs_establishing"],
  [/\b(soft,? diffused|diffused light|luz (suave )?difusa)\b/i, /\b(harsh (direct )?(midday|noon)|luz dura del mediod[ií]a)\b/i, "diffused_vs_harsh"],
  [/\b(shallow depth of field|poca profundidad de campo|bokeh)\b/i, /\b(everything (is )?(in )?sharp|deep focus|all planes sharp|todo n[ií]tido|foco profundo)\b/i, "shallow_vs_deep_focus"],
  [/\b(at night|nighttime|de noche|nocturn[ao])\b/i, /\b(midday sun|noon sun|sol del mediod[ií]a|bright daylight)\b/i, "night_vs_midday"],
];

export type ImageQualityIssue = "placeholder" | "meta_instruction" | "keyword_spam" | "contradiction";

/** Issues in a candidate image prompt that were NOT already in the user's input. */
export function imagePromptIssues(candidate: string, original = ""): ImageQualityIssue[] {
  const c = String(candidate ?? "");
  const o = String(original ?? "");
  const issues: ImageQualityIssue[] = [];

  if (PLACEHOLDER_RE.test(c) && !PLACEHOLDER_RE.test(o)) issues.push("placeholder");
  if (META_INSTRUCTION_RE.test(c) && !META_INSTRUCTION_RE.test(o)) issues.push("meta_instruction");

  const lc = c.toLowerCase();
  const lo = o.toLowerCase();
  const spam = SPAM_TOKENS.filter((tok) => new RegExp(`(^|[^\\p{L}\\d])${tok.replace(/[-\s]/g, "[-\\s]?")}($|[^\\p{L}\\d])`, "iu").test(lc) && !lo.includes(tok));
  if (spam.length >= 2) issues.push("keyword_spam");

  for (const [a, b] of CONTRADICTIONS) {
    if (a.test(c) && b.test(c) && !(a.test(o) && b.test(o))) {
      issues.push("contradiction");
      break;
    }
  }
  return issues;
}

