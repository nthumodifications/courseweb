"use client";

import { useState } from "react";
import { ShieldAlert, ExternalLink } from "lucide-react";
import { useHeadlessAIS } from "@/hooks/useHeadlessAIS";
import useDictionary from "@/dictionaries/useDictionary";

const ConsentDialog = ({ onAccept }: { onAccept: () => void }) => {
  const [accepted, setAccepted] = useState(false);
  const dict = useDictionary();
  const t = dict.proxy_login;

  return (
    <div className="w-full space-y-4">
      <div className="border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
          {t.consent_title}
        </h3>
        <ul className="space-y-2">
          {t.privacy_risks.map((risk: string, i: number) => (
            <li key={i} className="text-xs text-amber-900 dark:text-amber-100">
              <span className="font-medium">{i + 1}.</span> {risk}
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
          {t.consent_checkbox}
        </span>
      </label>

      <button
        type="button"
        onClick={onAccept}
        disabled={!accepted}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
      >
        {t.consent_continue}
      </button>
    </div>
  );
};

export const AISNotLoggedIn = () => {
  const { login, loading, error } = useHeadlessAIS();
  const dict = useDictionary();
  const t = dict.proxy_login;
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
            {t.title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t.subtitle}
          </p>
        </div>

        {!consentGiven ? (
          <ConsentDialog onAccept={() => setConsentGiven(true)} />
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.student_id_label}
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
                {t.password_label}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.password_placeholder}
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
                {t.store_credentials_label}
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
              {loading ? t.login_loading : t.login_button}
            </button>

            <a
              href="/proxy-login"
              className="flex items-center justify-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:underline"
            >
              {t.learn_more}
              <ExternalLink className="h-3 w-3" />
            </a>
          </form>
        )}
      </div>
    </div>
  );
};
