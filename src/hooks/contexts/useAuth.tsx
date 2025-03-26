"use client";
import { useRouter } from "next/navigation";
import { UserManager, WebStorageStateStore } from "oidc-client-ts";
import { PropsWithChildren, useEffect, useState } from "react";
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
        auth.signinRedirect();
      }
      setHasTriedSignin(true);
    }
  }, [auth, hasTriedSignin]);

  return <></>;
};

const OidcAuthProvider = ({ children }: PropsWithChildren) => {
  const router = useRouter();

  const oidcConfig: AuthProviderProps = {
    authority: process.env.NEXT_PUBLIC_NTHUMODS_AUTH_URL!,
    client_id: process.env.NEXT_PUBLIC_AUTH_CLIENT_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_NTHUMODS_AUTH_REDIRECT!,
    silent_redirect_uri: process.env.NEXT_PUBLIC_NTHUMODS_AUTH_SILENT_REDIRECT!,
    scope: "openid profile offline_access email kv calendar",
    userStore: new WebStorageStateStore({ store: window.localStorage }),
    automaticSilentRenew: true,
    onSigninCallback(user) {
      console.log("User signed in", user);
      const redirectUri = localStorage.getItem("redirectUri");
      router.push(redirectUri ?? "/");
    },
  };

  return (
    <AuthProvider {...oidcConfig}>
      <RefreshOnLoad />
      {children}
    </AuthProvider>
  );
};

export default OidcAuthProvider;
