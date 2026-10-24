import {
  DEEP_LINK_REGISTRY,
  type DeepLinkValues,
} from "../src/lib/deep-links/registry";

export type DeepLinksManifest = {
  version: 1;
  generatedFrom: "registry";
  routes: Array<{
    route: string;
    duplicates: "ignored" | "first-value";
    params: Array<{
      name: string;
      description: { zh: string; en: string };
      values: string[] | "free-text" | { pattern: string };
      example: string;
      lineValues?: Record<
        string,
        string[] | "free-text" | { pattern: string }
      >;
      runtime?: boolean;
    }>;
    examples: string[];
  }>;
};

export const resolveDeepLinkValues = (
  source: DeepLinkValues,
): string[] | "free-text" | { pattern: string } => {
  if (typeof source === "function") return [...source()];
  return source;
};

export const resolveDeepLinkLineValues = (
  source: NonNullable<
    import("../src/lib/deep-links/registry").DeepLinkParam["lineValues"]
  >,
) =>
  Object.fromEntries(
    Object.entries(source()).map(([line, values]) => [
      line,
      resolveDeepLinkValues(values),
    ]),
  );

export const normalizeGeneratedText = (text: string) =>
  text.replaceAll("\r\n", "\n");

export function buildDeepLinksManifest(): DeepLinksManifest {
  return {
    version: 1,
    generatedFrom: "registry",
    routes: DEEP_LINK_REGISTRY.map((route) => ({
      route: route.route,
      duplicates: route.duplicates,
      params: route.params.map((param) => ({
        name: param.name,
        description: param.description,
        values: resolveDeepLinkValues(param.values),
        example: param.example,
        ...(param.lineValues
          ? { lineValues: resolveDeepLinkLineValues(param.lineValues) }
          : {}),
        ...(param.runtime ? { runtime: true } : {}),
      })),
      examples: [...route.examples],
    })),
  };
}

const formatValues = (
  values: ReturnType<typeof resolveDeepLinkValues>,
  runtime = false,
) => {
  if (runtime) return "runtime data";
  if (values === "free-text") return "free-text (validated at runtime)";
  if ("pattern" in values) return `pattern: \`${values.pattern}\``;
  return values.map((value) => `\`${value}\``).join(", ");
};

export function buildDeepLinksMarkdown(): string {
  const lines = [
    "<!-- GENERATED FILE: do not edit. Run `bun run gen:deep-links` in `apps/web`. -->",
    "# NTHUMods deep links",
    "",
    "Use `/zh/...`, `/en/...`, or `/zh-cn/...` as the language prefix. Query values must be URL-encoded. Unknown values are ignored silently. Repeated-parameter handling is route-specific; see each route.",
    "",
    "This registry is a public contract used by external integrations, including the NTHU Student Association LINE bot. The machine-readable copy is served at `https://nthumods.com/data/deep-links.json`.",
    "",
  ];

  for (const route of DEEP_LINK_REGISTRY) {
    lines.push(`## \`${route.route}\``, "");
    lines.push(`Duplicate parameters: \`${route.duplicates}\`.`, "");
    lines.push(
      "| Parameter | Description | Accepted values | Example |",
      "| --- | --- | --- | --- |",
    );
    for (const param of route.params) {
      const lineValues = param.lineValues
        ? Object.entries(resolveDeepLinkLineValues(param.lineValues))
        : [["", resolveDeepLinkValues(param.values)] as const];
      for (const [line, values] of lineValues) {
        lines.push(
          `| \`${param.name}${line ? `:${line}` : ""}\` | ${param.description.zh} ${param.description.en} | ${formatValues(values, param.runtime)} | \`${param.example}\` |`,
        );
      }
    }
    lines.push("", "Examples:", "");
    for (const example of route.examples) lines.push(`- \`${example}\``);
    lines.push("");
  }

  lines.push(
    "## Contract notes",
    "",
    "- Deep-link values are validated by the same resolver data used by the page. Values from API or downloaded route data are intentionally shown as runtime data.",
    "- Hash reads are outside the query-parameter coverage scan; the settings `#section` contract is registered by hand.",
    "- `return_url` and other transport-only parameters are internal and are not part of this public registry.",
  );
  return `${lines.join("\n")}\n`;
}

if (import.meta.main) {
  const manifest = buildDeepLinksManifest();
  await Bun.write(
    new URL("../public/data/deep-links.json", import.meta.url),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await Bun.write(
    new URL("../../../docs/deep-links.md", import.meta.url),
    buildDeepLinksMarkdown(),
  );
}
