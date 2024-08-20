"use client";
import { AlertTriangle } from "lucide-react";

export const AISError = () => (
  <div className="w-full grid place-items-center h-[--content-height]">
    <div className="flex flex-col space-y-4 items-center">
      {/* <div className='animate-spin rounded-full h-16 w-16 border-2 border-gray-900'></div> */}
      <AlertTriangle className="h-14 w-14 text-gray-900 dark:text-gray-100" />
      <p className="text-gray-700 dark:text-gray-500">
        偷渡資料時出事了！請檢查登入資訊，或稍後再試。
      </p>
    </div>
  </div>
);
