/**
 * Safely get and trim environment variables
 * Prevents issues with trailing newlines/whitespace from Vercel or other platforms
 * 
 * @param key - Environment variable key
 * @param defaultValue - Optional default value if env var is not set
 * @returns Trimmed environment variable value or default value (also trimmed)
 */
export function getEnv(key: string, defaultValue?: string): string {
  // #region agent log
  const rawValue = process.env[key];
  const hasRawValue = rawValue !== undefined;
  const rawValueLength = rawValue?.length ?? 0;
  const defaultValueProvided = defaultValue !== undefined;
  
  // Only log for VENICE_API_KEY to avoid noise
  if (key === 'VENICE_API_KEY') {
    console.log("[DEBUG] getEnv: Called for VENICE_API_KEY", {
      location: "lib/utils/env.ts:getEnv:entry",
      key,
      hasRawValue,
      rawValueLength,
      rawValuePrefix: rawValue?.substring(0, 10) || 'none',
      defaultValueProvided,
      defaultValueLength: defaultValue?.length || 0,
      allVeniceKeys: Object.keys(process.env).filter(k => k.toUpperCase().includes('VENICE')),
      timestamp: new Date().toISOString(),
      hypothesisId: "A",
    });
  }
  // #endregion
  
  const value = process.env[key] || defaultValue;
  
  // #region agent log
  const finalValue = value === undefined ? '' : value.trim();
  const finalValueLength = finalValue.length;
  
  // Only log for VENICE_API_KEY to avoid noise
  if (key === 'VENICE_API_KEY') {
    console.log("[DEBUG] getEnv: Returning for VENICE_API_KEY", {
      location: "lib/utils/env.ts:getEnv:exit",
      key,
      valueWasUndefined: value === undefined,
      rawValueLength: value?.length || 0,
      finalValueLength,
      isEmpty: finalValue === '',
      hasDefaultValue: !!defaultValue,
      timestamp: new Date().toISOString(),
      hypothesisId: "A",
    });
  }
  // #endregion
  
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

