import { useEffect } from "react";

const useClearAuth = () => {
  useEffect(() => {
    if (localStorage.getItem("headless_ais")) {
      localStorage.removeItem("headless_ais");
    }
  }, []);
};

export function ClearAuthComponent() {
  useClearAuth();
  return <></>;
}
