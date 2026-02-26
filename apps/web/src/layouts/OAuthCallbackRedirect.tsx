import { useEffect } from "react";

const OAuthCallbackRedirect = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectUrl = new URL("https://auth.nthumods.com/oauth/nthu");
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (code) redirectUrl.searchParams.set("code", code);
    if (state) redirectUrl.searchParams.set("state", state);
    if (error) redirectUrl.searchParams.set("error", error);

    window.location.href = redirectUrl.toString();
  }, []);

  return (
    <div className="grid place-items-center h-screen">
      <p>Redirecting...</p>
    </div>
  );
};

export default OAuthCallbackRedirect;
