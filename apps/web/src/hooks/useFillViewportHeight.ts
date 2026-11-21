import { useLayoutEffect, useRef, useState } from "react";

/** Fills the remaining viewport below the route's surrounding layout. */
export const useFillViewportHeight = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    const element = ref.current;
    const contentWrapper = element?.parentElement;
    const layout = contentWrapper?.parentElement;
    if (!element || !contentWrapper || !layout) return;

    const media = window.matchMedia("(min-width: 768px)");
    const updateHeight = () => {
      if (!media.matches) {
        setHeight(undefined);
        return;
      }

      const wrapperStyle = window.getComputedStyle(contentWrapper);
      const topPadding = Number.parseFloat(wrapperStyle.paddingTop) || 0;
      const bottomPadding = Number.parseFloat(wrapperStyle.paddingBottom) || 0;
      const contentTop =
        contentWrapper.getBoundingClientRect().top + topPadding;
      setHeight(Math.max(0, window.innerHeight - contentTop - bottomPadding));
    };

    const resizeObserver = new ResizeObserver(updateHeight);
    const observeLayoutChildren = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(contentWrapper);
      resizeObserver.observe(layout);
      const children = Array.from(layout.children);
      children
        .slice(0, children.indexOf(contentWrapper))
        .forEach((sibling) => resizeObserver.observe(sibling));
      updateHeight();
    };
    const mutationObserver = new MutationObserver(observeLayoutChildren);
    mutationObserver.observe(layout, { childList: true });
    observeLayoutChildren();
    window.addEventListener("resize", updateHeight);
    media.addEventListener("change", updateHeight);
    updateHeight();

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", updateHeight);
      media.removeEventListener("change", updateHeight);
    };
  }, []);

  return { ref, height };
};
