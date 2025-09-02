"use client";

import { useState, useEffect } from "react";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Check if app is already running in standalone mode
    const isInStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore
      window.navigator.standalone === true;
    setIsStandalone(isInStandalone);

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log("PWA was installed");
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // For iOS, check if it's installable (not in standalone and is iOS Safari)
    if (isIOSDevice && !isInStandalone) {
      // Check if it's Safari
      const isSafari =
        /Safari/.test(navigator.userAgent) &&
        !/Chrome/.test(navigator.userAgent);
      if (isSafari) {
        setIsInstallable(true);
      }
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt for Android/Chrome
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;

        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the install prompt");
        } else {
          console.log("User dismissed the install prompt");
        }

        setDeferredPrompt(null);
        setIsInstallable(false);
      } catch (error) {
        console.error("Error showing install prompt:", error);
        // Fallback to instructions dialog
        setShowInstructions(true);
      }
    } else {
      // Show instructions dialog for iOS or unsupported browsers
      setShowInstructions(true);
    }
  };

  // Don't show the button if app is already installed or not installable
  if (isStandalone || !isInstallable) {
    return null;
  }

  const InstallInstructionsContent = () => (
    <div className="space-y-4">
      {isIOS ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-blue-800 dark:text-blue-200">
              1
            </span>
            <span>Tap the Share button at the bottom of Safari</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-blue-800 dark:text-blue-200">
              2
            </span>
            <span>Scroll down and tap "Add to Home Screen"</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-blue-800 dark:text-blue-200">
              3
            </span>
            <span>Tap "Add" to confirm</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            To install this app on your device:
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-blue-800 dark:text-blue-200">
              1
            </span>
            <span>Look for the install icon in your browser's address bar</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-blue-800 dark:text-blue-200">
              2
            </span>
            <span>Or check your browser's menu for "Install app" option</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Button
        onClick={handleInstallClick}
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 text-sm font-medium"
      >
        <Download className="h-4 w-4" />
        Install
      </Button>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Install NTHUMods
            </DialogTitle>
            <DialogDescription>
              Add NTHUMods to your home screen for quick access and a native app
              experience.
            </DialogDescription>
          </DialogHeader>
          <InstallInstructionsContent />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PWAInstallPrompt;
