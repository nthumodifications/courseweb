import { safeExternalUrl } from "@/lib/safe-external-url";

/**
 * The links an applicant supplied, as `[label, href]` pairs safe to render.
 *
 * These are applicant-controlled strings shown to staff as anchors. Anything
 * that is not an http(s) URL is dropped rather than rendered: the API refuses
 * such links now, but rows stored before it did are still in the table.
 */
export const applicationLinks = (
  links: Record<string, unknown> | null | undefined,
): [label: string, href: string][] =>
  Object.entries(links ?? {}).flatMap(([label, value]) => {
    const href = safeExternalUrl(value);
    return href ? [[label, href] as [string, string]] : [];
  });
