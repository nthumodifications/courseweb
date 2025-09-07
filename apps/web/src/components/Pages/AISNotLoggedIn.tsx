"use client";
import { BadgeAlert } from "lucide-react";

export const AISNotLoggedIn = () => (
  <div className="w-full grid place-items-center h-[--content-height]">
    <div className="flex flex-col space-y-4 items-center">
      {/* <div className='animate-spin rounded-full h-16 w-16 border-2 border-gray-900'></div> */}
      <BadgeAlert className="h-14 w-14 text-gray-900 dark:text-gray-100" />
      <p className="text-gray-700 dark:text-gray-500">無代理登入賬號資料</p>
    </div>
  </div>
);
