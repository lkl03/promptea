// scripts/seo/ld.mjs
//
// Validates the JSON-LD a page actually ships, from its server-rendered HTML:
//
//   * every block is valid JSON with a schema.org @context
//   * every node has an @type and @ids are used consistently: one @id never
//     describes two different things, and every { "@id": … } reference points at
//     a node that exists in the same document
//   * dates are real (ISO), not in the future, and modified >= published
//   * what the markup claims is on the page: FAQ questions and answers, HowTo
//     steps, the DefinedTerm, article headlines, breadcrumbs and the Dataset's
//     measured variables must all be findable in the visible text
//   * no invented signals (ratings, reviews) anywhere
//
// It cannot replace Google's Rich Results Test or the Schema.org validator (those
// need the public internet and judge eligibility rules we do not model here);
// it catches the structural and "markup says something the page does not" classes
// of error locally and in CI. Pure functions: no I/O.

import { decodeEntities, headings, ldBlocks, normalizeText } from "./html.mjs";

/** Letters and digits only, lower-cased: whitespace/markup/punctuation insensitive text comparison. */
export function squash(s) {
  return normalizeText(s).replace(/[^\p{L}\p{N}]+/gu, "");
}

/** Visible text with tags removed WITHOUT inserting spaces, squashed. */
function squashedVisible(html) {
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<!--[\s\S]*?-->/gi, "");
  return squash(decodeEntities(body.replace(/<[^>]+>/g, "")));
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export function isIsoDate(v) {
  if (typeof v !== "string" || !(ISO_DAY.test(v) || ISO_INSTANT.test(v))) return false;
  const d = new Date(v.length === 10 ? `${v}T00:00:00Z` : v);
  if (Number.isNaN(d.getTime())) return false;
  // Round-trip the calendar day: 2026-02-30 must not pass as March 2.
  return v.length !== 10 || d.toISOString().slice(0, 10) === v;
}

function ms(v) {
  return new Date(v.length === 10 ? `${v}T00:00:00Z` : v).getTime();
}

const asArray = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const typesOf = (n) => asArray(n["@type"]);

/** Flatten blocks into top-level nodes (expanding @graph). */
function topLevelNodes(parsed) {
  const out = [];
  for (const { json } of parsed) {
    if (Array.isArray(json)) out.push(...json.filter(isObj));
    else if (isObj(json)) out.push(...(Array.isArray(json["@graph"]) ? json["@graph"].filter(isObj) : [json]));
  }
  return out;
}

/** Walk any value, calling fn(obj, path) for every object. */
function walk(value, fn, path = "$") {
  if (Array.isArray(value)) value.forEach((v, i) => walk(v, fn, `${path}[${i}]`));
  else if (isObj(value)) {
    fn(value, path);
    for (const [k, v] of Object.entries(value)) walk(v, fn, `${path}.${k}`);
  }
}

/**
 * @param {string} html server-rendered HTML of the page
 * @param {{ url: string, now?: Date, expect?: string[] }} opts
 *   url: the page's canonical absolute URL; expect: node @types that must be present
 */
