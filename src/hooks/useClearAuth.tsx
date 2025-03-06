"use client";
import { useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { signOut as serverSignOut } from "@/lib/firebase/auth";
import { signOut } from "firebase/auth";
import { auth } from "@/config/firebase";

const useClearAuth = () => {
  const [user, loading, error] = useAuthState(auth);

  useEffect(() => {
    if (localStorage.getItem("headless_ais")) {
      localStorage.removeItem("headless_ais");
    }
  }, []);

  useEffect(() => {
    if (user) {
      serverSignOut();
      signOut(auth);
    }
  }, [user]);
};

export function ClearAuthComponent() {
  useClearAuth();
  return <></>;
}
