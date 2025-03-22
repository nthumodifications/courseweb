"use client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "react-oidc-context";

export default function AuthCallback() {
  const auth = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (auth.isAuthenticated) {
      router.push("/");
    }
  }, [auth, router]);

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
