import { useCallback, useEffect, useMemo } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
  DEFAULT_DASHBOARD_CONFIG,
  mergeDashboardConfig,
  needsDashboardConfigMigration,
  type DashboardConfig,
} from "@/types/widget";

export const useDashboardConfig = () => {
  const [storedConfig, setStoredConfig] = useLocalStorage<DashboardConfig>(
    "widget_config_v1",
    DEFAULT_DASHBOARD_CONFIG,
  );
  const config = useMemo(
    () => mergeDashboardConfig(storedConfig),
    [storedConfig],
  );

  useEffect(() => {
    if (needsDashboardConfigMigration(storedConfig)) {
      setStoredConfig(config);
    }
  }, [config, setStoredConfig, storedConfig]);

  const setConfig = useCallback(
    (
      update:
        | DashboardConfig
        | ((previous: DashboardConfig) => DashboardConfig),
    ) => {
      setStoredConfig((previous) => {
        const migrated = mergeDashboardConfig(previous);
        const next = typeof update === "function" ? update(migrated) : update;
        return mergeDashboardConfig(next);
      });
    },
    [setStoredConfig],
  );

  return [config, setConfig] as const;
};
