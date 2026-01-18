/**
 * URL validation utilities to prevent SSRF attacks
 */

const ALLOWED_PROTOCOLS = ['http:', 'https:'];
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];

/**
 * Validates a URL to prevent SSRF attacks
 * Blocks:
 * - Non-HTTP/HTTPS protocols
 * - Localhost and loopback addresses
 * - Private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
 * 
 * @param url - URL string to validate
 * @returns true if URL is safe, false otherwise
 */
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return false;
    }
    
    // Block internal hosts
    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.includes(hostname)) {
      return false;
    }
    
    // Block private IP ranges (IPv4)
    const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Pattern);
    if (match) {
      const [, a, b, c, d] = match.map(Number);
      
      // 10.0.0.0/8
      if (a === 10) return false;
      
      // 172.16.0.0/12
      if (a === 172 && b >= 16 && b <= 31) return false;
      
      // 192.168.0.0/16
      if (a === 192 && b === 168) return false;
      
      // 127.0.0.0/8 (loopback)
      if (a === 127) return false;
      
      // 169.254.0.0/16 (link-local)
      if (a === 169 && b === 254) return false;
    }
    
    // Block IPv6 loopback and link-local
    if (hostname.startsWith('::1') || hostname.startsWith('fe80:')) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates and sanitizes a URL for safe use
 * Throws an error if URL is invalid or unsafe
 * 
 * @param url - URL string to validate
 * @throws Error if URL is invalid or unsafe
 */
export function validateAndSanitizeUrl(url: string): string {
  // First check if it's a valid URL format
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }
  
  // Validate for SSRF
  if (!validateUrl(url)) {
    throw new Error('URL is not allowed (SSRF protection)');
  }
  
  // Return the normalized URL
  return parsed.toString();
}
