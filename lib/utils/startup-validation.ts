import { validateEnv } from "./env";

/**
 * Validates environment variables and other startup requirements
 * Call this at application startup
 */
export function validateStartup(): void {
  // Validate required environment variables
  try {
    validateEnv(['AUTH_SECRET', 'DATABASE_URL']);
  } catch (error) {
    console.error("❌ Startup validation failed:", error);
    throw error;
  }
  
  // Additional validations can be added here
  console.log("✅ Startup validation passed");
}
