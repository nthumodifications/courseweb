export const createAuthTestEnvironment = (
  createFetch: () => typeof globalThis.fetch,
) => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  return {
    setup: () => {
      Object.assign(process.env, {
        NTHUMODS_AUTH_INTROSPECTION_URL: "https://auth.example.com/introspect",
        NTHUMODS_AUTH_CLIENT_ID: "client",
        NTHUMODS_AUTH_CLIENT_SECRET: "secret",
      });
      globalThis.fetch = createFetch();
    },
    restore: () => {
      globalThis.fetch = originalFetch;
      for (const key of Object.keys(process.env)) {
        if (!(key in originalEnv)) delete process.env[key];
      }
      Object.assign(process.env, originalEnv);
    },
  };
};
