"use client";

import { useState } from "react";
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

  const handleSectionClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    id: string,
  ) => {
    e.preventDefault();
    setShowNav(false);
    onSectionClick?.(id);
  };

  return (
    <>
      <button
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
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={(e) => handleSectionClick(e, section.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-md transition-colors",
                    activeSection === section.id
                      ? "bg-nthu-500/10 text-nthu-500"
                      : "hover:bg-accent",
                  )}
                >
                  <span className="h-5 w-5 shrink-0">{section.icon}</span>
                  <span className="text-sm font-medium">{section.title}</span>
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};
