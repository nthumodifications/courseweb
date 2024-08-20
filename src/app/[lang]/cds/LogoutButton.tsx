"use client";

import { Button } from "@/components/ui/button";
import useDictionary from "@/dictionaries/useDictionary";
import { signOut } from "next-auth/react";

const LogoutButton = () => {
  const dict = useDictionary();
  return (
    <Button variant="destructive" onClick={() => signOut()}>
      登出
    </Button>
  );
};

export default LogoutButton;
