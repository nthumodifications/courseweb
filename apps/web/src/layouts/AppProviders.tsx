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
import { ThemeProvider } from "@/hooks/contexts/theme";
import { useSettings } from "@/hooks/contexts/settings";

const ThemeWrapper = ({ children }: { children: React.ReactNode }) => {
  const { darkMode } = useSettings();
  return <ThemeProvider isDark={darkMode}>{children}</ThemeProvider>;
};

const AppProviders = () => {
  return (
    <ErrorBoundary FallbackComponent={RootErrorFallback}>
      <OidcAuthProvider>
        <RxDBProvider>
          <ReactQuery>
            <SettingsProvider>
              <ThemeWrapper>
                <UserTimetableProvider>
                  <TitleUpdater />
                  <Outlet />
                  <Toaster />
                  <ClearAuthComponent />
                </UserTimetableProvider>
              </ThemeWrapper>
            </SettingsProvider>
          </ReactQuery>
        </RxDBProvider>
      </OidcAuthProvider>
    </ErrorBoundary>
  );
};

export default AppProviders;
