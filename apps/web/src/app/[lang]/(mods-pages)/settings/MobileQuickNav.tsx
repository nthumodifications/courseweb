"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import useDictionary from "@/dictionaries/useDictionary";

interface Section {
  id: string;
  title: string;
  icon: ReactNode;
}

interface MobileQuickNavProps {
  sections: Section[];
  activeSection: string;
  onSectionClick?: (id: string) => void;
}

export const MobileQuickNav = ({
  sections,
  activeSection,
  onSectionClick,
}: MobileQuickNavProps) => {
  const [showNav, setShowNav] = useState(false);
  const dict = useDictionary();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const handleSectionClick = (id: string) => {
    setShowNav(false);
    onSectionClick?.(id);
  };

  // Handle Escape key
  useEffect(() => {
    if (!showNav) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowNav(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showNav]);

  // Focus management
  useEffect(() => {
    if (showNav && drawerRef.current) {
      const focusableElements = drawerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const firstElement = focusableElements[0] as HTMLElement;
      firstElement?.focus();
    } else if (!showNav && triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [showNav]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setShowNav(true)}
        className="fixed bottom-20 right-4 z-50 flex min-h-10 min-w-10 items-center justify-center rounded-full bg-primary p-3 text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
        aria-label={dict.settings.open_navigation}
      >
        <Menu className="h-5 w-5" />
      </button>

      {showNav && (
        <div
          className="fixed inset-0 z-50 bg-background/80 lg:hidden"
          onClick={() => setShowNav(false)}
        >
          <div
            ref={drawerRef}
            className="absolute right-0 top-0 bottom-0 w-64 bg-background p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowNav(false)}
              className="absolute right-4 top-4 flex min-h-10 min-w-10 items-center justify-center rounded-md p-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={dict.settings.close_navigation}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6 mt-2">
              <h2 className="text-lg font-semibold">
                {dict.settings.quick_navigation}
              </h2>
            </div>

            <nav className="space-y-3">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleSectionClick(section.id)}
                  className={cn(
                    "flex min-h-10 w-full items-center gap-3 rounded-md px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    activeSection === section.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent",
                  )}
                  aria-current={
                    activeSection === section.id ? "true" : undefined
                  }
                >
                  <span className="shrink-0">{section.icon}</span>
                  <span className="text-sm font-medium">{section.title}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};
