import { useState, useEffect } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@courseweb/ui";
import { event } from "@/lib/gtag";
import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";
import { SettingItem } from "./SettingItem";
import { Check } from "lucide-react";

const ENTRANCE_YEARS = ["114", "113", "112", "111", "110", "109", "108", "107"];

interface DepartmentOption {
  college: string;
  department: string;
  availableYears: string[];
}

interface AISettings {
  department?: string;
  entranceYear?: string;
  useCustomKey: boolean;
  apiKey?: string;
}

export function AIPreferencesPanel() {
  const dict = useDictionary();
  const [settings, setSettings] = useState<AISettings>({
    useCustomKey: false,
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(
    null,
  );
  const [isSaved, setIsSaved] = useState(false);

  // Load departments from API using React Query
  const {
    data: departments = [],
    isLoading: isLoadingDepts,
    isError: isDepartmentsError,
  } = useQuery<DepartmentOption[]>({
    queryKey: ["graduation-departments"],
    queryFn: async () => {
      const response = await client.graduation.colleges.$get();
      const data = await response.json();

      // Flatten colleges->departments structure
      const deptOptions: DepartmentOption[] = [];
      data.colleges.forEach((college) => {
        college.departments.forEach((dept) => {
          deptOptions.push({
            college: college.name,
            department: dept.name,
            availableYears: dept.years.map((y) => y.year),
          });
        });
      });

      return deptOptions;
    },
  });

  // Load settings from localStorage
  useEffect(() => {
    try {
      const prefs = localStorage.getItem("ai_user_preferences");
      const aiSettings = localStorage.getItem("ai_settings");

      if (prefs) {
        const parsed = JSON.parse(prefs);
        setSettings((prev) => ({
          ...prev,
          department: parsed.department,
          entranceYear: parsed.entranceYear,
        }));
      }

      if (aiSettings) {
        const parsed = JSON.parse(aiSettings);
        setSettings((prev) => ({
          ...prev,
          useCustomKey: parsed.useCustomKey || false,
          apiKey: parsed.apiKey,
        }));
      }
    } catch {}
  }, []);

  // Save settings
  const saveSettings = () => {
    localStorage.setItem(
      "ai_user_preferences",
      JSON.stringify({
        department: settings.department,
        entranceYear: settings.entranceYear,
      }),
    );

    localStorage.setItem(
      "ai_settings",
      JSON.stringify({
        useCustomKey: settings.useCustomKey,
        apiKey: settings.useCustomKey ? settings.apiKey : undefined,
      }),
    );

    event({
      action: "save_ai_settings",
      category: "settings",
      label: settings.useCustomKey ? "custom_key" : "default_key",
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Test API key
  const testApiKey = async () => {
    if (!settings.apiKey) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_COURSEWEB_API_URL}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: "test" }],
            apiKey: settings.apiKey,
          }),
        },
      );

      setTestResult(response.ok ? "success" : "error");

      event({
        action: "test_api_key",
        category: "settings",
        label: response.ok ? "success" : "failed",
      });
    } catch {
      setTestResult("error");
      event({
        action: "test_api_key",
        category: "settings",
        label: "error",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="divide-y divide-border">
      <div className="py-4">
        <h3 className="text-sm font-bold">{dict.settings.ai.profile.title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {dict.settings.ai.profile.description}
        </p>
      </div>

      <SettingItem
        title={dict.settings.ai.profile.department.label}
        control={
          <Select
            value={settings.department}
            onValueChange={(v) => setSettings((s) => ({ ...s, department: v }))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue
                placeholder={dict.settings.ai.profile.department.placeholder}
              />
            </SelectTrigger>
            <SelectContent>
              {isLoadingDepts ? (
                <SelectItem value="loading" disabled>
                  {dict.common.loading}
                </SelectItem>
              ) : isDepartmentsError ? (
                <SelectItem value="error" disabled>
                  {dict.common.error}
                </SelectItem>
              ) : (
                departments.map((dept) => (
                  <SelectItem key={dept.department} value={dept.department}>
                    {dept.department} ({dept.college})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        }
      />

      <SettingItem
        title={dict.settings.ai.profile.entrance_year.label}
        control={
          <Select
            value={settings.entranceYear}
            onValueChange={(v) =>
              setSettings((s) => ({ ...s, entranceYear: v }))
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue
                placeholder={dict.settings.ai.profile.entrance_year.placeholder}
              />
            </SelectTrigger>
            <SelectContent>
              {ENTRANCE_YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <SettingItem
        title={dict.settings.ai.api_key.title}
        description={dict.settings.ai.api_key.description}
        control={
          <Switch
            checked={settings.useCustomKey}
            onCheckedChange={(v) =>
              setSettings((s) => ({ ...s, useCustomKey: v }))
            }
          />
        }
      />

      {settings.useCustomKey && (
        <>
          <SettingItem
            title={dict.settings.ai.api_key.label}
            control={
              <div className="flex w-[min(60vw,480px)] flex-col gap-2">
                <Input
                  id="apiKey"
                  type="password"
                  value={settings.apiKey || ""}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, apiKey: e.target.value }))
                  }
                  placeholder={dict.settings.ai.api_key.placeholder}
                />
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline underline-offset-4"
                >
                  {dict.settings.ai.api_key.get_key}
                </a>
              </div>
            }
          />

          <div className="flex flex-row flex-wrap items-center justify-end gap-4 py-4">
            <Button
              variant="outline"
              onClick={testApiKey}
              disabled={!settings.apiKey || isTesting}
            >
              {isTesting
                ? dict.settings.ai.api_key.testing
                : dict.settings.ai.api_key.test}
            </Button>

            {testResult === "success" && (
              <p className="text-sm text-primary">
                {dict.settings.ai.api_key.valid}
              </p>
            )}
            {testResult === "error" && (
              <p className="text-sm text-destructive">
                {dict.settings.ai.api_key.invalid}
              </p>
            )}
          </div>
        </>
      )}

      <div className="flex flex-row justify-end py-4">
        <Button onClick={saveSettings}>
          {isSaved && <Check className="h-4 w-4" />}
          {dict.settings.ai.save}
        </Button>
      </div>
    </div>
  );
}
