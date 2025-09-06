// Main export file for CoursWeb API Types package
// This package provides TypeScript types for all CoursWeb API services

// Export main API types
export type { MainApiApp, MainApi } from "./api";

// Export secure API types
export type { SecureApiApp, SecureApi } from "./secure-api";

// Export client utilities and factory functions
export * from "./client";

// For consumers who want to use hono/client with these types:
// import { createMainApiClient, createSecureApiClient } from '@courseweb/api-types';
// const apiClient = createMainApiClient('https://api.example.com');
// const authClient = createSecureApiClient('https://auth.example.com');
