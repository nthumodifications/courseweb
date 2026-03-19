import { useCallback, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import type { HeadlessAISStorage, UserJWTDetails } from "@/types/headless_ais";
import { proxyLogin, proxyRefresh, proxyLogout } from "@/lib/headless-ais-api";

const STORAGE_KEY = "headless_ais";

export function useHeadlessAIS() {
  const [ais, setAis] = useLocalStorage<HeadlessAISStorage>(STORAGE_KEY, {
    enabled: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected = ais.enabled;
  const user: UserJWTDetails | null = ais.enabled ? ais.user : null;

  const login = useCallback(
    async (
      studentid: string,
      password: string,
      storeCredentials = false,
    ): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const result = await proxyLogin(studentid, password, storeCredentials);
        setAis({
          enabled: true,
          studentid,
          user: result.data,
          ACIXSTORE: result.ACIXSTORE,
          credentialToken: result.credential_token,
          lastUpdated: Date.now(),
          expired: false,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Login failed.";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setAis],
  );

  /**
   * Returns a valid ACIXSTORE, auto-refreshing if the session has expired
   * and a credentialToken is stored. Throws if re-login is required manually.
   */
  const getACIXSTORE = useCallback(async (): Promise<string> => {
    if (!ais.enabled) throw new Error("Not connected to CCXP");

    // Return cached token if still fresh (assume 30-min session)
    const SESSION_TTL = 30 * 60 * 1000;
    const isStale = Date.now() - ais.lastUpdated > SESSION_TTL;

    if (ais.ACIXSTORE && !ais.expired && !isStale) {
      return ais.ACIXSTORE;
    }

    // Auto-refresh if we have a stored credential token
    if (ais.credentialToken) {
      setLoading(true);
      try {
        const result = await proxyRefresh(ais.credentialToken);
        setAis({
          ...ais,
          ACIXSTORE: result.ACIXSTORE,
          credentialToken: result.credential_token,
          lastUpdated: Date.now(),
          expired: false,
        });
        return result.ACIXSTORE;
      } catch {
        setAis({ ...ais, expired: true });
        throw new Error("Session expired. Please log in again.");
      } finally {
        setLoading(false);
      }
    }

    // Session-only mode: can't auto-refresh
    setAis({ ...ais, expired: true });
    throw new Error("Session expired. Please log in again.");
  }, [ais, setAis]);

  const logout = useCallback(async (): Promise<void> => {
    if (ais.enabled && ais.credentialToken) {
      try {
        await proxyLogout(ais.credentialToken);
      } catch {
        // Best-effort: clear local state regardless
      }
    }
    setAis({ enabled: false });
    setError(null);
  }, [ais, setAis]);

  return {
    ais,
    user,
    isConnected,
    loading,
    error,
    login,
    logout,
    getACIXSTORE,
    /** Call this when a CCXP data endpoint returns an auth error */
    invalidateSession: () => {
      if (ais.enabled) setAis({ ...ais, expired: true });
    },
  };
}
