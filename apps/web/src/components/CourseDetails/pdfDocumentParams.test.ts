import { describe, expect, test } from "bun:test";
import { hardenPdfDocumentParams } from "./pdfDocumentParams";

describe("hardenPdfDocumentParams", () => {
  test("turns off script evaluation for the syllabus PDF", () => {
    const params = hardenPdfDocumentParams({
      url: "https://example.com/syllabus.pdf",
    });

    expect(params.isEvalSupported).toBe(false);
  });

  test("does not let the viewer's own options turn evaluation back on", () => {
    const params = hardenPdfDocumentParams({
      url: "https://example.com/syllabus.pdf",
      isEvalSupported: true,
    });

    expect(params.isEvalSupported).toBe(false);
  });

  test("keeps every other option the viewer passed", () => {
    const params = hardenPdfDocumentParams({
      url: "https://example.com/syllabus.pdf",
      withCredentials: false,
      httpHeaders: { Accept: "application/pdf" },
    });

    expect(params).toMatchObject({
      url: "https://example.com/syllabus.pdf",
      withCredentials: false,
      httpHeaders: { Accept: "application/pdf" },
    });
  });
});
