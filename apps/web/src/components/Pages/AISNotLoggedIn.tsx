"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useHeadlessAIS } from "@/hooks/useHeadlessAIS";

export const AISNotLoggedIn = () => {
  const { login, loading, error } = useHeadlessAIS();
  const [studentid, setStudentid] = useState("");
  const [password, setPassword] = useState("");
  const [storeCredentials, setStoreCredentials] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(studentid, password, storeCredentials);
  };

  return (
    <div className="w-full grid place-items-center h-[--content-height]">
      <div className="flex flex-col space-y-6 items-center w-full max-w-sm px-4">
        <ShieldAlert className="h-12 w-12 text-gray-400 dark:text-gray-500" />
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            連結校務資訊系統
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            輸入您的 CCXP 帳號以查看資料。密碼不會儲存在本機裝置。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              學號
            </label>
            <input
              type="text"
              value={studentid}
              onChange={(e) => setStudentid(e.target.value)}
              placeholder="A1234567"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              密碼
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="CCXP 密碼"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={storeCredentials}
              onChange={(e) => setStoreCredentials(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              儲存認證以自動更新（加密儲存於伺服器，30 天後自動刪除）
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !studentid || !password}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
          >
            {loading ? "登入中…" : "連結 CCXP 帳號"}
          </button>
        </form>

        <a
          href="/proxy-login"
          className="text-xs text-gray-400 dark:text-gray-500 hover:underline"
        >
          了解代理登入的運作方式
        </a>
      </div>
    </div>
  );
};
