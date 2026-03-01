"use client";

import { useState, useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
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
        onClick={() => setShowNav(true)}
        className="fixed bottom-20 right-4 z-50 lg:hidden bg-nthu-500 text-white p-3 rounded-full shadow-lg hover:bg-nthu-600 transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {showNav && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setShowNav(false)}
        >
          <div
            ref={drawerRef}
            className="absolute right-0 top-0 bottom-0 w-64 bg-background p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowNav(false)}
              className="absolute top-4 right-4 p-2 hover:bg-accent rounded-md"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6 mt-2">
              <h2 className="text-lg font-semibold">Quick Navigation</h2>
            </div>

            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleSectionClick(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors",
                    activeSection === section.id
                      ? "bg-nthu-500/10 text-nthu-500"
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
