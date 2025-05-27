import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShareIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "react-oidc-context";
import authClient from "@/config/auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

interface ApiKey {
  id: string;
  name: string;
  scopes: string[];
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  isRevoked: boolean;
}

export function CalendarShareDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [expiresIn, setExpiresIn] = useState("never");
  const [showCalendarRead, setShowCalendarRead] = useState(true);
  const [newApiKey, setNewApiKey] = useState<{
    name: string;
    key: string;
  } | null>(null);
  const auth = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && auth.isAuthenticated) {
      fetchApiKeys();
    }
  }, [isOpen, auth.isAuthenticated]);

  const fetchApiKeys = async () => {
    if (!auth.user?.access_token) return;

    setLoading(true);
    try {
      const response = await authClient.api.apikeys.$get(
        {},
        {
          headers: {
            Authorization: `Bearer ${auth.user.access_token}`,
          },
        },
      );

      if (response.ok) {
        const keys = await response.json();
        setApiKeys(keys);
      } else {
        setError("Failed to fetch API keys");
      }
    } catch (err) {
      setError("Failed to fetch API keys");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!auth.user?.access_token || !newKeyName.trim()) return;

    try {
      // Calculate expiration date if not "never"
      let expiresAt;
      if (expiresIn !== "never") {
        const days = parseInt(expiresIn, 10);
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
      }
      const response = await authClient.api.apikeys.$post(
        {
          json: {
            name: newKeyName,
            scopes: showCalendarRead ? ["calendar:read"] : [],
            ...(expiresIn !== "never" && {
              expiresAt: expiresAt?.toISOString(),
            }),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${auth.user.access_token}`,
          },
        },
      );

      if (response.ok) {
        const newKey = await response.json();
        setNewApiKey(newKey);
        await fetchApiKeys();
        setNewKeyName("");
      } else {
        toast({
          title: "Error",
          description: "Failed to create API key",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive",
      });
    }
  };

  const revokeApiKey = async (keyId: string) => {
    if (!auth.user?.access_token) return;

    try {
      const response = await authClient.api.apikeys[":id"].revoke.$put(
        {
          param: { id: keyId },
        },
        {
          headers: {
            Authorization: `Bearer ${auth.user.access_token}`,
          },
        },
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "API key revoked successfully",
        });
        await fetchApiKeys();
      } else {
        toast({
          title: "Error",
          description: "Failed to revoke API key",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to revoke API key",
        variant: "destructive",
      });
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!auth.user?.access_token) return;

    try {
      const response = await authClient.api.apikeys[":id"].$delete(
        {
          param: { id: keyId },
        },
        {
          headers: {
            Authorization: `Bearer ${auth.user.access_token}`,
          },
        },
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "API key deleted successfully",
        });
        await fetchApiKeys();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete API key",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  const getCalendarUrl = (keyValue: string) => {
    if (!auth.user) return "";
    return `https://api.nthumods.com/calendar/ics/${auth.user.profile.sub}/${keyValue}/basic.ics`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Calendar URL copied to clipboard",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Share Calendar">
          <ShareIcon className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Share Calendar</DialogTitle>
          <DialogDescription>
            Create API keys to share your calendar with external applications
          </DialogDescription>
        </DialogHeader>

        {!auth.isAuthenticated ? (
          <div className="py-6 text-center">
            <p className="mb-4">
              You need to be logged in to share your calendar
            </p>
            <Button onClick={() => auth.signinRedirect()}>Sign In</Button>
          </div>
        ) : (
          <Tabs defaultValue="keys">
            <TabsList className="mb-4">
              <TabsTrigger value="keys">Your API Keys</TabsTrigger>
              <TabsTrigger value="create">Create New Key</TabsTrigger>
            </TabsList>

            <TabsContent value="keys">
              {loading ? (
                <div className="py-8 text-center">Loading...</div>
              ) : error ? (
                <div className="py-8 text-center text-red-500">{error}</div>
              ) : apiKeys.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="mb-4">You don't have any API keys yet</p>
                  <Button
                    onClick={() =>
                      document.querySelector('[data-value="create"]')?.click()
                    }
                  >
                    Create Your First Key
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto py-2">
                  {apiKeys.map((key) => (
                    <Card
                      key={key.id}
                      className={key.isRevoked ? "opacity-60" : ""}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">{key.name}</CardTitle>
                          {key.isRevoked && (
                            <span className="bg-red-100 text-red-800 text-xs py-1 px-2 rounded">
                              Revoked
                            </span>
                          )}
                        </div>
                        <CardDescription>
                          Created {new Date(key.createdAt).toLocaleDateString()}
                          {key.expiresAt &&
                            ` • Expires ${new Date(key.expiresAt).toLocaleDateString()}`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        {" "}
                        {(key.scopes.includes("calendar:read") ||
                          key.scopes.includes("CALENDAR_READ")) &&
                          !key.isRevoked && (
                            <div className="flex flex-col gap-1">
                              <Label
                                htmlFor={`cal-url-${key.id}`}
                                className="text-xs text-muted-foreground"
                              >
                                Calendar URL:
                              </Label>
                              <div className="flex gap-2">
                                <Input
                                  id={`cal-url-${key.id}`}
                                  value={getCalendarUrl(key.id)}
                                  readOnly
                                  className="text-xs"
                                />
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    copyToClipboard(getCalendarUrl(key.id))
                                  }
                                >
                                  Copy
                                </Button>
                              </div>
                            </div>
                          )}
                      </CardContent>
                      <CardFooter className="pt-0">
                        <div className="flex gap-2 ml-auto">
                          {!key.isRevoked && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => revokeApiKey(key.id)}
                            >
                              Revoke
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteApiKey(key.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="create">
              {newApiKey ? (
                <div className="py-4">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                    <h3 className="font-medium text-green-800 mb-2">
                      API Key Created Successfully
                    </h3>
                    <p className="text-sm text-green-700 mb-4">
                      Your API key has been created. Make sure to copy it now as
                      you won't be able to see it again!
                    </p>
                    <div className="mb-4">
                      <Label
                        htmlFor="new-api-key"
                        className="mb-1 block text-sm"
                      >
                        API Key
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="new-api-key"
                          value={newApiKey.key}
                          readOnly
                        />
                        <Button onClick={() => copyToClipboard(newApiKey.key)}>
                          Copy
                        </Button>
                      </div>
                    </div>
                    <div className="mb-4">
                      <Label
                        htmlFor="calendar-url"
                        className="mb-1 block text-sm"
                      >
                        Calendar URL
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="calendar-url"
                          value={getCalendarUrl(newApiKey.key)}
                          readOnly
                        />
                        <Button
                          onClick={() =>
                            copyToClipboard(getCalendarUrl(newApiKey.key))
                          }
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                    <Button onClick={() => setNewApiKey(null)}>Done</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">API Key Name</Label>
                    <Input
                      id="key-name"
                      placeholder="e.g. Google Calendar"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Expiration</Label>
                    <div className="flex gap-2">
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={expiresIn}
                        onChange={(e) => setExpiresIn(e.target.value)}
                      >
                        <option value="never">Never expires</option>
                        <option value="30">30 days</option>
                        <option value="90">90 days</option>
                        <option value="180">180 days</option>
                        <option value="365">1 year</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Scopes</Label>
                    <div className="flex items-center gap-2 border rounded-md p-3">
                      <div className="flex-1">
                        <p className="font-medium">Calendar Read</p>
                        <p className="text-sm text-muted-foreground">
                          Access to read your calendar events
                        </p>
                      </div>
                      <Switch
                        checked={showCalendarRead}
                        onCheckedChange={setShowCalendarRead}
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={createApiKey}
                    disabled={!newKeyName.trim()}
                  >
                    Create API Key
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
