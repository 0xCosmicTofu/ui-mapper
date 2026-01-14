/**
 * HTML preprocessing utilities to optimize HTML before sending to AI
 * Reduces payload size and improves processing speed
 */

/**
 * Clean HTML by removing unnecessary elements and content
 * - Removes <script> tags and their content
 * - Removes <style> tags and their content
 * - Removes HTML comments
 * - Removes hidden elements (display:none, visibility:hidden)
 * - Minifies whitespace
 * - Limits total size to maxChars
 */
export function preprocessHTML(html: string, maxChars: number = 50000): string {
  let cleaned = html;

  // Remove script tags and their content
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove style tags and their content
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // Remove noscript tags
  cleaned = cleaned.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');

  // Remove elements with display:none or visibility:hidden in inline styles
  cleaned = cleaned.replace(/<[^>]+\sstyle\s*=\s*["'][^"']*display\s*:\s*none[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi, '');
  cleaned = cleaned.replace(/<[^>]+\sstyle\s*=\s*["'][^"']*visibility\s*:\s*hidden[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi, '');

  // Remove hidden input fields (they're usually not relevant for UI component detection)
  cleaned = cleaned.replace(/<input[^>]*type\s*=\s*["']hidden["'][^>]*>/gi, '');

  // Minify whitespace (but preserve structure)
  // Replace multiple spaces/tabs with single space
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  // Replace multiple newlines with single newline
  cleaned = cleaned.replace(/\n\s*\n/g, '\n');
  // Remove leading/trailing whitespace from lines
  cleaned = cleaned.replace(/^[ \t]+|[ \t]+$/gm, '');

  // Limit total size
  if (cleaned.length > maxChars) {
    // Try to preserve structure by truncating at a reasonable point
    // Find the last complete tag before maxChars
    const truncated = cleaned.substring(0, maxChars);
    const lastTagEnd = truncated.lastIndexOf('>');
    if (lastTagEnd > maxChars * 0.9) {
      // If we found a tag end close to the limit, truncate there
      cleaned = truncated.substring(0, lastTagEnd + 1);
    } else {
      cleaned = truncated;
    }
  }

  return cleaned.trim();
}

/**
 * Extract only the body content from HTML
 * Useful when you only need the visible page content
 */
export function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    return bodyMatch[1];
  }
  return html;
}

/**
 * Get a summary of HTML preprocessing results
 */
export function getPreprocessingStats(original: string, processed: string) {
  return {
    originalSize: original.length,
    processedSize: processed.length,
    reduction: original.length - processed.length,
    reductionPercent: ((original.length - processed.length) / original.length * 100).toFixed(1),
  };
}

