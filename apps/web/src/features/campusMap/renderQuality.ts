type DeviceHints = {
  coarsePointer: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
};

export function getCampusRenderQuality(hints: DeviceHints) {
  const limited =
    (hints.deviceMemory !== undefined && hints.deviceMemory <= 4) ||
    (hints.hardwareConcurrency !== undefined && hints.hardwareConcurrency <= 4);
  const mobile = hints.coarsePointer;
  return {
    maxDpr: limited ? 1 : mobile ? 1.25 : 1.5,
    maxLabels: limited || mobile ? 24 : 40,
    powerPreference:
      mobile || limited ? ("low-power" as const) : ("default" as const),
  };
}

export function readCampusDeviceHints(): DeviceHints {
  return {
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    deviceMemory: (navigator as Navigator & { deviceMemory?: number })
      .deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
  };
}
