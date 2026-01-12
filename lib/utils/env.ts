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

