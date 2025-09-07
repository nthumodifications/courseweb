// Client helper utilities for CoursWeb API types
// This provides typed Hono client factory functions for easy consumption

import { hc } from "hono/client";
import type { MainApiApp } from "./api";
import type { SecureApiApp } from "./secure-api";

/**
 * Creates a typed Hono client for the main CoursWeb API
 * @param baseUrl - The base URL for the API (e.g., 'https://api.nthumods.com')
 * @returns Typed Hono client for the main API
 */
export function createMainApiClient(baseUrl: string) {
  return hc<MainApiApp>(baseUrl);
}

/**
 * Creates a typed Hono client for the secure CoursWeb API
 * @param baseUrl - The base URL for the secure API (e.g., 'https://auth.nthumods.com')
 * @returns Typed Hono client for the secure API
 */
export function createSecureApiClient(baseUrl: string) {
  return hc<SecureApiApp>(baseUrl);
}

// Type definitions for the client instances
export type MainApiClient = ReturnType<typeof createMainApiClient>;
export type SecureApiClient = ReturnType<typeof createSecureApiClient>;

// Convenience type aliases
export type ApiClient = MainApiClient;
export type AuthClient = SecureApiClient;

// Re-export all types
export type { MainApiApp, MainApi } from "./api";
export type { SecureApiApp, SecureApi } from "./secure-api";

/**
 * Configuration interface for API clients
 */
export interface ApiClientConfig {
  mainApiUrl?: string;
  secureApiUrl?: string;
}

/**
 * Creates both API clients with the provided URLs
 * @param config - Configuration object with API URLs
 * @returns Object with both API clients
 */
export function createApiClients(config: ApiClientConfig) {
  const clients = {} as {
    api?: MainApiClient;
    auth?: SecureApiClient;
  };

  if (config.mainApiUrl) {
    clients.api = createMainApiClient(config.mainApiUrl);
  }

  if (config.secureApiUrl) {
    clients.auth = createSecureApiClient(config.secureApiUrl);
  }

  return clients;
}
