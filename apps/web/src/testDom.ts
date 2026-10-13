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
    getComputedStyle: globalThis.getComputedStyle,
    MutationObserver: globalThis.MutationObserver,
    Event: globalThis.Event,
    CustomEvent: globalThis.CustomEvent,
    MouseEvent: globalThis.MouseEvent,
    KeyboardEvent: globalThis.KeyboardEvent,
    NodeFilter: globalThis.NodeFilter,
    Node: globalThis.Node,
    Element: globalThis.Element,
    DocumentFragment: globalThis.DocumentFragment,
    SVGElement: globalThis.SVGElement,
    AbortSignal: globalThis.AbortSignal,
    HTMLElement: globalThis.HTMLElement,
    HTMLInputElement: globalThis.HTMLInputElement,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
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
    Element: dom.window.Element,
    DocumentFragment: dom.window.DocumentFragment,
    SVGElement: dom.window.SVGElement,
    AbortSignal: dom.window.AbortSignal,
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    IS_REACT_ACT_ENVIRONMENT: true,
    requestAnimationFrame: (callback: FrameRequestCallback) =>
      dom.window.setTimeout(() => callback(Date.now()), 0),
    cancelAnimationFrame: (handle: number) => dom.window.clearTimeout(handle),
  });
  (
    dom.window.HTMLElement.prototype as HTMLElement & {
      attachEvent?: () => void;
      detachEvent?: () => void;
    }
  ).attachEvent = () => undefined;
  (
    dom.window.HTMLElement.prototype as HTMLElement & {
      attachEvent?: () => void;
      detachEvent?: () => void;
    }
  ).detachEvent = () => undefined;
  dom.window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof dom.window.matchMedia;
  return {
    dom,
    restore: () => {
      Object.assign(globalThis, previousGlobals);
      dom.window.close();
    },
  };
};
