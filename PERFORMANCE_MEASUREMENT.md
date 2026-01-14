# Performance Measurement Guide

## Overview

This document explains how to measure and verify the performance optimizations implemented in the `feature/performance-optimization` branch.

## Performance Metrics

Performance metrics are automatically logged to Vercel logs with the `[PERF]` prefix for easy filtering.

### Metrics Logged

1. **Total Duration**: Complete analysis time from start to finish
2. **Stage Timings**: Individual timing for each stage:
   - `scraping`: HTML scraping time
   - `componentsAndModels`: Combined component detection + content modeling (single AI call)
   - `mapping`: Mapping creation time
   - `export`: Webflow export generation time
3. **Cache Performance**: Duration for cache lookups (should be <1ms)

### Log Format

#### Successful Analysis
```json
{
  "url": "https://example.com",
  "jobId": "uuid",
  "totalDurationMs": 45234,
  "totalDurationSeconds": "45.23",
  "stageTimings": {
    "scraping": "1.45s",
    "componentsAndModels": "28.32s",
    "mapping": "14.21s",
    "export": "0.25s"
  },
  "stageTimingsMs": {
    "scraping": 1450,
    "componentsAndModels": 28320,
    "mapping": 14210,
    "export": 250
  },
  "results": {
    "componentCount": 8,
    "modelCount": 5,
    "mappingCount": 3
  },
  "cached": false,
  "timestamp": "2026-01-14T..."
}
```

#### Cache Hit
```json
{
  "url": "https://example.com",
  "cacheCheckDurationMs": 0.5,
  "totalDurationMs": 0.5,
  "totalDurationSeconds": "0.001",
  "cached": true,
  "timestamp": "2026-01-14T..."
}
```

## How to Measure Improvements

### Step 1: View Vercel Logs

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Open the "Functions" or "Logs" tab
4. Filter by `[PERF]` to see only performance logs

### Step 2: Run Test Analyses

Run analyses on the same URLs to get consistent measurements:

1. **First run** (no cache): Full analysis with all optimizations
2. **Second run** (cached): Should show cache hit with <1ms duration

### Step 3: Compare Metrics

#### Baseline (Before Optimizations)
Based on `DEPLOYMENT_SUCCESS.md`:
- **Total**: ~73 seconds
- **Component Detection**: ~23s
- **Content Modeling**: ~20s
- **Mapping**: ~30s
- **Export**: <1s
- **AI Calls**: 3 separate calls

#### Optimized (After Optimizations)
Expected improvements:
- **Total**: ~35-45 seconds (38-45% faster)
- **Components + Models** (combined): ~25-30s (saves ~20s by eliminating one AI call)
- **Mapping**: ~14-20s (faster due to reduced tokens)
- **Export**: <1s
- **AI Calls**: 2 calls (combined detection + mapping)
- **Cached**: <1ms (instant)

### Step 4: Calculate Improvements

```
Speedup = (Baseline Time - Optimized Time) / Baseline Time × 100%

Example:
Speedup = (73s - 40s) / 73s × 100% = 45% faster
```

## Key Optimizations Measured

1. **Combined AI Call**: Component detection + content modeling in one call
   - **Expected savings**: ~20 seconds
   - **Measured in**: `componentsAndModels` stage timing

2. **Reduced Tokens**: max_tokens reduced from 4000 → 2500-3000
   - **Expected savings**: ~5-10 seconds per AI call
   - **Measured in**: Individual stage timings

3. **HTML Preprocessing**: Strips scripts/styles/comments
   - **Expected savings**: ~2-5 seconds (smaller payload)
   - **Measured in**: Overall stage timings

4. **Optimized Prompts**: Shorter, more focused prompts
   - **Expected savings**: ~2-5 seconds per AI call
   - **Measured in**: Individual stage timings

5. **Caching**: URL-based caching with 24-hour TTL
   - **Expected performance**: <1ms for cached URLs
   - **Measured in**: Cache hit logs

## Success Criteria

✅ **Performance optimization is successful if:**
- Total analysis time is **<50 seconds** (vs ~73s baseline)
- Combined `componentsAndModels` stage is **<35 seconds** (vs ~43s combined baseline)
- Cache hits return in **<1ms**
- Result quality remains the same (same component/model counts)

## Monitoring

To continuously monitor performance:

1. **Filter Vercel logs** by `[PERF]` prefix
2. **Track average durations** over time
3. **Monitor cache hit rates** (should increase as URLs are analyzed)
4. **Alert on regressions** (if total duration > 60s consistently)

## Example Analysis

After deploying and running a few analyses, you should see logs like:

```
[PERF] Analysis completed {
  totalDurationSeconds: "38.45",
  stageTimings: {
    scraping: "1.23s",
    componentsAndModels: "26.78s",  // Combined call (was ~43s separately)
    mapping: "9.89s",                // Faster due to reduced tokens
    export: "0.55s"
  }
}
```

This shows a **47% improvement** over the baseline (~73s → ~38s).

