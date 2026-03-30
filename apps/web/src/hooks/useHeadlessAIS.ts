import { useCallback, useReducer, useRef } from "react";
import { useLocalStorage } from "usehooks-ts";
import type { HeadlessAISStorage, UserJWTDetails } from "@/types/headless_ais";
import { proxyLogin, proxyRefresh, proxyLogout } from "@/lib/headless-ais-api";

const STORAGE_KEY = "headless_ais";
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

// --- State machine ---

type State =
  | { status: "idle" }
  | { status: "logging_in" }
  | { status: "refreshing" }
  | { status: "logging_out" }
  | { status: "error"; message: string };

type Action =
  | { type: "LOGIN_START" }
  | { type: "LOGIN_SUCCESS" }
  | { type: "LOGIN_ERROR"; message: string }
  | { type: "REFRESH_START" }
  | { type: "REFRESH_SUCCESS" }
  | { type: "REFRESH_ERROR"; message: string }
  | { type: "LOGOUT_START" }
  | { type: "LOGOUT_DONE" }
  | { type: "CLEAR_ERROR" };

function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case "LOGIN_START":
      return { status: "logging_in" };
    case "LOGIN_SUCCESS":
      return { status: "idle" };
    case "LOGIN_ERROR":
      return { status: "error", message: action.message };
    case "REFRESH_START":
      return { status: "refreshing" };
    case "REFRESH_SUCCESS":
      return { status: "idle" };
    case "REFRESH_ERROR":
      return { status: "error", message: action.message };
    case "LOGOUT_START":
      return { status: "logging_out" };
    case "LOGOUT_DONE":
      return { status: "idle" };
    case "CLEAR_ERROR":
      return { status: "idle" };
  }
}

// --- Hook ---

export function useHeadlessAIS() {
  const [ais, setAis] = useLocalStorage<HeadlessAISStorage>(STORAGE_KEY, {
    enabled: false,
  });
  const [state, dispatch] = useReducer(reducer, { status: "idle" });

  // Dedup lock: prevents multiple concurrent refresh calls from racing
  const refreshPromiseRef = useRef<Promise<string> | null>(null);

  // In-memory credentials for client-side refresh (never persisted to disk)
  // Cleared automatically on tab close / page reload
  const memoryCredsRef = useRef<{
    studentid: string;
    password: string;
  } | null>(null);

  // Tracks whether a logout was initiated, so in-flight refreshes don't resurrect state
  const loggedOutRef = useRef(false);

  const isConnected = ais.enabled;
  const user: UserJWTDetails | null = ais.enabled ? ais.user : null;
  const loading =
    state.status === "logging_in" ||
    state.status === "refreshing" ||
    state.status === "logging_out";
  const error = state.status === "error" ? state.message : null;

  const login = useCallback(
    async (
      studentid: string,
      password: string,
      storeCredentials = false,
    ): Promise<void> => {
      loggedOutRef.current = false;
      dispatch({ type: "LOGIN_START" });
      try {
        const result = await proxyLogin(studentid, password, storeCredentials);

        // If user chose NOT to store on server, keep in memory for client-side refresh
        if (!storeCredentials) {
          memoryCredsRef.current = { studentid, password };
        } else {
          memoryCredsRef.current = null;
        }

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
        dispatch({ type: "LOGIN_SUCCESS" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Login failed.";
        dispatch({ type: "LOGIN_ERROR", message: msg });
        throw err;
      }
    },
    [setAis],
  );

  /**
   * Returns a valid ACIXSTORE, auto-refreshing if the session has expired.
   * Supports two refresh strategies:
   * 1. Server-side: httpOnly cookie carries credential_token → proxyRefresh()
   * 2. Client-side: in-memory credentials (tab-scoped) → proxyLogin() again
   * Deduplicates concurrent calls.
   */
  const getACIXSTORE = useCallback(async (): Promise<string> => {
    if (!ais.enabled) throw new Error("Not connected to CCXP");

    const isStale = Date.now() - ais.lastUpdated > SESSION_TTL;

    if (ais.ACIXSTORE && !ais.expired && !isStale) {
      return ais.ACIXSTORE;
    }

    const canServerRefresh = ais.hasStoredCredentials;
    const canClientRefresh = !!memoryCredsRef.current;

    if (canServerRefresh || canClientRefresh) {
      // Dedup: if a refresh is already in-flight, wait for it
      if (refreshPromiseRef.current) {
        return refreshPromiseRef.current;
      }

      const refreshPromise = (async () => {
        dispatch({ type: "REFRESH_START" });
        try {
          let newACIXSTORE: string;

          if (canServerRefresh) {
            const result = await proxyRefresh();
            newACIXSTORE = result.ACIXSTORE;
          } else {
            // Client-side refresh: re-login with in-memory credentials
            const creds = memoryCredsRef.current!;
            const result = await proxyLogin(
              creds.studentid,
              creds.password,
              false,
            );
            newACIXSTORE = result.ACIXSTORE;
          }

          // Guard against logout racing with refresh
          if (loggedOutRef.current) {
            throw new Error("Logged out during refresh.");
          }

          setAis({
            ...ais,
            ACIXSTORE: newACIXSTORE,
            lastUpdated: Date.now(),
            expired: false,
          });
          dispatch({ type: "REFRESH_SUCCESS" });
          return newACIXSTORE;
        } catch {
          if (!loggedOutRef.current) {
            setAis({ ...ais, expired: true, hasStoredCredentials: false });
            memoryCredsRef.current = null;
            dispatch({
              type: "REFRESH_ERROR",
              message: "Session expired. Please log in again.",
            });
          }
          throw new Error("Session expired. Please log in again.");
        } finally {
          refreshPromiseRef.current = null;
        }
      })();

      refreshPromiseRef.current = refreshPromise;
      return refreshPromise;
    }

    // No refresh strategy available
    setAis({ ...ais, expired: true });
    throw new Error("Session expired. Please log in again.");
  }, [ais, setAis]);

  const logout = useCallback(async (): Promise<void> => {
    loggedOutRef.current = true;
    memoryCredsRef.current = null;
    dispatch({ type: "LOGOUT_START" });
    try {
      await proxyLogout();
    } catch {
      // Best-effort: clear local state regardless
    }
    setAis({ enabled: false });
    dispatch({ type: "LOGOUT_DONE" });
  }, [setAis]);

  return {
    ais,
    user,
    isConnected,
    loading,
    error,
    /** Current state machine status */
    status: state.status,
    login,
    logout,
    getACIXSTORE,
    clearError: () => dispatch({ type: "CLEAR_ERROR" }),
    invalidateSession: () => {
      if (ais.enabled) setAis({ ...ais, expired: true });
    },
  };
}
