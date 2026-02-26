import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import OidcAuthProvider from "@/hooks/contexts/useAuth";
import { RxDBProvider } from "@/config/rxdb";
import ReactQuery from "@/components/ReactQuery";
import { SettingsProvider } from "@/hooks/contexts/settings";
import { UserTimetableProvider } from "@/hooks/contexts/useUserTimetable";
import { Toaster } from "@courseweb/ui";
import { ClearAuthComponent } from "@/hooks/useClearAuth";
import TitleUpdater from "@/layouts/TitleUpdater";
import RootErrorFallback from "@/app/error";

const AppProviders = () => {
  return (
    <ErrorBoundary FallbackComponent={RootErrorFallback}>
      <OidcAuthProvider>
        <RxDBProvider>
          <ReactQuery>
            <SettingsProvider>
              <UserTimetableProvider>
                <TitleUpdater />
                <Outlet />
                <Toaster />
                <ClearAuthComponent />
              </UserTimetableProvider>
            </SettingsProvider>
          </ReactQuery>
        </RxDBProvider>
      </OidcAuthProvider>
    </ErrorBoundary>
  );
};

export default AppProviders;
