/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_COURSEWEB_API_URL: string;
  readonly VITE_ENABLE_LOCAL_SEARCH?: string;
  readonly VITE_NTHUMODS_AUTH_URL: string;
  readonly VITE_AUTH_CLIENT_ID: string;
  readonly VITE_NTHUMODS_AUTH_REDIRECT: string;
  readonly VITE_NTHUMODS_AUTH_SILENT_REDIRECT: string;
  readonly VITE_TURNSTILE_SITE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "opencc-js/from/*" {
  const dictionary: readonly import("opencc-js/core").DictGroup[];
  export default dictionary;
}

declare module "opencc-js/to/*" {
  const dictionary: readonly import("opencc-js/core").DictGroup[];
  export default dictionary;
}

declare module "opencc-js/dict/*" {
  const dictionary: import("opencc-js/core").DictLike;
  export default dictionary;
}
