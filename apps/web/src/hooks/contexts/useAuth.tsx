import { Language } from "@/types/settings";
import { useNavigate, useParams } from "react-router-dom";
import { WebStorageStateStore } from "oidc-client-ts";
import { PropsWithChildren, useEffect, useState, useMemo } from "react";
import {
  AuthProvider,
  AuthProviderProps,
  hasAuthParams,
  useAuth,
} from "react-oidc-context";

const RefreshOnLoad = () => {
  const auth = useAuth();
  const [hasTriedSignin, setHasTriedSignin] = useState(false);

  // automatically sign-in
  useEffect(() => {
    if (
      !hasAuthParams() &&
      !auth.isAuthenticated &&
      !auth.activeNavigator &&
      !auth.isLoading &&
      !hasTriedSignin
    ) {
      console.log("No auth params, signing in...", auth);
      // Check if user exists in local storage before signing in
      if (auth.user !== null) {
        // Only trigger sign-in if no user exists in storage
        auth.signinSilent();
      }
      setHasTriedSignin(true);
    }
  }, [auth, hasTriedSignin]);

  return <></>;
};

const OidcAuthProvider = ({ children }: PropsWithChildren) => {
  const navigate = useNavigate();
  const language = useParams().lang as Language;

  const oidcConfig = useMemo(() => {
    return {
      authority: import.meta.env.VITE_NTHUMODS_AUTH_URL!,
      client_id: import.meta.env.VITE_AUTH_CLIENT_ID!,
      redirect_uri: import.meta.env.VITE_NTHUMODS_AUTH_REDIRECT!,
      silent_redirect_uri: import.meta.env.VITE_NTHUMODS_AUTH_SILENT_REDIRECT!,
      scope: "openid profile offline_access email kv calendar planner",
      userStore: new WebStorageStateStore({ store: window.localStorage }),
      automaticSilentRenew: true,
      onSigninCallback(user) {
        console.log("User signed in", user);
        const redirectUri = localStorage.getItem("redirectUri");
        navigate(redirectUri ?? "/");
      },
      ui_locales: language,
      post_logout_redirect_uri: window.location.origin,
    } as AuthProviderProps;
  }, [language, navigate]);

  return (
    <AuthProvider {...oidcConfig}>
      <RefreshOnLoad />
      {children}
    </AuthProvider>
  );
};

export default OidcAuthProvider;
