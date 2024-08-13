"use client";
import NTHUBirdIcon from "@/components/NTHUBirdIcon";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { FC } from "react";

const NTHULoginButton: FC = () => {
  return (
    <div className="text-center space-y-3 py-4 w-full">
      {/* <Button startDecorator={<NTHUBirdIcon />} variant="outlined" color="neutral" onClick={() => signIn('nthu')}>Login with NTHU</Button> */}
      <Button variant="outline" onClick={() => signIn("nthu")}>
        <NTHUBirdIcon /> CCXP 校務系統登入
      </Button>
    </div>
  );
};

export default NTHULoginButton;
