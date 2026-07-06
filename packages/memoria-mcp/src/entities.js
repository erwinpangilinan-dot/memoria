const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
const SIGNAL_RE =
  /\b(birthday|anniversary|allergic|allergy|prefers|favorite|favourite|never forget|important|deadline)\b/i;

export function normalizeEntity(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function extractEntities(content) {
  const found = new Set();
  for (const m of content.matchAll(WIKILINK_RE)) {
    found.add(normalizeEntity(m[1]));
  }
  for (const m of content.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g)) {
    found.add(normalizeEntity(m[1]));
  }
  for (const m of content.matchAll(/@([a-zA-Z0-9_-]+)/g)) {
    found.add(normalizeEntity(m[1]));
  }
  return [...found].filter(Boolean);
}

export function hasSalienceSignals(content) {
  return SIGNAL_RE.test(content);
}
