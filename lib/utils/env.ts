/**
 * Safely get and trim environment variables
 * Prevents issues with trailing newlines/whitespace from Vercel or other platforms
 * 
 * @param key - Environment variable key
 * @param defaultValue - Optional default value if env var is not set
 * @returns Trimmed environment variable value or default value (also trimmed)
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    return '';
  }
  return value.trim();
}

/**
 * Get environment variable as boolean
 * Returns true if value is 'true', '1', 'yes' (case-insensitive), false otherwise
 */
export function getEnvBool(key: string, defaultValue: boolean = false): boolean {
  const value = getEnv(key);
  if (!value) {
    return defaultValue;
  }
  return ['true', '1', 'yes'].includes(value.toLowerCase());
}

/**
 * Validates that all required environment variables are present
 * Throws an error if any required variables are missing
 * 
 * @param required - Array of required environment variable keys
 * @throws Error if any required variables are missing
 */
export function validateEnv(required: string[] = ['AUTH_SECRET', 'DATABASE_URL']): void {
  const missing = required.filter(key => !process.env[key] || process.env[key]?.trim() === '');
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env file or environment configuration.`
    );
  }
}

