'use client';

import { useState } from 'react';
import { Button } from '@courseweb/ui';
import { Input } from '@courseweb/ui';
import { Label } from '@courseweb/ui';
import { Separator } from '@courseweb/ui';
import { Save, Eye, EyeOff } from 'lucide-react';

interface ChatSettingsProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  onClose: () => void;
}

export default function ChatSettings({ apiKey, setApiKey, onClose }: ChatSettingsProps) {
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    // Save to localStorage for persistence
    if (tempApiKey) {
      localStorage.setItem('chatbot-api-key', tempApiKey);
    } else {
      localStorage.removeItem('chatbot-api-key');
    }
    setApiKey(tempApiKey);
    onClose();
  };

  // Load from localStorage on mount
  useState(() => {
    const saved = localStorage.getItem('chatbot-api-key');
    if (saved) {
      setTempApiKey(saved);
      setApiKey(saved);
    }
  });

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure your AI assistant preferences
          </p>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">Google Gemini API Key (Optional)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type={showKey ? 'text' : 'password'}
                  value={tempApiKey}
                  onChange={(e: any) => setTempApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              By default, the chatbot uses a shared Gemini free tier API key. 
              You can provide your own API key for better rate limits and privacy.
            </p>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-3">
            <h4 className="text-sm font-semibold">How to get an API key:</h4>
            <ol className="text-xs space-y-2 list-decimal list-inside text-muted-foreground">
              <li>Visit <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a></li>
              <li>Sign in with your Google account</li>
              <li>Click "Get API Key" to create a new key</li>
              <li>Copy the key and paste it above</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              The free tier includes 15 requests per minute and is sufficient for most users.
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="text-sm font-semibold">About</h4>
          <div className="text-xs text-muted-foreground space-y-2">
            <p>
              This chatbot helps you plan your courses at NTHU by searching through 
              the course database and providing personalized recommendations.
            </p>
            <p>
              Your API key is stored locally in your browser and never sent to our servers 
              except when making AI requests.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-6 pt-4 border-t">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSave} className="flex-1">
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
