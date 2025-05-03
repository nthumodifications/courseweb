"use client";
import CurrentSemesterLabel from "./Today/CurrentSemesterLabel";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { LogIn, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import useDictionary from "@/dictionaries/useDictionary";
import { useAuth } from "react-oidc-context";
import { MouseEvent, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRxCollection } from "rxdb-hooks";

const Header = () => {
  const {
    isAuthenticated,
    signinRedirect,
    user,
    signoutRedirect,
    removeUser,
    clearStaleState,
    revokeTokens,
  } = useAuth();
  const dict = useDictionary();

  const handleLogin = () => {
    // set redirectUri in localStorage to current page
    localStorage.setItem("redirectUri", window.location.pathname);
    signinRedirect();
  };
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [keepLocalData, setKeepLocalData] = useState(true);

  const eventsCol = useRxCollection("events");
  const timetableSyncCol = useRxCollection("timetablesync");

  const handleConfirmLogout = async () => {
    if (!keepLocalData) {
      // Clear local storage except for necessary auth-related items
      const localStorageKeys = [
        "hasVisitedBefore",
        "theme_changable_alert",
        "use_new_calendar",
        "timetable_vertical",
        "courses",
        "course_color_map",
        "timetable_theme",
        "user_defined_colors",
        "timetable_display_preferences",
      ];
      localStorageKeys.forEach((key) => localStorage.removeItem(key));

      // Clear any other local data (IndexedDB, etc) if needed
      await eventsCol?.remove();
      await timetableSyncCol?.remove();
      console.log("Local data cleared");
    }
    await handleLogout();
    setOpen(false);
  };

  const handleLogout = async () => {
    await signoutRedirect({
      id_token_hint: user?.id_token,
      post_logout_redirect_uri: window.location.origin,
    });
    await removeUser();
    await clearStaleState();
    await revokeTokens();
    console.log("logout state", isAuthenticated);
  };

  const handleOpenConfirmLogout = (e: MouseEvent) => {
    e.preventDefault();

    setDropdownOpen(false);
    setOpen(true);
  };

  return (
    <header className="h-[--header-height] w-full bg-white border-border border-b dark:bg-background px-2 md:px-4 py-4 md:col-span-2 flex flex-row items-center z-50 gap-4 sticky top-0">
      <SidebarTrigger />
      <div className="flex flex-1">
        <CurrentSemesterLabel />
      </div>
      {isAuthenticated && user ? (
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger>
            <div className="text-left">
              <div className="text-sm">{user.profile.name}</div>
              <div className="text-xs text-gray-500">{user.profile.sub}</div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <div className="text-sm">{user.profile.name}</div>
                <div className="text-xs">{user.profile.sub}</div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleOpenConfirmLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button size="sm" variant="outline" onClick={handleLogin}>
          {dict.settings.account.signin} <LogIn className="w-4 h-4" />
        </Button>
      )}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dict.settings.account.logoutConfimation}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dict.settings.account.logoutDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <Checkbox
              id="keepData"
              checked={keepLocalData}
              onCheckedChange={(checked) => setKeepLocalData(!!checked)}
            />
            <Label htmlFor="keepData">
              {dict.settings.account.keepLocalData}
            </Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{dict.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLogout}
              className="bg-destructive text-destructive-foreground"
            >
              {dict.settings.account.logout}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
};

export default Header;
