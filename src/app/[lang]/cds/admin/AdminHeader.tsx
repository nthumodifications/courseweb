"use client";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "next-auth/react";

const AdminHeader = () => {
  const session = useSession();
  return (
    <div className="flex flex-row items-center justify-between p-2">
      <p className="text-base font-bold text-gray-700 dark:text-neutral-300">
        目前登入為 {session.data?.user.name_zh} ({session.data?.user.id})
      </p>
      <Button
        variant="destructive"
        onClick={() => {
          signOut();
        }}
      >
        登出
      </Button>
    </div>
  );
};

export default AdminHeader;
