"use client";
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { createPortal } from "react-dom";

// Define the context type
type HeaderPortalContextType = {
  portalContent: ReactNode;
  setPortalContent: (content: ReactNode) => void;
  clearPortalContent: () => void;
};

// Create context with default values
const HeaderPortalContext = createContext<HeaderPortalContextType>({
  portalContent: null,
  setPortalContent: () => {},
  clearPortalContent: () => {},
});

// Provider component that will wrap the app
export const HeaderPortalProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [portalContent, setPortalContent] = useState<ReactNode>(null);

  const clearPortalContent = () => setPortalContent(null);

  return (
    <HeaderPortalContext.Provider
      value={{ portalContent, setPortalContent, clearPortalContent }}
    >
      {children}
    </HeaderPortalContext.Provider>
  );
};

// Hook to use the portal
export const useHeaderPortal = () => {
  const context = useContext(HeaderPortalContext);
  if (!context) {
    throw new Error(
      "useHeaderPortal must be used within a HeaderPortalProvider",
    );
  }
  return context;
};

// Component that renders the portal content
export const HeaderPortalOutlet: React.FC = () => {
  const { portalContent } = useHeaderPortal();
  const [mounted, setMounted] = useState(false);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  // Find the portal container after mount
  useEffect(() => {
    setMounted(true);
    const node = document.getElementById("header-portal-container");
    if (node) {
      setPortalNode(node);
    }
  }, []);

  // Only render once mounted and container found
  if (!mounted || !portalNode) return null;

  // Use React's createPortal to render into the header
  return portalContent ? createPortal(portalContent, portalNode) : null;
};
