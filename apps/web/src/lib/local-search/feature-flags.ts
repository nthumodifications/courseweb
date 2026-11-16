export const isLocalSearchEnabled = (
  env: Record<string, string | undefined> = {},
) =>
  !["0", "false"].includes(
    env.VITE_ENABLE_LOCAL_SEARCH?.trim().toLowerCase() ?? "",
  );
