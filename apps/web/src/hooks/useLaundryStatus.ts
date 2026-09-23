import { useCallback, useEffect, useRef, useState } from "react";
import { LAUNDRY_MACHINES } from "@/const/laundry-machines";
import { LaundryMqttClient } from "@/lib/laundry-mqtt";
import {
  decodeLaundryStatus,
  shouldAcceptLaundryStatus,
  type LaundryMachineStatus,
} from "@/lib/laundry-status";

export type LaundryConnectionState =
  | "connecting"
  | "live"
  | "reconnecting"
  | "error";

const machineTypes = new Map(
  LAUNDRY_MACHINES.map((machine) => [machine.mac, machine.type]),
);

export function useLaundryStatus() {
  const [statuses, setStatuses] = useState<
    Record<string, LaundryMachineStatus>
  >({});
  const [connectionState, setConnectionState] =
    useState<LaundryConnectionState>("connecting");
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const clientRef = useRef<LaundryMqttClient | null>(null);
  const hasReceivedStatus = useRef(false);
  const latestStatusesRef = useRef<Record<string, LaundryMachineStatus>>({});

  useEffect(() => {
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let hiddenTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let suspended = false;

    const clearReconnect = () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
    };

    const connect = () => {
      if (disposed || suspended) return;
      if (document.visibilityState === "hidden") {
        // Picked up again by handleVisibility once the tab is shown.
        suspended = true;
        return;
      }
      clearReconnect();
      setConnectionState(attempt === 0 ? "connecting" : "reconnecting");
      const client = new LaundryMqttClient({
        macs: LAUNDRY_MACHINES.map((machine) => machine.mac),
        onConnected: () => {
          attempt = 0;
          setConnectionState("live");
        },
        onClosed: () => {
          if (disposed || suspended) return;
          if (document.visibilityState === "hidden") {
            suspended = true;
            return;
          }
          setConnectionState(
            hasReceivedStatus.current ? "reconnecting" : "error",
          );
          const delay = Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5));
          attempt += 1;
          reconnectTimer = setTimeout(connect, delay);
        },
        onError: () => {
          if (!disposed) setConnectionState("error");
        },
        onStatus: (mac, payload, receivedAtMs) => {
          const decoded = decodeLaundryStatus(
            payload,
            receivedAtMs,
            machineTypes.get(mac),
          );
          if (!decoded) return;
          if (
            !shouldAcceptLaundryStatus(decoded, latestStatusesRef.current[mac])
          )
            return;
          latestStatusesRef.current[mac] = decoded;
          hasReceivedStatus.current = true;
          setStatuses((current) => ({ ...current, [mac]: decoded }));
          setLastMessageAt(receivedAtMs);
        },
      });
      clientRef.current = client;
      client.connect();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenTimer = setTimeout(() => {
          suspended = true;
          clearReconnect();
          clientRef.current?.close();
          clientRef.current = null;
        }, 60_000);
        return;
      }
      if (hiddenTimer) clearTimeout(hiddenTimer);
      hiddenTimer = null;
      if (suspended) {
        suspended = false;
        attempt = 0;
        connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    connect();

    return () => {
      disposed = true;
      clearReconnect();
      if (hiddenTimer) clearTimeout(hiddenTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      clientRef.current?.close();
      clientRef.current = null;
    };
  }, [retryNonce]);

  const retry = useCallback(() => {
    clientRef.current?.close();
    clientRef.current = null;
    setRetryNonce((nonce) => nonce + 1);
  }, []);

  return { statuses, connectionState, lastMessageAt, retry };
}
