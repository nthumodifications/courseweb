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

const UserIcon: FC = () => (
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
);

const MailIcon: FC = () => (
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
);

const AcademicIcon: FC = () => (
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
);

const ClockIcon: FC = () => (
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
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CalendarIcon: FC = () => (
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
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const BookIcon: FC = () => (
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
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
    />
  </svg>
);

const KeyIcon: FC = () => (
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
      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
    />
  </svg>
);

type ScopeCopy = {
  icon: FC;
  title: { en: string; zh: string };
  detail: { en: string; zh: string };
};

/**
 * What each scope actually hands over, in the user's words rather than the
 * protocol's. `openid` is deliberately absent: it carries the user id, which is
 * covered by the profile entry and would otherwise read as an empty promise.
 */
const SCOPE_COPY: Record<string, ScopeCopy> = {
  profile: {
    icon: UserIcon,
    title: { en: "User ID & Name", zh: "學號/教職員編號與姓名" },
    detail: {
      en: "Your Student ID (or Employee ID) and your name in English and Chinese",
      zh: "您的學號（或教職員編號）以及中英文姓名",
    },
  },
  email: {
    icon: MailIcon,
    title: { en: "Email", zh: "電子郵件" },
    detail: {
      en: "The email registered in the NTHU Academic System",
      zh: "您於清華大學學務系統中註冊的電子郵件",
    },
  },
  inschool: {
    icon: AcademicIcon,
    title: { en: "Student Status", zh: "學生身份狀態" },
    detail: {
      en: "Whether you are currently enrolled at NTHU",
      zh: "您是否為在校學生",
    },
  },
  offline_access: {
    icon: ClockIcon,
    title: { en: "Stay signed in", zh: "保持登入狀態" },
    detail: {
      en: "Reconnect on your behalf without asking you to sign in again",
      zh: "在您未主動登入的情況下代您重新連線",
    },
  },
  kv: {
    icon: BookIcon,
    title: { en: "Courses & preferences", zh: "課表與偏好設定" },
    detail: {
      en: "Read and change your saved courses, favourites and timetable settings",
      zh: "讀取與修改您已儲存的課程、收藏與課表設定",
    },
  },
  calendar: {
    icon: CalendarIcon,
    title: { en: "Calendar", zh: "行事曆" },
    detail: {
      en: "Read and change the events in your NTHUMods calendar",
      zh: "讀取與修改您 NTHUMods 行事曆中的活動",
    },
  },
  planner: {
    icon: KeyIcon,
    title: { en: "Graduation planner", zh: "畢業規劃" },
    detail: {
      en: "Read and change your graduation planning data",
      zh: "讀取與修改您的畢業規劃資料",
    },
  },
};

const ScopeRow: FC<{ scope: string; lang: "en" | "zh" }> = ({
  scope,
  lang,
}) => {
  const copy = SCOPE_COPY[scope];
  if (!copy) return null;
  const Icon = copy.icon;
  return (
    <div className="flex items-start space-x-3">
      <Icon />
      <div>
        <p className="font-medium text-gray-900 dark:text-white">
          {copy.title[lang]}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {copy.detail[lang]}
        </p>
      </div>
    </div>
  );
};

const COPY = {
  en: {
    firstPartyHeading: "Agree to NTHUMods SSO",
    firstPartyIntro:
      "NTHUMods will collect and store specific information from your NTHU account to provide seamless authentication across all NTHUMods services.",
    thirdPartyIntro: (name: string) =>
      `${name} is not part of NTHUMods. Approving this lets it read the information below from your NTHU account.`,
    stored: "What we will store",
    shared: "What will be shared",
    tos: "By clicking proceed, you agree to NTHUMods storing the above data as protected by Personal Data Protection Act.",
    revoke:
      "You can withdraw this at any time from your NTHUMods account settings.",
    cancel: "Cancel",
    proceed: "Proceed",
    wants: (name: string) => `${name} wants to sign you in`,
  },
  zh: {
    firstPartyHeading: "同意使用 NTHUMods 單一簽入服務",
    firstPartyIntro:
      "NTHUMods 將蒐集並儲存您於清華大學帳戶中的特定個人資料，以提供所有 NTHUMods 服務的無縫認證體驗。",
    thirdPartyIntro: (name: string) =>
      `${name} 並非 NTHUMods 的一部分。同意後，該網站將可讀取下列您清華大學帳戶中的資料。`,
    stored: "我們將儲存的資料",
    shared: "將被分享的資料",
    tos: "點擊「繼續」即表示您同意 NTHUMods 依據《個人資料保護法》儲存上述資料。",
    revoke: "您可以隨時在 NTHUMods 帳戶設定中撤銷此授權。",
    cancel: "取消",
    proceed: "繼續",
    wants: (name: string) => `${name} 要求使用您的 NTHUMods 帳戶登入`,
  },
} as const;

export const AuthConfirmation: FC<{
  approveUrl: string;
  denyUrl: string;
  lang: "en" | "zh";
  scopes: string[];
  clientName: string;
  clientUri?: string | null;
  firstParty: boolean;
}> = ({
  approveUrl,
  denyUrl,
  lang,
  scopes,
  clientName,
  clientUri,
  firstParty,
}) => {
  const t = COPY[lang];

  // `profile` also carries the in-school flag, which users read as a separate
  // disclosure rather than part of their name.
  const shown = scopes.includes("profile")
    ? [...scopes, "inschool"]
    : [...scopes];
  const listed = shown.filter((scope) => scope in SCOPE_COPY);

  return (
    <Layout>
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
              {firstParty ? t.firstPartyHeading : t.wants(clientName)}
            </h2>
            {!firstParty && clientUri ? (
              <p className="text-sm font-medium text-purple-700 dark:text-purple-400 break-all">
                {clientUri}
              </p>
            ) : null}
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              {firstParty ? t.firstPartyIntro : t.thirdPartyIntro(clientName)}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {firstParty ? t.stored : t.shared}
            </h3>
            {listed.map((scope) => (
              <ScopeRow key={scope} scope={scope} lang={lang} />
            ))}
          </div>

          <div className="flex items-center space-x-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {firstParty ? t.tos : t.revoke}
            </p>
          </div>

          <div className="flex space-x-4">
            <a
              href={denyUrl}
              className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-center py-2 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {t.cancel}
            </a>
            <a
              href={approveUrl}
              className="flex-1 bg-purple-600 text-white text-center py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
            >
              {t.proceed}
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
};
