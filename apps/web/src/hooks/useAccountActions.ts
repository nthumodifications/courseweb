import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { useRxCollection } from "rxdb-hooks";
import {
  getSyncedStorageBackupKey,
  getSyncedStorageKey,
} from "./syncedStorage";

export const useAccountActions = () => {
  const {
    isAuthenticated,
    signinRedirect,
    user,
    signoutRedirect,
    removeUser,
    clearStaleState,
    revokeTokens,
  } = useAuth();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [keepLocalData, setKeepLocalData] = useState(true);

  const eventsCol = useRxCollection("events");
  const timetableSyncCol = useRxCollection("timetablesync");

  const handleLogin = () => {
    localStorage.setItem("redirectUri", window.location.pathname);
    signinRedirect();
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

  const handleConfirmLogout = async () => {
    if (!keepLocalData) {
      // Clear local storage except for necessary auth-related items
      const localStorageKeys = [
        "hasVisitedBefore",
        "theme_changable_alert",
        "use_new_calendar",
        "timetable_vertical",
        "courses",
        "timetable_custom_items",
        "course_favourites",
        "course_color_map",
        "timetable_theme",
        "user_defined_colors",
        "timetable_display_preferences",
        "timetable-display-settings",
        "grades",
      ];
      localStorageKeys.forEach((key) => {
        // Clear the current account and anonymous namespaces, plus the old
        // unscoped copy. Other account namespaces remain recoverable.
        [
          getSyncedStorageKey(key, user?.profile.sub),
          getSyncedStorageKey(key),
          key,
        ].forEach((storageKey) => {
          localStorage.removeItem(storageKey);
          localStorage.removeItem(getSyncedStorageBackupKey(storageKey));
        });
      });

      // Remove the whole identity-scoped database so its event data,
      // timetable checkpoints, and replication metadata are all cleared.
      const calendarDb = eventsCol?.database ?? timetableSyncCol?.database;
      if (calendarDb) {
        await calendarDb.remove();
      } else {
        await eventsCol?.remove();
        await timetableSyncCol?.remove();
      }
      console.log("Local data cleared");
    }
    await handleLogout();
    setLogoutDialogOpen(false);
  };

  return {
    isAuthenticated,
    user,
    handleLogin,
    handleConfirmLogout,
    logoutDialogOpen,
    openLogoutDialog: () => setLogoutDialogOpen(true),
    setLogoutDialogOpen,
    keepLocalData,
    setKeepLocalData,
  };
};
