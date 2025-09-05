import { type FC } from "hono/jsx";
import NTHUModsLogo from "./NTHUModsLogo";

const Layout: FC = ({ children }) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        {/* css */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="./output.css" />
        <title>NTHUMods Auth</title>
      </head>
      <body className="bg-white font-display min-h-screen">{children}</body>
    </html>
  );
};

export const AuthPageZH: FC<{ authUrl: string }> = ({ authUrl }) => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 font-inter">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 py-4">
            <NTHUModsLogo />
            <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
              Auth
            </h1>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            同意使用 NTHUMods 單一簽入服務
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            NTHUMods 將蒐集並儲存您於清華大學帳戶中的特定個人資料，以提供所有
            NTHUMods 服務的無縫認證體驗。
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 dark:text-white">
            我們將儲存的資料
          </h3>

          <div className="flex items-start space-x-3">
            <svg
              className="w-6 h-6 text-gray-500 dark:text-gray-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                學號/教職員編號與姓名
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                您的學號（或教職員編號）以及姓名（中文與英文），用以在我們的服務中識別您的身份。
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <svg
              className="w-6 h-6 text-gray-500 dark:text-gray-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                電子郵件
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                您於清華大學學務系統中註冊的電子郵件，供緊急聯繫之用。
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <svg
              className="w-6 h-6 text-gray-500 dark:text-gray-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 14l9-5-9-5-9 5 9 5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
              />
            </svg>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                學生身份狀態
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                您是否為在校學生，以提供相關功能。
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            點擊「繼續」即表示您同意 NTHUMods
            依據《個人資料保護法》儲存上述資料。
          </p>
        </div>

        <div className="flex space-x-4">
          <button
            className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            onclick={() => history.back()}
          >
            取消
          </button>
          <a
            href={authUrl.toString()}
            className="flex-1 bg-purple-600 text-white text-center py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
          >
            繼續
          </a>
        </div>
      </div>
    </div>
  );
};

const AuthPageEN: FC<{ authUrl: string }> = ({ authUrl }) => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 font-inter">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 py-4">
            <NTHUModsLogo />
            <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
              Auth
            </h1>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Agree to NTHUMods SSO
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            NTHUMods to collect and store specific information from your NTHU
            account to provide seamless authentication across all NTHUMods
            services.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 dark:text-white">
            What we will store
          </h3>

          <div className="flex items-start space-x-3">
            <svg
              className="w-6 h-6 text-gray-500 dark:text-gray-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                User ID & Name
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Your Student ID (or Employee ID) and name (English and Chinese)
                to identify you across our services
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <svg
              className="w-6 h-6 text-gray-500 dark:text-gray-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Email</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Your email registered in NTHU Academic System if we need to
                contact you urgently
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <svg
              className="w-6 h-6 text-gray-500 dark:text-gray-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 14l9-5-9-5-9 5 9 5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
              />
            </svg>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Student Status
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {
                  "Whether you're currently in school to provide relevant features"
                }
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            By clicking proceed, you agree to NTHUMods storing the above data as
            protected by Personal Data Protection Act.
          </p>
        </div>

        <div className="flex space-x-4">
          <button
            className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            onclick={() => window.history.back()}
          >
            Cancel
          </button>
          <a
            href={authUrl}
            className="flex-1 bg-purple-600 text-white text-center py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
          >
            Proceed
          </a>
        </div>
      </div>
    </div>
  );
};

export const AuthConfirmation: FC<{
  client_id: string;
  redirect_uri: string;
  scope: string;
  state: string;
  response_type?: string;
  nonce?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  ui_locales?: string;
}> = ({
  client_id,
  redirect_uri,
  scope,
  state: clientState,
  response_type,
  nonce,
  code_challenge,
  code_challenge_method,
  ui_locales,
}) => {
  // Construct the OAuth URL with all parameters
  const authUrl = new URL("https://auth.nthumods.com/authorize");
  authUrl.searchParams.append("client_id", client_id);
  authUrl.searchParams.append("redirect_uri", redirect_uri);
  authUrl.searchParams.append("scope", scope);
  authUrl.searchParams.append("state", clientState);
  authUrl.searchParams.append("acceptTos", "true");
  if (response_type)
    authUrl.searchParams.append("response_type", response_type);
  if (nonce) authUrl.searchParams.append("nonce", nonce);
  if (code_challenge)
    authUrl.searchParams.append("code_challenge", code_challenge);
  if (code_challenge_method)
    authUrl.searchParams.append("code_challenge_method", code_challenge_method);
  // if includes zh, set uiLocale to zh else en
  const lang = ui_locales?.toLowerCase().includes("zh") ? "zh" : "en";
  if (lang === "zh") authUrl.searchParams.append("ui_locales", "zh");
  else authUrl.searchParams.append("ui_locales", "en");

  return (
    <Layout>
      {lang === "zh" ? (
        <AuthPageZH authUrl={authUrl.toString()} />
      ) : (
        <AuthPageEN authUrl={authUrl.toString()} />
      )}
    </Layout>
  );
};
