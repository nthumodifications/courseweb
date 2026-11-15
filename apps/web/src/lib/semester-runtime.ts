import apiClient from "@/config/api";
import { hydrateSemesters } from "@courseweb/shared";

const CACHE_KEY = "semester_info_v1";

const readCachedSemesters = () => {
  try {
    const value = localStorage.getItem(CACHE_KEY);
    if (!value) return;
    const rows: unknown = JSON.parse(value);
    if (Array.isArray(rows)) hydrateSemesters(rows);
  } catch {
    // The bundled semester table remains available when browser storage fails.
  }
};

const refreshSemesters = async () => {
  try {
    const response = await apiClient.semesters.$get();
    if (!response.ok)
      throw new Error(`Semester API returned ${response.status}`);
    const rows = await response.json();
    hydrateSemesters(rows);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(rows));
    } catch {
      // Keep using the in-memory response for this page load.
    }
  } catch (error) {
    console.warn("Semester refresh failed; using the cached list", error);
  }
};

readCachedSemesters();
void refreshSemesters();
