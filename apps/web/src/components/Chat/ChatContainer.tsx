"use client";
import { Drawer } from "vaul";
import { useMediaQuery } from "usehooks-ts";
import { useChatContext } from "./ChatProvider";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { ChatSuggestions } from "./ChatSuggestions";
import { QuotaExceededAlert } from "./QuotaExceededAlert";
import { X, Sparkles, GripVertical, LogIn } from "lucide-react";
import { Button } from "@courseweb/ui";
import { AISettingsDialog } from "./AISettingsDialog";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "react-oidc-context";
import useDictionary from "@/dictionaries/useDictionary";

function LoginPrompt() {
  const { signinRedirect } = useAuth();
  const dict = useDictionary();

  const handleLogin = () => {
    localStorage.setItem("redirectUri", window.location.pathname);
    signinRedirect();
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
      <p className="text-lg font-medium mb-2">AI 課程助手</p>
      <p className="text-sm text-muted-foreground text-center mb-6">
        {dict.chat?.login_required ?? "請先登入以使用 AI 課程助手功能"}
      </p>
      <Button onClick={handleLogin} className="gap-2">
        <LogIn className="w-4 h-4" />
        {dict.settings.account.signin}
      </Button>
    </div>
  );
}

export function ChatContainer() {
  const { isOpen, setIsOpen, messages, quotaError, clearQuotaError } =
    useChatContext();
  const { isAuthenticated, isLoading } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [width, setWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.max(320, Math.min(800, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  // Hide side panel on /chat page
  if (pathname?.includes("/chat")) {
    return null;
  }

  // Render loading state content
  const renderLoadingContent = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <Sparkles className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );

  // Render chat content based on auth state
  const renderChatContent = () => {
    if (isLoading) {
      return renderLoadingContent();
    }

    if (!isAuthenticated) {
      return <LoginPrompt />;
    }

    return (
      <>
        {quotaError && (
          <div className="p-3 border-b">
            <QuotaExceededAlert
              retryAfter={quotaError.retryAfter}
              onDismiss={clearQuotaError}
            />
          </div>
        )}
        <div className="flex-1 overflow-hidden flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">歡迎使用 AI 課程助手</p>
              <p className="text-sm text-muted-foreground text-center mb-6">
                我可以幫你搜尋課程、規劃課表、查詢畢業學分
              </p>
              <ChatSuggestions />
            </div>
          ) : (
            <ChatMessages />
          )}
        </div>
        <ChatInput />
      </>
    );
  };

  // Desktop: Side panel
  if (isDesktop) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={containerRef}
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{ width: `${width}px` }}
            className="fixed right-0 top-0 h-full bg-background border-l shadow-xl z-50 flex flex-col"
          >
            {/* Resize handle */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/50 group"
              onMouseDown={() => setIsResizing(true)}
            >
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">AI 課程助手</h2>
              </div>
              <div className="flex items-center gap-1">
                {isAuthenticated && <AISettingsDialog />}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {renderChatContent()}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Mobile: Bottom drawer
  return (
    <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content className="bg-background flex flex-col rounded-t-[10px] h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-50">
          <div className="p-4 bg-background rounded-t-[10px] flex-1 flex flex-col">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-4" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">AI 課程助手</h2>
              </div>
              {isAuthenticated && <AISettingsDialog />}
            </div>

            {isLoading ? (
              renderLoadingContent()
            ) : !isAuthenticated ? (
              <LoginPrompt />
            ) : (
              <>
                <div className="flex-1 overflow-hidden flex flex-col">
                  {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <ChatSuggestions />
                    </div>
                  ) : (
                    <ChatMessages />
                  )}
                </div>
                <ChatInput />
              </>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
