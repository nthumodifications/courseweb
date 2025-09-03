// Shared configuration for CoursWeb applications
// TODO: Move configuration from src/config/ here in Phase 5

// Placeholder export to prevent build errors
export const PLACEHOLDER_CONFIG = {
  appName: "CoursWeb",
  version: "0.1.0",
};

// Environment configuration helpers
export const isDevelopment = process.env.NODE_ENV === "development";
export const isProduction = process.env.NODE_ENV === "production";
export const isTest = process.env.NODE_ENV === "test";

// Database configuration placeholder
export const dbConfig = {
  url: process.env.DATABASE_URL || "",
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || "10"),
};

// Supabase configuration placeholder
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
};

// Feature flags placeholder
export const featureFlags = {
  enableExperimentalFeatures: process.env.ENABLE_EXPERIMENTAL === "true",
  enableDebugMode: isDevelopment,
  enableTelemetry: process.env.ENABLE_TELEMETRY !== "false",
};
