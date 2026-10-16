import { useCallback, useEffect, useRef, useState } from "react";
import { getSectionIdFromHash } from "./sectionHash";

export const useScrollTracking = (
  sectionIds: string[],
  settingIds: string[] = [],
  searchQuery = "",
) => {
  const [activeSection, setActiveSection] = useState<string>(
    sectionIds[0] ?? "",
  );
  const sectionKey = sectionIds.join("|");
  const settingKey = settingIds.join("|");
  const highlightedElementRef = useRef<HTMLElement | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  const highlightSetting = useCallback((id: string) => {
    if (!id.startsWith("setting-")) return;
    const element = document.getElementById(id);
    if (!element) return;

    highlightedElementRef.current?.classList.remove(
      "bg-primary/10",
      "transition-colors",
      "duration-300",
    );
    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current);
    }

    element.classList.add("bg-primary/10", "transition-colors", "duration-300");
    highlightedElementRef.current = element;
    highlightTimeoutRef.current = window.setTimeout(() => {
      element.classList.remove(
        "bg-primary/10",
        "transition-colors",
        "duration-300",
      );
      if (highlightedElementRef.current === element) {
        highlightedElementRef.current = null;
      }
      highlightTimeoutRef.current = null;
    }, 1500);
  }, []);

  useEffect(() => {
    const visibleSectionIds = sectionIds.filter((id) => {
      const element = document.getElementById(id);
      return Boolean(
        element && window.getComputedStyle(element).display !== "none",
      );
    });
    setActiveSection(visibleSectionIds[0] ?? "");

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first visible section
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => {
            // Sort by position in viewport (top to bottom)
            return a.boundingClientRect.top - b.boundingClientRect.top;
          });

        if (visibleSections.length > 0) {
          setActiveSection(visibleSections[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -35% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    // Observe all sections
    visibleSectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [sectionKey, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToSection = useCallback(
    (id: string, behavior: ScrollBehavior = "smooth") => {
      const element = document.getElementById(id);
      if (element && window.getComputedStyle(element).display !== "none") {
        const url = new URL(window.location.href);
        url.hash = id;
        window.history.replaceState(window.history.state, "", url);
        element.scrollIntoView({
          behavior,
          block: "start",
        });
        highlightSetting(id);
      }
    },
    [highlightSetting],
  );

  useEffect(() => {
    let lastScrolledHash: string | null = null;

    const scrollToHashSection = () => {
      const hash = window.location.hash;
      const settingIdsFromDom = Array.from(
        document.querySelectorAll<HTMLElement>('[id^="setting-"]'),
      ).map((element) => element.id);
      const id = getSectionIdFromHash(hash, sectionIds, [
        ...settingIds,
        ...settingIdsFromDom,
      ]);
      const element = id ? document.getElementById(id) : null;
      if (
        !id ||
        !element ||
        window.getComputedStyle(element).display === "none" ||
        hash === lastScrolledHash
      ) {
        return;
      }

      lastScrolledHash = hash;
      scrollToSection(id);
    };

    const retryTimeouts = [0, 50, 200, 500, 1000].map((delay) =>
      window.setTimeout(scrollToHashSection, delay),
    );
    const observer = new MutationObserver(scrollToHashSection);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("hashchange", scrollToHashSection);
    scrollToHashSection();

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", scrollToHashSection);
      retryTimeouts.forEach((timeout) => window.clearTimeout(timeout));
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
      highlightedElementRef.current?.classList.remove(
        "bg-primary/10",
        "transition-colors",
        "duration-300",
      );
    };
  }, [sectionIds, scrollToSection, searchQuery, settingKey, settingIds]);

  return { activeSection, scrollToSection };
};
