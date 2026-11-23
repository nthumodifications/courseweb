import { describe, expect, test } from "bun:test";
import { appendMermaidScript } from "./mermaidScript";

type FakeScript = Record<string, unknown>;

const fakeDocument = () => {
  const appended: FakeScript[] = [];
  const doc = {
    createElement: () => ({}) as FakeScript,
    body: {
      appendChild: (node: FakeScript) => {
        appended.push(node);
        return node;
      },
    },
  };
  return { doc: doc as unknown as Document, appended };
};

describe("appendMermaidScript", () => {
  test("loads one exact Mermaid release, never a floating version", () => {
    const { doc, appended } = fakeDocument();

    appendMermaidScript(doc, () => undefined);

    expect(appended).toHaveLength(1);
    expect(appended[0]?.src).toMatch(
      /^https:\/\/cdn\.jsdelivr\.net\/npm\/mermaid@\d+\.\d+\.\d+\/dist\/mermaid\.min\.js$/,
    );
  });

  test("asks the browser to verify the file before running it", () => {
    const { doc, appended } = fakeDocument();

    appendMermaidScript(doc, () => undefined);

    // Without crossOrigin the browser cannot apply integrity to a
    // cross-origin script, so both must be present.
    expect(appended[0]?.integrity).toMatch(/^sha384-[A-Za-z0-9+/]{64}$/);
    expect(appended[0]?.crossOrigin).toBe("anonymous");
  });

  test("runs the callback only once the script has loaded", () => {
    const { doc, appended } = fakeDocument();
    let loaded = 0;

    appendMermaidScript(doc, () => {
      loaded += 1;
    });
    expect(loaded).toBe(0);

    (appended[0]?.onload as () => void)();
    expect(loaded).toBe(1);
  });
});
