/**
 * URL-based caching system for analysis results
 * Reduces redundant AI calls for previously analyzed URLs
 */

import type { AnalysisResult, WebflowExport } from "../types";

interface CacheEntry {
  analysis: AnalysisResult;
  webflowExport: WebflowExport;
  timestamp: number;
  url: string;
}

class AnalysisCache {
  private cache = new Map<string, CacheEntry>();
  private maxAge: number; // Cache TTL in milliseconds

  constructor(maxAgeHours: number = 24) {
    this.maxAge = maxAgeHours * 60 * 60 * 1000;
    
    // Clean up old entries periodically (only in Node.js environment)
    if (typeof process !== 'undefined' && process.env && typeof setInterval !== 'undefined') {
      setInterval(() => {
        this.cleanup();
      }, 60 * 60 * 1000); // Clean up every hour
    }
  }

  /**
   * Generate cache key from URL
   * Normalizes URL to handle variations (trailing slashes, protocols, etc.)
   */
  private getCacheKey(url: string): string {
    try {
      const urlObj = new URL(url);
      // Normalize: remove trailing slash, lowercase hostname
      const normalized = `${urlObj.protocol}//${urlObj.hostname.toLowerCase()}${urlObj.pathname.replace(/\/$/, '')}${urlObj.search}`;
      return normalized;
    } catch {
      // If URL parsing fails, use as-is
      return url.toLowerCase().trim();
    }
  }

  /**
   * Get cached result for URL
   * Returns null if not found or expired
   */
  get(url: string): { analysis: AnalysisResult; webflowExport: WebflowExport } | null {
    const key = this.getCacheKey(url);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry is expired
    const age = Date.now() - entry.timestamp;
    if (age > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    // #region agent log
    console.log("[DEBUG] AnalysisCache: Cache hit", {
      location: "lib/services/cache.ts:get",
      url,
      cacheKey: key,
      ageMinutes: Math.round(age / 60000),
      timestamp: new Date().toISOString(),
      hypothesisId: "CACHE",
    });
    // #endregion

    return {
      analysis: entry.analysis,
      webflowExport: entry.webflowExport,
    };
  }

  /**
   * Store result in cache
   */
  set(
    url: string,
    analysis: AnalysisResult,
    webflowExport: WebflowExport
  ): void {
    const key = this.getCacheKey(url);
    
    this.cache.set(key, {
      analysis,
      webflowExport,
      timestamp: Date.now(),
      url,
    });

    // #region agent log
    console.log("[DEBUG] AnalysisCache: Cache set", {
      location: "lib/services/cache.ts:set",
      url,
      cacheKey: key,
      cacheSize: this.cache.size,
      timestamp: new Date().toISOString(),
      hypothesisId: "CACHE",
    });
    // #endregion
  }

  /**
   * Check if URL is cached (without retrieving)
   */
  has(url: string): boolean {
    const key = this.getCacheKey(url);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > this.maxAge) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove entry from cache
   */
  delete(url: string): void {
    const key = this.getCacheKey(url);
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > this.maxAge) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      // #region agent log
      console.log("[DEBUG] AnalysisCache: Cleanup completed", {
        location: "lib/services/cache.ts:cleanup",
        removed,
        remaining: this.cache.size,
        timestamp: new Date().toISOString(),
        hypothesisId: "CACHE",
      });
      // #endregion
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxAgeHours: this.maxAge / (60 * 60 * 1000),
    };
  }
}

// Singleton instance with 24-hour TTL
// In production, consider using Redis or a database for multi-instance deployments
export const analysisCache = new AnalysisCache(24);

