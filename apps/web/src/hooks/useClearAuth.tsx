import { useEffect } from "react";
import { removeLegacyCredentialStorage } from "@/lib/credentialStorage";

const useClearAuth = () => {
  useEffect(() => {
    removeLegacyCredentialStorage();
  }, []);
};

export function ClearAuthComponent() {
  useClearAuth();
  return <></>;
}
