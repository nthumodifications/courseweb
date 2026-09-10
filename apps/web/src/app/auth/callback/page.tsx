import { Dialog, DialogContent } from "@courseweb/ui";
import { toast } from "@courseweb/ui";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import useDictionary from "@/dictionaries/useDictionary";

export default function AuthCallback() {
  const auth = useAuth();
  const navigate = useNavigate();
  const dict = useDictionary();

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
        title: dict.auth.timeout_title,
        description: dict.auth.timeout_description,
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
            {dict.auth.logging_in}
          </h2>
          <p className="text-sm text-muted-foreground">
            {dict.auth.please_wait}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
