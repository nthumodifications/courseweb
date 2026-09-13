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
    <div className="flex-1 flex flex-col p-4 gap-4">
      <Sparkles className="w-16 h-16 text-muted-foreground" />
      <h2 className="text-xl font-medium">{dict.chat.title}</h2>
      <p className="text-muted-foreground leading-relaxed">
        {dict.chat.login_required}
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
  const dict = useDictionary();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(var(--content-height)-1rem)]">
          <div className="flex-1 flex flex-col p-4 gap-4">
          <div className="animate-pulse flex flex-col gap-4">
            <Sparkles className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">{dict.common.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(var(--content-height)-1rem)]">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Sparkles className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold">{dict.chat.title}</h1>
                <p className="text-xs text-muted-foreground">
                  {dict.chat.capabilities}
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
            <div className="px-4 pt-4">
              <QuotaExceededAlert
                retryAfter={quotaError.retryAfter}
                onDismiss={clearQuotaError}
              />
            </div>
          )}

          {/* Chat Area */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col p-4 gap-4">
                <Sparkles className="w-16 h-16 text-muted-foreground" />
                <h2 className="text-xl font-medium">
                  {dict.chat.welcome}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {dict.chat.welcome_description}
                </p>
                <ChatSuggestions />
              </div>
            ) : (
              <ChatMessages />
            )}
          </div>

          {/* Input Area */}
          <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <ChatInput />
          </div>
        </>
      )}
    </div>
  );
}
