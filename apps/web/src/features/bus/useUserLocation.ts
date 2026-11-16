import { useCallback, useEffect, useRef, useState } from "react";

export type UserLocationStatus =
  | "idle"
  | "locating"
  | "ready"
  | "denied"
  | "unavailable";

/**
 * The browser location is used only on the device to find the nearest stop;
 * it is never sent anywhere. It is requested on demand, or silently when the
 * user has already granted permission to this site.
 */
export function useUserLocation() {
  const [position, setPosition] = useState<{ lat: number; lon: number }>();
  const [status, setStatus] = useState<UserLocationStatus>("idle");
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (result) => {
        if (!active.current) return;
        setPosition({
          lat: result.coords.latitude,
          lon: result.coords.longitude,
        });
        setStatus("ready");
      },
      (error) => {
        if (!active.current) return;
        setStatus(
          error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        );
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query)
      return;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((permission) => {
        if (active.current && permission.state === "granted") request();
      })
      .catch(() => undefined);
  }, [request]);

  return { position, status, request };
}
