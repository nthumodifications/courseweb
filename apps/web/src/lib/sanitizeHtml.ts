import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "a",
  "b",
  "br",
  "code",
  "div",
  "em",
  "i",
  "li",
  "ol",
  "p",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
];

const ALLOWED_ATTR = ["href", "target", "rel", "colspan", "rowspan"];

export function sanitizeCourseHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}
