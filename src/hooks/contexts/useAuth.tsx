"use client";
import { useRouter } from "next/navigation";
import { WebStorageStateStore } from "oidc-client-ts";
import { PropsWithChildren } from "react";
import { AuthProvider, AuthProviderProps } from "react-oidc-context";

const OidcAuthProvider = ({ children }: PropsWithChildren) => {
  const router = useRouter();

  const oidcConfig: AuthProviderProps = {
    authority: process.env.NEXT_PUBLIC_NTHUMODS_AUTH_URL!,
    client_id: process.env.NEXT_PUBLIC_AUTH_CLIENT_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_NTHUMODS_AUTH_REDIRECT!,
    scope: "openid profile email kv",
    userStore: new WebStorageStateStore({ store: window.localStorage }),
    automaticSilentRenew: true,
    onSigninCallback(user) {
      console.log("User signed in", user);
      const redirectUri = localStorage.getItem("redirectUri");
      router.push(redirectUri ?? "/");
    },
  };

  return <AuthProvider {...oidcConfig}>{children}</AuthProvider>;
};

export default OidcAuthProvider;
