// Types for the CoursWeb Secure API service
// This imports the actual Hono app from the secure API service for proper type inference

// Import the actual app type from the secure API service
export type SecureApiApp = typeof import("@courseweb/secure-api").app;

// Re-export for convenience
export type SecureApi = SecureApiApp;
