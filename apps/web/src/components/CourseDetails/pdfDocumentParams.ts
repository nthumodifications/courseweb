import type { PdfJs } from "@react-pdf-viewer/core";

/**
 * Options for every PDF this app opens with PDF.js.
 *
 * Syllabus PDFs are uploaded by instructors and rendered on our own origin.
 * PDF.js 3.x compiles font glyphs with `new Function` unless evaluation is
 * switched off, which lets a crafted PDF run script in the page
 * (CVE-2024-4367, fixed upstream in pdfjs-dist 4.2.67). The viewer library
 * pins us to 3.x, so evaluation is disabled here instead. The setting wins
 * over anything the viewer passes.
 */
export const hardenPdfDocumentParams = <T extends PdfJs.GetDocumentParams>(
  params: T,
): T & { isEvalSupported: false } => ({
  ...params,
  isEvalSupported: false,
});
