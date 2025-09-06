/**
 * @fileoverview
 * Build and deployment scripts for CourseWeb monorepo
 * Provides utilities for automating build processes and import management
 */

import { execSync } from "child_process";
import path from "path";

// Import management utilities
export const updateUIImports = () => {
  const scriptPath = path.join(__dirname, "update-ui-imports.js");
  execSync(`node ${scriptPath}`, { stdio: "inherit" });
};

export const updateWebImports = () => {
  const scriptPath = path.join(__dirname, "update-web-imports.js");
  execSync(`node ${scriptPath}`, { stdio: "inherit" });
};

// Utility function to run all import updates
export const updateAllImports = () => {
  console.log("Updating all import paths...");
  updateUIImports();
  updateWebImports();
  console.log("All import updates completed!");
};

// Build orchestration utilities
export const buildPackage = (packageName: string) => {
  console.log(`Building package: ${packageName}`);
  execSync(`npx turbo run build --filter=${packageName}`, { stdio: "inherit" });
};

export const buildAll = () => {
  console.log("Building all packages...");
  execSync("npx turbo run build", { stdio: "inherit" });
};

// Deployment utilities
export const deployWeb = () => {
  console.log("Deploying web application...");
  execSync("npx turbo run build --filter=@courseweb/web", { stdio: "inherit" });
  // Add deployment logic here
};

// Development utilities
export const devAll = () => {
  console.log("Starting development mode for all packages...");
  execSync("npx turbo run dev", { stdio: "inherit" });
};

// Cleanup utilities
export const cleanAll = () => {
  console.log("Cleaning all build artifacts...");
  execSync("npx turbo run clean", { stdio: "inherit" });
};

// Linting utilities
export const lintAll = () => {
  console.log("Linting all packages...");
  execSync("npx turbo run lint", { stdio: "inherit" });
};

// Type checking utilities
export const typeCheckAll = () => {
  console.log("Type checking all packages...");
  execSync("npx turbo run type-check", { stdio: "inherit" });
};

// Combined quality checks
export const runQualityChecks = () => {
  console.log("Running quality checks...");
  lintAll();
  typeCheckAll();
  console.log("Quality checks completed!");
};
