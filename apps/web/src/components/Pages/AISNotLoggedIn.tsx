"use client";

import { useState } from "react";
import { ShieldAlert, ExternalLink } from "lucide-react";
import { useHeadlessAIS } from "@/hooks/useHeadlessAIS";

const PRIVACY_RISKS = [
  {
    zh: "您的 CCXP 密碼會經由 NTHUMods 伺服器傳輸至校務資訊系統。",
    en: "Your CCXP password is transmitted through the NTHUMods server to the university system.",
  },
  {
    zh: "若選擇「自動更新」，密碼會以 AES-256-GCM 加密儲存於伺服器。伺服器管理員在技術上有能力解密。",
    en: 'If you enable "auto-refresh", your password is stored encrypted (AES-256-GCM) on our server. The server operator technically has the ability to decrypt it.',
  },
  {
    zh: "您的成績、個人資料、門禁 QR 碼、包裹資訊等資料會經由本服務傳輸，本服務可能記錄這些資料。",
    en: "Your grades, personal information, door access QR codes, and parcel data pass through this service and may be logged.",
  },
  {
    zh: "本服務為學生專案，非清華大學官方服務，不提供任何資安擔保。",
    en: "This is a student project, not an official NTHU service. No security guarantees are provided.",
  },
  {
    zh: "學號、姓名、科系等個人資訊會暫存於您的瀏覽器 localStorage 中，若裝置遭入侵或存在 XSS 漏洞可能外洩。",
    en: "Student ID, name, and department are cached in your browser's localStorage and could be exposed if your device is compromised or an XSS vulnerability exists.",
  },
];

const ConsentDialog = ({ onAccept }: { onAccept: () => void }) => {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="w-full space-y-4">
      <div className="border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
          隱私與風險聲明 / Privacy & Risk Disclosure
        </h3>
        <ul className="space-y-2">
          {PRIVACY_RISKS.map((risk, i) => (
            <li key={i} className="text-xs text-amber-900 dark:text-amber-100">
              <span className="font-medium">{i + 1}.</span> {risk.zh}
              <br />
              <span className="text-amber-700 dark:text-amber-300 italic">
                {risk.en}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
        />
        <span className="text-xs text-gray-700 dark:text-gray-300">
          我已閱讀並理解上述風險，同意繼續使用代理登入功能。
          <br />
          <span className="italic text-gray-500 dark:text-gray-400">
            I have read and understand the above risks, and agree to proceed.
          </span>
        </span>
      </label>

      <button
        type="button"
        onClick={onAccept}
        disabled={!accepted}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
      >
        繼續 / Continue
      </button>
    </div>
  );
};

export const AISNotLoggedIn = () => {
  const { login, loading, error } = useHeadlessAIS();
  const [studentid, setStudentid] = useState("");
  const [password, setPassword] = useState("");
  const [storeCredentials, setStoreCredentials] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(studentid, password, storeCredentials);
    } catch {
      // Error is displayed via the hook's error state
    }
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
            使用 CCXP 帳號查看成績、學生證等功能。
          </p>
        </div>

        {!consentGiven ? (
          <ConsentDialog onAccept={() => setConsentGiven(true)} />
        ) : (
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
                autoComplete="username"
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
                autoComplete="off"
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
                儲存認證以自動更新（加密儲存於伺服器，30
                天後自動刪除。伺服器管理員技術上可解密。）
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

            <a
              href="/proxy-login"
              className="flex items-center justify-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:underline"
            >
              了解代理登入的運作方式
              <ExternalLink className="h-3 w-3" />
            </a>
          </form>
        )}
      </div>
    </div>
  );
};
