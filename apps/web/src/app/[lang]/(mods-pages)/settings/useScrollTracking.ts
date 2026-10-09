import { useCallback, useEffect, useState } from "react";
import { getSectionIdFromHash } from "./sectionHash";

export const useScrollTracking = (sectionIds: string[]) => {
  const [activeSection, setActiveSection] = useState<string>(
    sectionIds[0] ?? "",
  );
  const sectionKey = sectionIds.join("|");

  useEffect(() => {
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
    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [sectionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const url = new URL(window.location.href);
      url.hash = id;
      window.history.replaceState(window.history.state, "", url);
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  useEffect(() => {
    let lastScrolledHash: string | null = null;

    const scrollToHashSection = () => {
      const hash = window.location.hash;
      const id = getSectionIdFromHash(hash, sectionIds);
      if (!id || !document.getElementById(id) || hash === lastScrolledHash) {
        return;
      }

      lastScrolledHash = hash;
      scrollToSection(id);
    };

    const observer = new MutationObserver(scrollToHashSection);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("hashchange", scrollToHashSection);
    scrollToHashSection();

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", scrollToHashSection);
    };
  }, [sectionIds, scrollToSection]);

  return { activeSection, scrollToSection };
};
