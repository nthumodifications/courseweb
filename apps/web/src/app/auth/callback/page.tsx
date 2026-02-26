"use client";
import { Dialog, DialogContent } from "@courseweb/ui";
import { toast } from "@courseweb/ui";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "react-oidc-context";

export default function AuthCallback() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.error) {
      console.error(auth.error);
      navigate("/");
    }
  }, [auth, navigate]);

  // Add timeout to force logout after 10 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      // If we're still on this page after 10 seconds, force logout
      console.log("Authentication timeout reached, redirecting...");
      toast({
        title: "Authentication timeout",
        description: "The login process took too long. Please try again.",
        variant: "destructive",
      });

      // Force logout and redirect to home
      auth.signoutRedirect({
        post_logout_redirect_uri: window.location.origin,
        id_token_hint: auth.user?.id_token,
      });
    }, 10000);

    // Clean up timeout if component unmounts or auth completes
    return () => clearTimeout(timeout);
  }, [auth, navigate]);

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">
            Logging you into NTHUMods
          </h2>
          <p className="text-sm text-muted-foreground">
            Please wait while we complete the authentication process...
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
