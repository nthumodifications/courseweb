import { Sparkles, LogIn } from "lucide-react";
import { ChatMessages } from "@/components/Chat/ChatMessages";
import { ChatInput } from "@/components/Chat/ChatInput";
import { ChatSuggestions } from "@/components/Chat/ChatSuggestions";
import { AISettingsDialog } from "@/components/Chat/AISettingsDialog";
import { QuotaExceededAlert } from "@/components/Chat/QuotaExceededAlert";
import { useChatContext } from "@/components/Chat/ChatProvider";
import { useAuth } from "react-oidc-context";
import { Button } from "@courseweb/ui";
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
      <Sparkles className="w-16 h-16 text-muted-foreground mb-6" />
      <h2 className="text-2xl font-semibold mb-2">AI 課程助手</h2>
      <p className="text-muted-foreground text-center mb-8 max-w-md">
        {dict.chat?.login_required ?? "請先登入以使用 AI 課程助手功能"}
      </p>
      <Button onClick={handleLogin} size="lg" className="gap-2">
        <LogIn className="w-5 h-5" />
        {dict.settings.account.signin}
      </Button>
    </div>
  );
}

export function ChatPageContent() {
  const { messages, quotaError, clearQuotaError } = useChatContext();
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(var(--content-height)-1rem)]">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <Sparkles className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(var(--content-height)-1rem)]">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold">AI 課程助手</h1>
                <p className="text-xs text-muted-foreground">
                  搜尋課程 · 規劃課表 · 查詢畢業學分
                </p>
              </div>
            </div>
            {isAuthenticated && <AISettingsDialog />}
          </div>
        </div>
      </div>

      {/* Show login prompt if not authenticated */}
      {!isAuthenticated ? (
        <LoginPrompt />
      ) : (
        <>
          {/* Quota Exceeded Alert */}
          {quotaError && (
            <div className="container mx-auto max-w-4xl px-4 pt-4">
              <QuotaExceededAlert
                retryAfter={quotaError.retryAfter}
                onDismiss={clearQuotaError}
              />
            </div>
          )}

          {/* Chat Area */}
          <div className="flex-1 overflow-hidden flex flex-col mx-auto max-w-4xl">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4">
                <Sparkles className="w-16 h-16 text-muted-foreground mb-6" />
                <h2 className="text-2xl font-semibold mb-2">
                  歡迎使用 AI 課程助手
                </h2>
                <p className="text-muted-foreground text-center mb-8 max-w-md">
                  我可以幫你搜尋課程、規劃課表、查詢畢業學分。試試下面的建議或直接輸入你的問題！
                </p>
                <ChatSuggestions />
              </div>
            ) : (
              <ChatMessages />
            )}
          </div>

          {/* Input Area */}
          <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto max-w-4xl">
              <ChatInput />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