export function validateLd(html, opts) {
  const errors = [];
  const warnings = [];
  const now = opts.now ?? new Date();
  const blocks = ldBlocks(html);

  if (blocks.length === 0) errors.push("no JSON-LD block in the server HTML");

  const parsed = [];
  blocks.forEach((raw, i) => {
    try {
      parsed.push({ json: JSON.parse(raw), index: i });
    } catch (e) {
      errors.push(`JSON-LD block #${i + 1} is not valid JSON: ${e.message}`);
    }
  });

  for (const { json, index } of parsed) {
    const ctx = isObj(json) ? json["@context"] : undefined;
    if (!ctx || !String(ctx).includes("schema.org")) errors.push(`JSON-LD block #${index + 1} has no schema.org @context`);
  }

  const nodes = topLevelNodes(parsed);
  const types = new Set(nodes.flatMap(typesOf));

  // ---- @id bookkeeping: definitions, conflicts, dangling references --------
  const defined = new Map(); // id -> merged node
  const referenced = new Map(); // id -> first path
  for (const top of nodes) {
    walk(top, (obj, path) => {
      const id = obj["@id"];
      const keys = Object.keys(obj).filter((k) => k !== "@context");
      if (typeof id !== "string") return;
      if (keys.length === 1) {
        if (!referenced.has(id)) referenced.set(id, path);
        return;
      }
      // Anything with properties besides @id defines/extends the entity.
      const prev = defined.get(id);
      if (!prev) {
        defined.set(id, { ...obj });
        return;
      }
      for (const [k, v] of Object.entries(obj)) {
        if (k === "@context") continue;
        if (k in prev && JSON.stringify(prev[k]) !== JSON.stringify(v)) {
          errors.push(`@id ${id} is described twice with different "${k}" (${JSON.stringify(prev[k]).slice(0, 60)} vs ${JSON.stringify(v).slice(0, 60)})`);
        } else prev[k] = v;
      }
    });
  }

  // Top-level graph nodes must each carry an @type.
  for (const n of nodes) if (typesOf(n).length === 0) errors.push(`a top-level node has no @type (${JSON.stringify(n).slice(0, 80)})`);

  // A page-level node must have an @id in this page's namespace (one URL = one entity).
  const topIds = nodes.map((n) => n["@id"]).filter((x) => typeof x === "string");
  const dupTop = topIds.filter((id, i) => topIds.indexOf(id) !== i);
  for (const id of new Set(dupTop)) errors.push(`@id ${id} appears as two top-level nodes`);

  for (const [id, path] of referenced) {
    if (!defined.has(id)) errors.push(`reference to ${id} (at ${path}) does not exist in the page's graph`);
  }

  // ---- absolute URLs --------------------------------------------------------
  for (const top of nodes) {
    walk(top, (obj, path) => {
      for (const k of ["url", "item", "contentUrl", "sameAs"]) {
        for (const v of asArray(obj[k])) {
          if (typeof v === "string" && !/^https?:\/\//i.test(v)) errors.push(`${k} at ${path} is not an absolute URL: ${v}`);
        }
      }
    });
  }

  // ---- dates ---------------------------------------------------------------
  for (const top of nodes) {
    walk(top, (obj, path) => {
      for (const k of ["datePublished", "dateModified", "dateCreated"]) {
        if (!(k in obj)) continue;
        const v = obj[k];
        if (!isIsoDate(v)) errors.push(`${k} at ${path} is not a real ISO date: ${JSON.stringify(v)}`);
        else if (ms(v) > now.getTime() + 24 * 3600 * 1000) errors.push(`${k} at ${path} is in the future: ${v}`);
      }
      if (isIsoDate(obj.datePublished) && isIsoDate(obj.dateModified) && ms(obj.dateModified) < ms(obj.datePublished)) {
        errors.push(`dateModified (${obj.dateModified}) precedes datePublished (${obj.datePublished}) at ${path}`);
      }
    });
  }

  // ---- no invented signals --------------------------------------------------
  for (const top of nodes) {
    walk(top, (obj, path) => {
      for (const k of ["aggregateRating", "review", "ratingValue", "reviewRating"]) {
        if (k in obj) errors.push(`invented signal "${k}" at ${path}`);
      }
    });
  }

  // ---- markup must match the page ------------------------------------------
  const hay = squashedVisible(html);
  const visible = (text) => {
    const s = squash(String(text ?? ""));
    return s.length === 0 || hay.includes(s);
  };
  const h1s = headings(html, 1);

  for (const n of nodes) {
    const t = typesOf(n);
    const label = `${t.join("/")} ${n["@id"] ?? ""}`.trim();

    if (t.includes("WebPage") || t.includes("AboutPage") || t.includes("CollectionPage")) {
      if (n.url && n.url !== opts.url) errors.push(`${label}: url ${n.url} is not the page's canonical ${opts.url}`);
    }
    if (typeof n["@id"] === "string" && /#(webpage|breadcrumb|faq|howto|dataset|article|term)$/.test(n["@id"])) {
      if (!n["@id"].startsWith(`${opts.url}#`)) errors.push(`${label}: @id is not in this page's namespace (${opts.url}#…)`);
    }

    if (t.includes("FAQPage")) {
      const qs = asArray(n.mainEntity);
      if (qs.length === 0) errors.push(`${label}: FAQPage without questions`);
      for (const q of qs) {
        const a = q?.acceptedAnswer?.text;
        if (!q?.name || !a) errors.push(`${label}: a Question lacks name or acceptedAnswer.text`);
        if (q?.name && !visible(q.name)) errors.push(`${label}: question not visible on the page: "${String(q.name).slice(0, 70)}"`);
        if (a && !visible(a)) errors.push(`${label}: answer not visible on the page for "${String(q?.name).slice(0, 50)}"`);
      }
    }

    if (t.includes("HowTo")) {
      const steps = asArray(n.step);
      if (steps.length === 0) errors.push(`${label}: HowTo without steps`);
      steps.forEach((s, i) => {
        if (s.position !== i + 1) errors.push(`${label}: step ${i + 1} has position ${s.position}`);
        if (!visible(s.name)) errors.push(`${label}: step name not visible: "${String(s.name).slice(0, 60)}"`);
        if (!visible(s.text)) errors.push(`${label}: step text not visible: "${String(s.text).slice(0, 60)}"`);
      });
    }

    if (t.includes("DefinedTerm")) {
      if (!visible(n.name)) errors.push(`${label}: term name not visible`);
      if (!visible(n.description)) errors.push(`${label}: term description not visible`);
      if (!h1s.some((h) => squash(h) === squash(n.name))) errors.push(`${label}: term "${n.name}" does not match the page's <h1>`);
    }

    if (t.some((x) => ["Article", "NewsArticle", "TechArticle"].includes(x))) {
      const head = squash(String(n.headline ?? "")).replace(/…$/u, "");
      const probe = head.slice(0, 40);
      if (!probe) errors.push(`${label}: no headline`);
      else if (!h1s.some((h) => squash(h).includes(probe)) && !visible(n.headline)) {
        errors.push(`${label}: headline does not match the page: "${String(n.headline).slice(0, 70)}"`);
      }
      if (!isIsoDate(n.datePublished)) errors.push(`${label}: missing/invalid datePublished`);
      if (!isIsoDate(n.dateModified)) errors.push(`${label}: missing/invalid dateModified`);
      if (String(n.headline ?? "").length > 110) errors.push(`${label}: headline longer than 110 characters`);
    }

    if (t.includes("BreadcrumbList")) {
      const items = asArray(n.itemListElement);
      if (items.length === 0) errors.push(`${label}: empty BreadcrumbList`);
      items.forEach((it, i) => {
        if (it.position !== i + 1) errors.push(`${label}: item ${i + 1} has position ${it.position}`);
        if (!it.name || !it.item) errors.push(`${label}: item ${i + 1} lacks name or item`);
      });
      const last = items[items.length - 1];
      if (last && last.item !== opts.url) errors.push(`${label}: last item ${last.item} is not this page (${opts.url})`);
    }

    if (t.includes("Dataset")) {
      const vars = asArray(n.variableMeasured);
      if (vars.length === 0) errors.push(`${label}: Dataset without variableMeasured`);
      for (const v of vars) {
        // "Label (Category)" → the label must be on the page.
        const labelOnly = String(v?.name ?? "").replace(/\s*\([^)]*\)\s*$/, "");
        if (!visible(labelOnly)) errors.push(`${label}: measured variable not visible on the page: "${v?.name}"`);
      }
      if (!n.dateModified) errors.push(`${label}: Dataset without dateModified`);
      if (!n.isBasedOn?.url) errors.push(`${label}: Dataset without its source`);
      // v1.8.5 — Google's Dataset rich result requires a description (50–5000 characters)
      // on every Dataset, including a Dataset nested as the source (Rich Results Test).
      const described = (d) => typeof d?.description === "string" && d.description.length >= 50 && d.description.length <= 5000;
      if (!described(n)) errors.push(`${label}: Dataset without a 50–5000 character description`);
      if (asArray(n.isBasedOn?.["@type"]).includes("Dataset") && !described(n.isBasedOn)) errors.push(`${label}: source Dataset without a 50–5000 character description`);
    }
  }

  for (const want of opts.expect ?? []) {
    if (!types.has(want)) errors.push(`expected a ${want} node, found: ${[...types].join(", ")}`);
  }

  return { errors, warnings, nodes: nodes.length, types: [...types], ids: [...defined.keys()] };
}
