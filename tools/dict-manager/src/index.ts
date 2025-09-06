/**
 * @fileoverview
 * Dictionary management tools for CourseWeb i18n system
 * Provides utilities for managing translation dictionaries
 */

export { program as dictCli } from "./dict";

// Re-export common dictionary operations
export const createDictItem = async (key: string, zh: string, en: string) => {
  const { program } = await import("./dict");
  return program.parseAsync(["create", key, zh, en]);
};

export const removeDictItem = async (key: string) => {
  const { program } = await import("./dict");
  return program.parseAsync(["remove", key]);
};

export const moveDictItem = async (key: string, newKey: string) => {
  const { program } = await import("./dict");
  return program.parseAsync(["move", key, newKey]);
};
