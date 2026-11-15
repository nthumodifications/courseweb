import {
  SidebarTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Button,
  useIsMobile,
} from "@courseweb/ui";
import { LogIn, LogOut } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import { MouseEvent, useState } from "react";
import { HeaderPortalOutlet } from "./Portal/HeaderPortal";
import { AccountLogoutDialog } from "./AccountLogoutDialog";
import { useAccountActions } from "@/hooks/useAccountActions";

const Header = () => {
  const {
    isAuthenticated,
    user,
    handleLogin,
    handleConfirmLogout,
    logoutDialogOpen,
    openLogoutDialog,
    setLogoutDialogOpen,
    keepLocalData,
    setKeepLocalData,
  } = useAccountActions();
  const dict = useDictionary();
  const isMobile = useIsMobile();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleOpenConfirmLogout = (e: MouseEvent) => {
    e.preventDefault();

    setDropdownOpen(false);
    openLogoutDialog();
  };

  return (
    <header className="sticky top-0 z-50 grid h-auto min-h-[--header-height] w-full grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center bg-background border-border border-b px-2 py-2 md:col-span-2 md:flex md:h-[--header-height] md:flex-row md:gap-4 md:px-4 md:py-4">
      <SidebarTrigger />
      <div className="contents md:flex md:min-w-0 md:flex-1 md:items-center">
        <div
          id="header-portal-container"
          className="contents md:flex md:min-w-0 md:flex-1 md:justify-center"
        />
        <HeaderPortalOutlet />
      </div>
      <div className="col-start-3 row-start-1">
        {isAuthenticated && user ? (
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger>
              <div className="text-left">
                <div className="text-sm">{user.profile.name}</div>
                <div className="text-xs text-muted-foreground">
                  {user.profile.sub}
                </div>
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
                <span>{dict.settings.account.signout}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="ghost" size="sm" onClick={handleLogin}>
            {isMobile ? "" : dict.settings.account.signin}{" "}
            <LogIn className="w-4 h-4" />
          </Button>
        )}
      </div>
      <AccountLogoutDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        keepLocalData={keepLocalData}
        onKeepLocalDataChange={setKeepLocalData}
        onConfirm={handleConfirmLogout}
      />
    </header>
  );
};

export default Header;
