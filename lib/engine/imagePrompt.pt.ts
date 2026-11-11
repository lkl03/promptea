// lib/engine/imagePrompt.pt.ts
//
// v1.8.2 (engine 2.4.0) — reading an image request written in Portuguese.
//
// DECISION (documented in docs/engine-contract.md, "Localización estricta"):
// for Portuguese, the art-directed image prompt is composed in ENGLISH around
// the user's own words, which are kept verbatim. Image generators are trained
// mostly on English captions and a mixed prompt ("Photorealistic photograph of
// um gato laranja dormindo…") is how bilingual users write for them; composing
// natural Portuguese prose with gender agreement and contractions (do/da,
// no/na, ao/à) for 118 art-direction phrases is tracked as pending work. The
// result says so: `meta.optimizedPromptLang = "en"` and the interface shows a
// translated notice.
//
// What this file does: lets the English/Spanish parser UNDERSTAND a Portuguese
// request. `ptCues()` rewrites the Portuguese cue words (medium, setting, time,
// weather, light, palette, mood, camera, subject nouns, negatives) into the
// English words the classifiers of lib/engine/imagePrompt.ts already know. Its
// output is used ONLY to classify segments and pick the subject's kind and
// head noun — never as text of the prompt.

/** [Portuguese cue (regex source, accents optional), English cue]. Longer phrases first. */
const CUES: Array<[string, string]> = [
  // negatives / connectors
  ["sem", "without"],
  ["evite|evitar", "avoid"],
  ["nada de", "without"],
  ["exceto|menos", "except"],
  // medium
  ["pintura a [óo]leo|[óo]leo sobre tela", "oil painting"],
  ["fotografias?|fotos?", "photo"],
  ["fotorrealista|hiper-?realista|realista", "photorealistic"],
  ["ilustra[çc][ãa]o|ilustra[çc][õo]es|ilustrad[ao]", "illustration"],
  ["desenho animado", "cartoon"],
  ["desenhos?|desenhad[ao]", "drawing"],
  ["aquarela", "watercolor"],
  ["nanquim|tinta", "ink"],
  ["esbo[çc]o|rascunho", "sketch"],
  ["vetorial|vetor", "vector"],
  ["quadrinhos|hq", "comic"],
  ["livro infantil|infantil", "storybook"],
  ["pinturas?|pintad[ao]", "painting"],
  ["acr[íi]lico", "acrylic"],
  ["impressionista", "impressionist"],
  ["renderizad[ao]|renderiza[çc][ãa]o", "rendered"],
  ["isom[ée]tric[ao]", "isometric"],
  ["massinha", "claymation"],
  ["logotipo|logo", "logo"],
  ["p[ôo]ster|cartaz", "poster"],
  ["[íi]cone", "icon"],
  ["infogr[áa]fico", "infographic"],
  ["miniatura|capa", "thumbnail"],
  ["adesivo|figurinha", "sticker"],
  ["papel de parede", "wallpaper"],
  ["cinematogr[áa]fic[ao]", "cinematic"],
  ["estilo|est[ée]tica", "style"],
  // framing
  ["primeiro plano|close", "close-up"],
  ["retrato", "portrait"],
  ["minimalista|limp[ao]|simples", "minimal"],
  ["propor[çc][ãa]o|formato", "aspect ratio"],
  ["quadrad[ao]", "square"],
  ["panor[âa]mic[ao]", "panoramic"],
  // setting
  ["est[úu]dio", "studio"],
  ["fundo (?:branco|liso|neutro)", "white background"],
  ["cidades?", "city"],
  ["ruas?", "street"],
  ["centro da cidade|centro", "downtown"],
  ["urban[ao]", "urban"],
  ["beco", "alley"],
  ["avenida", "avenue"],
  ["terra[çc]o|cobertura", "rooftop"],
  ["praias?", "beach"],
  ["litoral|costa", "coast"],
  ["oceano|mar", "sea"],
  ["porto", "harbor"],
  ["quartos?", "bedroom"],
  ["salas? de estar|sala", "living room"],
  ["cozinhas?", "kitchen"],
  ["escrit[óo]rios?", "office"],
  ["bibliotecas?", "library"],
  ["restaurantes?", "restaurant"],
  ["cafeteria|caf[ée]", "coffee"],
  ["banheiro", "bathroom"],
  ["dentro|interior", "interior"],
  ["paisagens?", "landscape"],
  ["montanhas?", "mountain"],
  ["florestas?|bosques?|mata", "forest"],
  ["lagos?", "lake"],
  ["vales?", "valley"],
  ["campos?", "field"],
  ["rios?", "river"],
  ["cachoeiras?", "waterfall"],
  ["desertos?", "desert"],
  ["colinas|morros?", "hills"],
  ["selva", "jungle"],
  ["c[ée]u", "sky"],
  ["ilhas?", "island"],
  // time / weather
  ["noite|noturn[ao]|[àa] noite", "night"],
  ["meia-noite", "midnight"],
  ["luar|luz da lua", "moonlight"],
  ["hora dourada|golden hour", "golden hour"],
  ["p[ôo]r do sol|entardecer|fim de tarde|crep[úu]sculo", "sunset"],
  ["amanhecer|nascer do sol|alvorada|manh[ãa]", "dawn"],
  ["meio-dia|de dia|ensolarad[ao]", "midday"],
  ["nublad[ao]|c[ée]u cinza", "overcast"],
  ["tempestade|trovoada|rel[âa]mpagos?", "storm"],
  ["chuva|chuvos[ao]|chovendo|garoa", "rain"],
  ["neblina|n[ée]voa|nevoeiro|bruma", "fog"],
  ["neve|nevando|nevad[ao]", "snow"],
  // light / palette / mood / camera
  ["contraluz", "backlight"],
  ["ilumina[çc][ãa]o|iluminad[ao]", "lighting"],
  ["luzes|luz", "light"],
  ["sombras?", "shadows"],
  ["brilho", "glow"],
  ["tons|tom", "tones"],
  ["paleta", "palette"],
  ["cores|cor|colorid[ao]", "colors"],
  ["preto e branco|p&b", "black and white"],
  ["monocrom[áa]tic[ao]|monocromo", "monochrome"],
  ["tons de cinza|escala de cinza", "grayscale"],
  ["vibrantes?", "vibrant"],
  ["suaves?|apagad[ao]s?", "muted"],
  ["clima|atmosfera|ambiente", "atmosphere"],
  ["aconchegante", "cozy"],
  ["melanc[óo]lic[ao]", "melancholic"],
  ["dram[áa]tic[ao]", "dramatic"],
  ["seren[ao]|tranquil[ao]", "serene"],
  ["on[íi]ric[ao]|sonhador[a]?", "dreamy"],
  ["nost[áa]lgic[ao]", "nostalgic"],
  ["[ée]pic[ao]", "epic"],
  ["rom[âa]ntic[ao]", "romantic"],
  ["m[áa]gic[ao]", "magical"],
  ["lente|objetiva", "lens"],
  ["abertura", "aperture"],
  ["profundidade de campo", "depth of field"],
  ["grande angular", "wide-angle"],
  ["teleobjetiva", "telephoto"],
  ["a[ée]re[ao]", "aerial"],
  ["altura dos olhos", "eye level"],
  // gaze / motion
  ["olhando|contemplando|observando|admirando|encarando", "looking at"],
  ["dirigindo|pilotando", "driving"],
  ["correndo", "running"],
  ["voando", "flying"],
  ["navegando", "sailing"],
  ["em movimento", "moving"],
  // subjects: people
  ["mulheres|mulher", "woman"],
  ["homens|homem", "man"],
  ["meninas?|garotas?", "girl"],
  ["meninos?|garotos?", "boy"],
  ["pessoas", "people"],
  ["pessoa", "person"],
  ["crian[çc]as?", "child"],
  ["senhoras?", "lady"],
  ["senhor(?:es)?", "gentleman"],
  ["av[óo]", "grandmother"],
  ["casal", "couple"],
  ["fam[íi]lia", "family"],
  ["adolescentes?", "teenager"],
  ["atletas?", "athlete"],
  ["bailarin[ao]s?|dan[çc]arin[ao]s?", "dancer"],
  ["m[úu]sic[ao]s?", "musician"],
  ["estudantes?|alun[ao]s?", "student"],
  ["cozinheir[ao]s?", "chef"],
  ["m[ée]dic[ao]s?", "doctor"],
  ["modelos?", "model"],
  // subjects: creatures / animals
  ["drag[ãa]o|drag[õo]es", "dragon"],
  ["unic[óo]rnio", "unicorn"],
  ["fada", "fairy"],
  ["monstro", "monster"],
  ["duende", "goblin"],
  ["elfo", "elf"],
  ["mago|feiticeiro", "wizard"],
  ["bruxa", "witch"],
  ["sereia", "mermaid"],
  ["rob[ôo]s?", "robot"],
  ["alien[íi]gena", "alien"],
  ["f[êe]nix", "phoenix"],
  ["criatura", "creature"],
  ["gatinhos?|filhote de gato", "kitten"],
  ["gat[ao]s?", "cat"],
  ["cachorrinhos?|filhote", "puppy"],
  ["cachorr[ao]s?|c[ãa]es|c[ãa]o", "dog"],
  ["p[áa]ssaros?|aves?", "bird"],
  ["cavalos?", "horse"],
  ["raposas?", "fox"],
  ["corujas?", "owl"],
  ["le[ãa]o|le[õo]es", "lion"],
  ["tigres?", "tiger"],
  ["lobos?", "wolf"],
  ["ursos?", "bear"],
  ["peixes?", "fish"],
  ["coelhos?", "rabbit"],
  ["cervos?|veados?", "deer"],
  ["elefantes?", "elephant"],
  ["[áa]guias?", "eagle"],
  ["borboletas?", "butterfly"],
  ["tartarugas?", "turtle"],
  ["baleias?", "whale"],
  ["pinguins?", "penguin"],
  // subjects: vehicles
  ["carro esportivo|esportivo", "sports car"],
  ["carros?|autom[óo]vel", "car"],
  ["caminh[ãa]o|caminh[õo]es", "truck"],
  ["motos?|motocicletas?", "motorcycle"],
  ["bicicletas?|bike", "bicycle"],
  ["[ôo]nibus", "bus"],
  ["trens?|trem", "train"],
  ["avi[ãa]o|avi[õo]es", "plane"],
  ["barcos?", "boat"],
  ["navios?", "ship"],
  ["ve[íi]culos?", "vehicle"],
  // subjects: food
  ["hamb[úu]rguer(?:es)?", "burger"],
  ["bolos?", "cake"],
  ["pratos?", "dish"],
  ["saladas?", "salad"],
  ["massa|macarr[ãa]o", "pasta"],
  ["p[ãa]o|p[ãa]es", "bread"],
  ["coquet[ée]is?|drinks?", "cocktail"],
  ["sobremesas?", "dessert"],
  ["sorvetes?", "ice cream"],
  ["sopas?", "soup"],
  ["caf[ée] da manh[ãa]", "breakfast"],
  ["bife|churrasco", "steak"],
  // subjects: products
  ["rel[óo]gios?", "watch"],
  ["garrafas?", "bottle"],
  ["perfumes?", "perfume"],
  ["t[êe]nis", "sneakers"],
  ["sapatos?", "shoe"],
  ["celular(?:es)?|telefones?", "phone"],
  ["fones? de ouvido|fones?", "headphones"],
  ["bolsas?", "handbag"],
  ["mochilas?", "backpack"],
  ["canecas?|x[íi]caras?", "mug"],
  ["latas?", "can"],
  ["embalagens?", "packaging"],
  ["potes?", "jar"],
  ["batom", "lipstick"],
  ["cosm[ée]ticos?", "cosmetics"],
  ["notebooks?", "laptop"],
  // subjects: architecture
  ["casas?", "house"],
  ["pr[ée]dios?|edif[íi]cios?", "building"],
  ["torres?", "tower"],
  ["pontes?", "bridge"],
  ["catedral|catedrais", "cathedral"],
  ["igrejas?", "church"],
  ["castelos?", "castle"],
  ["far[óo]is|farol", "lighthouse"],
  ["cabanas?|chal[ée]s?", "cabin"],
  ["arranha-c[ée]us?", "skyscraper"],
  ["templos?", "temple"],
  ["fachadas?", "facade"],
  // colors and hair (read by the English color/hair detectors)
  ["vermelh[ao]s?", "red"],
  ["azul|azuis", "blue"],
  ["verdes?", "green"],
  ["amarel[ao]s?", "yellow"],
  ["pret[ao]s?", "black"],
  ["branc[ao]s?", "white"],
  ["pratead[ao]s?", "silver"],
  ["dourad[ao]s?", "golden"],
  ["laranjas?|alaranjad[ao]s?", "orange"],
  ["rox[ao]s?|violeta", "purple"],
  ["rosa", "pink"],
  ["cinzas?|cinzent[ao]s?", "gray"],
  ["loir[ao]s?|lour[ao]s?", "blonde"],
  ["ruiv[ao]s?", "redhead"],
  ["grisalh[ao]s?", "silver hair"],
  ["morena|moreno|cabelo (?:castanho|escuro|preto)", "dark hair"],
  // things people ask to leave out
  ["marcas? d'[áa]gua", "watermarks"],
  ["texto|textos|letras|legendas", "text"],
  ["logos|logotipos|marcas", "logos"],
  ["molduras?|bordas?", "borders"],
];

