export interface College {
  name: string; // Chinese name, e.g., "電機資訊學院"
  nameEn?: string; // Optional English name
  url: string; // Link to college page
  departments: Department[];
}

export interface Department {
  name: string; // Chinese name, e.g., "資訊工程學系"
  nameEn?: string;
  years: YearInfo[];
}

export interface YearInfo {
  year: string; // e.g., "113", "112"
  pdfUrl: string; // Direct link to PDF
}

export interface GraduationRequirementsCache {
  colleges: College[];
  lastUpdated: string; // ISO date
}
