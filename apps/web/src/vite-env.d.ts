/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_COURSEWEB_API_URL: string;
  readonly VITE_ALGOLIA_APP_ID: string;
  readonly VITE_ALGOLIA_SEARCH_KEY: string;
  readonly VITE_NTHUMODS_AUTH_URL: string;
  readonly VITE_AUTH_CLIENT_ID: string;
  readonly VITE_NTHUMODS_AUTH_REDIRECT: string;
  readonly VITE_NTHUMODS_AUTH_SILENT_REDIRECT: string;
  readonly VITE_TURNSTILE_SITE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
