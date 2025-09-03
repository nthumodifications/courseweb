// Shared configuration for CoursWeb applications

// Core configuration files
export * from "./constants";
export * from "./supabase";

// Environment configuration helpers
export const isDevelopment = process.env.NODE_ENV === "development";
export const isProduction = process.env.NODE_ENV === "production";
export const isTest = process.env.NODE_ENV === "test";

// Feature flags placeholder
export const featureFlags = {
  enableExperimentalFeatures: process.env.ENABLE_EXPERIMENTAL === "true",
  enableDebugMode: isDevelopment,
  enableTelemetry: process.env.ENABLE_TELEMETRY !== "false",
};
