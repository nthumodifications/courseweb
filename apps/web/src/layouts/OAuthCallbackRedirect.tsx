import { useEffect } from "react";
import useDictionary from "@/dictionaries/useDictionary";

const OAuthCallbackRedirect = () => {
  const dict = useDictionary();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectUrl = new URL(
      `${import.meta.env.VITE_NTHUMODS_AUTH_URL}/oauth/nthu`,
    );
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (code) redirectUrl.searchParams.set("code", code);
    if (state) redirectUrl.searchParams.set("state", state);
    if (error) redirectUrl.searchParams.set("error", error);

    window.location.href = redirectUrl.toString();
  }, []);

  return (
    <div className="p-4">
      <p className="text-muted-foreground leading-relaxed">{dict.common.redirecting}</p>
    </div>
  );
};

export default OAuthCallbackRedirect;
