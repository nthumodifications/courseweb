// Types for the main CoursWeb API service
// This imports the actual Hono app from the API service for proper type inference

// Import the actual app type from the API service
export type MainApiApp = typeof import("@courseweb/api").app;

// Re-export for convenience
export type MainApi = MainApiApp;