const EDGE_L = "(?<![\\p{L}\\p{N}_])";
const EDGE_R = "(?![\\p{L}\\p{N}_])";
const COMPILED: Array<[RegExp, string]> = CUES.map(([src, en]) => [new RegExp(`${EDGE_L}(?:${src})${EDGE_R}`, "giu"), en]);

/**
 * Rewrite the Portuguese cue words of `text` as their English equivalents, so
 * the existing classifiers can read it. Everything else is left as it is. Used
 * for CLASSIFICATION only.
 */
export function ptCues(text: string): string {
  let out = String(text ?? "");
  for (const [re, en] of COMPILED) out = out.replace(re, en);
  return out;
}

/** "crie", "gere", "quero uma…" at the start of a Portuguese image request. */
export const PT_LEAD_INS: RegExp[] = [
  /^(por favor)[,\s]+/i,
  /^(voc[êe] )?(pode|poderia|consegue)\s+(por favor\s+)?/i,
  /^(quero|queria|gostaria de|preciso de|preciso)\s+(que\s+(voc[êe]\s+)?(crie|gere|fa[çc]a|desenhe)\s+)?((criar|gerar|fazer|ter|obter|desenhar)\s+)?/i,
  /^(crie|criar|cria|gere|gerar|gera|fa[çc]a|fazer|faz|desenhe|desenhar|pinte|pintar|ilustre|ilustrar|produza|imagine|renderize)\s+(para mim\s+|me\s+)?/i,
];

/** "uma foto de …", "ilustração em aquarela de …": the medium noun that opens the request. */
export const MEDIUM_NOUN_PT =
  /^(?:(?:uma?|a|o)\s+)?(imagem|foto|fotografia|ilustra[çc][ãa]o|render|renderiza[çc][ãa]o|desenho|pintura|p[ôo]ster|cartaz|logo|logotipo|[íi]cone|papel de parede|retrato|cena|esbo[çc]o|arte)\s*((?:[\p{L}'’-]+\s+){0,3}?)(de|do|da|dos|das|com|que mostre|que mostra|mostrando|para)\s+/iu;

/** Articles that open a Portuguese noun phrase ("um gato", "a casa"). */
export const PT_ARTICLE_START = /^(um|uma|uns|umas|o|os|as)\s/i;

/** A Portuguese gerund in the subject ("dormindo", "correndo") is an action. */
export const PT_ACTION_RE = /(?<![\p{L}])\p{L}{2,}(ando|endo|indo)(?![\p{L}])/iu;

/** The negative marker at the start of a Portuguese segment ("sem texto"). */
export const PT_NEGATIVE_PREFIX = /^(sem|evite|evitar|nada de|exceto|menos)(?![\p{L}])\s*/iu;
