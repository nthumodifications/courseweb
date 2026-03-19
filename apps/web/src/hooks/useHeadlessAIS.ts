import { useCallback, useRef, useState } from "react";
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

  // Dedup lock: prevents multiple concurrent refresh calls from racing
  const refreshPromiseRef = useRef<Promise<string> | null>(null);

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
          hasStoredCredentials: result.hasStoredCredentials,
          lastUpdated: Date.now(),
          expired: false,
          consentGiven: true,
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
   * and stored credentials exist (httpOnly cookie). Deduplicates concurrent calls.
   */
  const getACIXSTORE = useCallback(async (): Promise<string> => {
    if (!ais.enabled) throw new Error("Not connected to CCXP");

    const SESSION_TTL = 30 * 60 * 1000;
    const isStale = Date.now() - ais.lastUpdated > SESSION_TTL;

    if (ais.ACIXSTORE && !ais.expired && !isStale) {
      return ais.ACIXSTORE;
    }

    // Auto-refresh if server-side credentials are stored (cookie carries the token)
    if (ais.hasStoredCredentials) {
      // Dedup: if a refresh is already in-flight, wait for it
      if (refreshPromiseRef.current) {
        return refreshPromiseRef.current;
      }

      const refreshPromise = (async () => {
        setLoading(true);
        try {
          const result = await proxyRefresh();
          setAis({
            ...ais,
            ACIXSTORE: result.ACIXSTORE,
            lastUpdated: Date.now(),
            expired: false,
          });
          return result.ACIXSTORE;
        } catch {
          setAis({ ...ais, expired: true, hasStoredCredentials: false });
          throw new Error("Session expired. Please log in again.");
        } finally {
          setLoading(false);
          refreshPromiseRef.current = null;
        }
      })();

      refreshPromiseRef.current = refreshPromise;
      return refreshPromise;
    }

    // Session-only mode: can't auto-refresh
    setAis({ ...ais, expired: true });
    throw new Error("Session expired. Please log in again.");
  }, [ais, setAis]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await proxyLogout(); // Server reads cookie, deletes credential + clears cookie
    } catch {
      // Best-effort: clear local state regardless
    }
    setAis({ enabled: false });
    setError(null);
  }, [setAis]);

  return {
    ais,
    user,
    isConnected,
    loading,
    error,
    login,
    logout,
    getACIXSTORE,
    invalidateSession: () => {
      if (ais.enabled) setAis({ ...ais, expired: true });
    },
  };
}
