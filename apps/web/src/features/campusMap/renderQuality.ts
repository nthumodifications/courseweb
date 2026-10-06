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
  let maxDpr = 1.5;
  if (mobile) maxDpr = 1.25;
  if (limited) maxDpr = 1;
  const maxLabels = limited || mobile ? 24 : 40;
  const powerPreference = mobile || limited ? "low-power" : "default";
  return { maxDpr, maxLabels, powerPreference } as const;
}

export function readCampusDeviceHints(): DeviceHints {
  return {
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    deviceMemory: (navigator as Navigator & { deviceMemory?: number })
      .deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
  };
}
