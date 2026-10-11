import { JSDOM } from "jsdom";

export const installTestDom = (url: string) => {
  const dom = new JSDOM(
    "<!doctype html><html><head></head><body></body></html>",
    { url: `http://localhost${url}` },
  );
  const previousGlobals = {
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    getComputedStyle: dom.window.getComputedStyle,
    MutationObserver: dom.window.MutationObserver,
    Event: dom.window.Event,
    CustomEvent: dom.window.CustomEvent,
    MouseEvent: dom.window.MouseEvent,
    KeyboardEvent: dom.window.KeyboardEvent,
    NodeFilter: dom.window.NodeFilter,
    Node: dom.window.Node,
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  return {
    dom,
    restore: () => Object.assign(globalThis, previousGlobals),
  };
};
