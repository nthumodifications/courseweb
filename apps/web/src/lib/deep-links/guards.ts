const USE_SEARCH_PARAMS_PATTERN =
  /\bconst\s*\[\s*([A-Za-z_$][\w$]*)[^\]]*\]\s*=\s*useSearchParams\s*\(/g;
const NEW_SEARCH_PARAMS_PATTERN =
  /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+URLSearchParams\s*\(/g;
const ALIAS_PATTERN =
  /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;/g;
const DIRECT_SEARCH_PARAMS_PATTERN =
  /new\s+URLSearchParams\s*\([^)]*\)\s*\.\s*(?:get|getAll|has)\s*\(\s*["']([^"']+)["']\s*\)/g;

// Hash reads are intentionally out of scope; settings #section is registered
// by hand because it is a fragment contract rather than a query parameter.
export function extractDeepLinkParamNames(source: string): string[] {
  const identifiers = new Set<string>();
  for (const match of source.matchAll(USE_SEARCH_PARAMS_PATTERN)) {
    identifiers.add(match[1]);
  }
  for (const match of source.matchAll(NEW_SEARCH_PARAMS_PATTERN)) {
    identifiers.add(match[1]);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const match of source.matchAll(ALIAS_PATTERN)) {
      if (!identifiers.has(match[2]) || identifiers.has(match[1])) continue;
      identifiers.add(match[1]);
      changed = true;
    }
  }

  const names: string[] = [];
  if (identifiers.size > 0) {
    const escapedIdentifiers = [...identifiers].map((identifier) =>
      identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );
    const identifierPattern = new RegExp(
      `\\b(?:${escapedIdentifiers.join("|")})\\s*\\.\\s*(?:get|getAll|has)\\s*\\(\\s*["']([^"']+)["']\\s*\\)`,
      "g",
    );
    for (const match of source.matchAll(identifierPattern)) names.push(match[1]);
  }
  for (const match of source.matchAll(DIRECT_SEARCH_PARAMS_PATTERN)) {
    names.push(match[1]);
  }
  return names;
}
