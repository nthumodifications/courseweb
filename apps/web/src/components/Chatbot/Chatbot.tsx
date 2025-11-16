'use client';

import { useState } from 'react';
import { MessageCircle, X, Send, Settings, Loader2 } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { Button } from '@courseweb/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@courseweb/ui';
import { Input } from '@courseweb/ui';
import { ScrollArea } from '@courseweb/ui';
import { Separator } from '@courseweb/ui';
import { cn } from '@/lib/utils';
import ChatMessage from './ChatMessage';
import ChatSettings from './ChatSettings';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userApiKey, setUserApiKey] = useState<string>('');

  const { messages, input, setInput, append, isLoading } = useChat({
    api: `${process.env.NEXT_PUBLIC_COURSEWEB_API_URL || 'https://api.nthumods.com'}/chat`,
    body: {
      userApiKey: userApiKey || undefined,
    },
    onError: (error: any) => {
      console.error('Chat error:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      append({
        role: 'user',
        content: input.trim(),
      });
      setInput('');
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg',
          'bg-primary hover:bg-primary/90 text-primary-foreground',
          'transition-all duration-200 ease-in-out',
          'hover:scale-110 active:scale-95'
        )}
        aria-label="Open course planning assistant"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Chat Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="h-[80vh] max-w-2xl flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 pb-3 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <span>Course Planning Assistant</span>
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(!showSettings)}
                  aria-label="Settings"
                >
                  <Settings className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {showSettings ? (
            <ChatSettings
              apiKey={userApiKey}
              setApiKey={setUserApiKey}
              onClose={() => setShowSettings(false)}
            />
          ) : (
            <>
              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-8">
                    <MessageCircle className="h-12 w-12 text-muted-foreground/50" />
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Welcome to Course Planning Assistant</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        I can help you find courses, plan your semester, and provide information about NTHU courses.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 w-full max-w-xl">
                      <Button
                        variant="outline"
                        className="text-left justify-start h-auto py-3 px-4"
                        onClick={() => append({
                          role: 'user',
                          content: 'I want to find machine learning courses',
                        })}
                      >
                        <span className="text-sm">Find machine learning courses</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="text-left justify-start h-auto py-3 px-4"
                        onClick={() => append({
                          role: 'user',
                          content: 'What courses should I take for CS degree?',
                        })}
                      >
                        <span className="text-sm">Plan CS degree courses</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="text-left justify-start h-auto py-3 px-4"
                        onClick={() => append({
                          role: 'user',
                          content: 'Show me introductory programming courses',
                        })}
                      >
                        <span className="text-sm">Find programming courses</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="text-left justify-start h-auto py-3 px-4"
                        onClick={() => append({
                          role: 'user',
                          content: 'What are the requirements for graduating?',
                        })}
                      >
                        <span className="text-sm">Graduation requirements</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message: any) => (
                      <ChatMessage key={message.id} message={message} />
                    ))}
                    {isLoading && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              <Separator />

              {/* Input Area */}
              <form onSubmit={handleSubmit} className="p-4">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about courses, requirements, or planning..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Powered by Gemini AI • Free tier available
                </p>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
