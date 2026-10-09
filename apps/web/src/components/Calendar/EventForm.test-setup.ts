import { JSDOM } from "jsdom";

const environmentKeys = [
  "VITE_COURSEWEB_API_URL",
  "VITE_NTHUMODS_AUTH_URL",
] as const;
const previousEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]]),
);
process.env.VITE_COURSEWEB_API_URL ??= "https://api.example.test";
process.env.VITE_NTHUMODS_AUTH_URL ??= "https://auth.example.test";

const globalKeys = [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "HTMLInputElement",
  "Element",
  "Node",
  "NodeFilter",
  "DocumentFragment",
  "Event",
  "CustomEvent",
  "getComputedStyle",
  "MutationObserver",
  "ResizeObserver",
  "IS_REACT_ACT_ENVIRONMENT",
];
const bootstrapDom = new JSDOM("<!doctype html><html><body></body></html>");
const previousGlobals = Object.fromEntries(
  globalKeys.map((key) => [key, (globalThis as Record<string, unknown>)[key]]),
);

Object.assign(globalThis, {
  window: bootstrapDom.window,
  document: bootstrapDom.window.document,
  navigator: bootstrapDom.window.navigator,
  HTMLElement: bootstrapDom.window.HTMLElement,
  HTMLInputElement: bootstrapDom.window.HTMLInputElement,
  Element: bootstrapDom.window.Element,
  Node: bootstrapDom.window.Node,
  NodeFilter: bootstrapDom.window.NodeFilter,
  DocumentFragment: bootstrapDom.window.DocumentFragment,
  Event: bootstrapDom.window.Event,
  CustomEvent: bootstrapDom.window.CustomEvent,
  getComputedStyle: bootstrapDom.window.getComputedStyle,
  MutationObserver: bootstrapDom.window.MutationObserver,
  ResizeObserver: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
  IS_REACT_ACT_ENVIRONMENT: true,
});

export const restoreBootstrapDom = () => {
  const globalObject = globalThis as Record<string, unknown>;
  for (const key of globalKeys) {
    const value = previousGlobals[key];
    if (value === undefined) delete globalObject[key];
    else globalObject[key] = value;
  }
  bootstrapDom.window.close();
};

export const restoreBootstrapEnvironment = () => {
  for (const key of environmentKeys) {
    const value = previousEnvironment[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
};
