import { Button } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { useAccountActions } from "@/hooks/useAccountActions";
import { AccountLogoutDialog } from "@/components/AccountLogoutDialog";
import { SettingItem } from "./SettingItem";
import { SettingsSection } from "./SettingsSection";

export const AccountSection = () => {
  const dict = useDictionary();
  const {
    isAuthenticated,
    user,
    handleLogin,
    openLogoutDialog,
    logoutDialogOpen,
    setLogoutDialogOpen,
    keepLocalData,
    setKeepLocalData,
    handleConfirmLogout,
  } = useAccountActions();
  const signedIn = isAuthenticated && user;

  return (
    <>
      <SettingsSection id="account" title={dict.settings.account.title}>
        <SettingItem
          title={
            signedIn ? (
              <div className="flex flex-col font-normal">
                <div className="text-sm">{user.profile.name}</div>
                <div className="text-xs text-muted-foreground">
                  {user.profile.sub}
                </div>
              </div>
            ) : (
              dict.settings.account.title
            )
          }
          description={
            signedIn ? undefined : dict.settings.account.syncDescription
          }
          control={
            <Button
              variant="outline"
              size="sm"
              onClick={signedIn ? openLogoutDialog : handleLogin}
            >
              {signedIn
                ? dict.settings.account.signout
                : dict.settings.account.signin}
            </Button>
          }
        />
      </SettingsSection>
      <AccountLogoutDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        keepLocalData={keepLocalData}
        onKeepLocalDataChange={setKeepLocalData}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
};
