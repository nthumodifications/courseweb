"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ScrollArea,
  Separator,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
  useToast,
} from "@courseweb/ui";
import {
  Bot,
  Send,
  Settings,
  Loader2,
  Sparkles,
  User,
  Trash2,
  RefreshCw,
} from "lucide-react";

type AIProvider = "google" | "openai" | "anthropic";

const AI_PROVIDERS = [
  { value: "google", label: "Google Gemini (Free Tier)", defaultModel: "gemini-2.0-flash-exp" },
  { value: "openai", label: "OpenAI GPT-4o-mini", defaultModel: "gpt-4o-mini" },
  { value: "anthropic", label: "Anthropic Claude", defaultModel: "claude-3-5-sonnet-20241022" },
];

export default function ChatbotPage() {
  const { toast } = useToast();
  const [provider, setProvider] = useState<AIProvider>("google");
  const [apiKey, setApiKey] = useState("");
  const [savedApiKeys, setSavedApiKeys] = useState<Record<AIProvider, string>>({
    google: "",
    openai: "",
    anthropic: "",
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Load API keys from localStorage on mount
  useEffect(() => {
    const storedKeys = localStorage.getItem("nthumods-ai-keys");
    if (storedKeys) {
      try {
        setSavedApiKeys(JSON.parse(storedKeys));
      } catch (e: unknown) {
        console.error("Failed to parse stored API keys:", e);
      }
    }
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading, reload, stop, setMessages } =
    useChat({
      api: "/api/chat",
      body: {
        provider,
        apiKey: savedApiKeys[provider] || undefined,
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to send message. Please check your API key.",
          variant: "destructive",
        });
      },
    });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSaveSettings = () => {
    const updatedKeys = { ...savedApiKeys, [provider]: apiKey };
    setSavedApiKeys(updatedKeys);
    localStorage.setItem("nthumods-ai-keys", JSON.stringify(updatedKeys));
    setSettingsOpen(false);
    toast({
      title: "Settings saved",
      description: `API key for ${AI_PROVIDERS.find((p) => p.value === provider)?.label} has been saved.`,
    });
  };

  const handleClearChat = () => {
    setMessages([]);
    toast({
      title: "Chat cleared",
      description: "All messages have been removed.",
    });
  };

  const currentProvider = AI_PROVIDERS.find((p) => p.value === provider);
  const hasApiKey = !!savedApiKeys[provider];

  return (
    <div className="container mx-auto max-w-5xl p-4">
      <Card className="h-[calc(100vh-8rem)] flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">NTHUMods AI Assistant</CardTitle>
                <CardDescription>
                  Your intelligent course planning companion
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {currentProvider?.label}
              </Badge>
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>AI Provider Settings</DialogTitle>
                    <DialogDescription>
                      Configure your AI provider and API key. Your keys are stored locally in your
                      browser.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="provider">AI Provider</Label>
                      <Select value={provider} onValueChange={(v: string) => setProvider(v as AIProvider)}>
                        <SelectTrigger id="provider">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AI_PROVIDERS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Default model: {currentProvider?.defaultModel}
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="apiKey">API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        placeholder="Enter your API key"
                        value={apiKey}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {provider === "google" && (
                          <>
                            Get your free API key from{" "}
                            <a
                              href="https://aistudio.google.com/app/apikey"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              Google AI Studio
                            </a>
                          </>
                        )}
                        {provider === "openai" && (
                          <>
                            Get your API key from{" "}
                            <a
                              href="https://platform.openai.com/api-keys"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              OpenAI Platform
                            </a>
                          </>
                        )}
                        {provider === "anthropic" && (
                          <>
                            Get your API key from{" "}
                            <a
                              href="https://console.anthropic.com/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              Anthropic Console
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSaveSettings}>Save settings</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="icon" onClick={handleClearChat} title="Clear chat">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="flex h-full items-center justify-center py-12">
                  <div className="text-center space-y-3">
                    <div className="flex justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20">
                        <Bot className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold">Welcome to NTHUMods AI Assistant!</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      I can help you plan your courses, find classes, check requirements, and build
                      your perfect timetable. Just ask me anything!
                    </p>
                    {!hasApiKey && (
                      <div className="pt-4">
                        <Button onClick={() => setSettingsOpen(true)} variant="outline">
                          <Settings className="h-4 w-4 mr-2" />
                          Set up API Key to get started
                        </Button>
                      </div>
                    )}
                    <div className="pt-6 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Try asking:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            handleInputChange({
                              target: { value: "What machine learning courses are available?" },
                            } as React.ChangeEvent<HTMLInputElement>);
                          }}
                        >
                          Machine learning courses
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            handleInputChange({
                              target: {
                                value: "Help me plan my CS courses for next semester",
                              },
                            } as React.ChangeEvent<HTMLInputElement>);
                          }}
                        >
                          Plan my courses
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            handleInputChange({
                              target: { value: "Find English-taught CS courses" },
                            } as React.ChangeEvent<HTMLInputElement>);
                          }}
                        >
                          English courses
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {messages.map((message: any) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{message.content}</div>
                    {message.toolInvocations && message.toolInvocations.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.toolInvocations.map((tool: any, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            🔧 {tool.toolName}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="rounded-lg px-4 py-2 bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <Separator />
        <CardFooter className="p-4">
          <form onSubmit={handleSubmit} className="flex w-full gap-2">
            <Textarea
              value={input}
              onChange={handleInputChange}
              placeholder={
                hasApiKey
                  ? "Ask me about courses, requirements, or planning..."
                  : "Please configure your API key in settings first..."
              }
              disabled={isLoading || !hasApiKey}
              className="min-h-[60px] max-h-[120px] resize-none"
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
            />
            <div className="flex flex-col gap-2">
              {isLoading ? (
                <Button type="button" size="icon" onClick={stop} variant="destructive">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" size="icon" disabled={!input.trim() || !hasApiKey}>
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
