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

const Header = () => {
  const {
    isAuthenticated,
    signinRedirect,
    user,
    signoutRedirect,
    removeUser,
    clearStaleState,
  } = useAuth();
  const dict = useDictionary();

  const handleLogout = async () => {
    await removeUser();
    await signoutRedirect({
      id_token_hint: user?.id_token,
    });
    await clearStaleState();
    console.log("logout state", isAuthenticated);
  };

  const handleLogin = () => {
    // set redirectUri in localStorage to current page
    localStorage.setItem("redirectUri", window.location.pathname);
    signinRedirect();
  };

  return (
    <header className="h-[--header-height] w-full bg-white dark:bg-background shadow-md px-2 md:px-4 py-4 md:col-span-2 flex flex-row items-center z-50 gap-4 sticky top-0">
      <SidebarTrigger />
      <div className="flex flex-1">
        <CurrentSemesterLabel />
      </div>
      {isAuthenticated && user ? (
        <DropdownMenu>
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
            <DropdownMenuItem>
              <LogOut className="w-4 h-4 mr-2" />
              <span onClick={handleLogout}>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button size="sm" variant="outline" onClick={handleLogin}>
          {dict.settings.account.signin} <LogIn className="w-4 h-4" />
        </Button>
      )}
    </header>
  );
};

export default Header;
