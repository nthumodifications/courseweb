export function useStructuredData<T>(generator: () => T | null): T | null {
  try {
    return generator();
  } catch (error) {
    console.error("Structured data generation failed:", error);
    return null;
  }
}
