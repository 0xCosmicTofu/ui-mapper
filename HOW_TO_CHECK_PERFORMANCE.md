# How to Check Performance Improvements from Logs

## Quick Guide: Finding Performance Metrics

### Step 1: Access Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Find your project: **webflow-ui-mapper**
3. Click on it

### Step 2: View Deployment Logs

1. Click on **"Deployments"** tab
2. Find the latest deployment (should be from the `feature/performance-optimization` branch)
3. Click on the deployment
4. Click on **"Functions"** or **"Logs"** tab

### Step 3: Filter for Performance Logs

In the logs, look for entries that start with `[PERF]`. These will show the performance metrics.

## What to Look For

### ✅ Successful Analysis Log

Look for a log entry like this:

```
[PERF] Analysis completed {
  url: "https://example.com",
  totalDurationMs: 45234,
  totalDurationSeconds: "45.23",
  stageTimings: {
    scraping: "1.45s",
    componentsAndModels: "28.32s",  // ← This is the combined call
    mapping: "14.21s",
    export: "0.25s"
  },
  results: {
    componentCount: 8,
    modelCount: 5,
    mappingCount: 3
  },
  cached: false
}
```

### ✅ Cache Hit Log

For cached URLs, you'll see:

```
[PERF] Cache hit {
  url: "https://example.com",
  totalDurationMs: 0.5,
  totalDurationSeconds: "0.001",
  cached: true
}
```

## How to Interpret the Results

### Key Metrics to Compare

1. **Total Duration** (`totalDurationSeconds`)
   - **Baseline (before)**: ~73 seconds
   - **Target (after)**: ~35-45 seconds
   - **Success**: <50 seconds = **32%+ improvement**

2. **Combined Stage** (`componentsAndModels`)
   - **Baseline (before)**: ~43 seconds (23s + 20s separately)
   - **Target (after)**: ~25-30 seconds
   - **Success**: <35 seconds = **19%+ improvement**

3. **Mapping Stage** (`mapping`)
   - **Baseline (before)**: ~30 seconds
   - **Target (after)**: ~14-20 seconds (faster due to reduced tokens)
   - **Success**: <25 seconds

4. **Cache Performance**
   - **Target**: <1ms for cached URLs
   - **Success**: Instant results

## Example: Calculating Improvement

If you see:
```
totalDurationSeconds: "38.45"
```

**Calculation:**
- Baseline: 73 seconds
- Optimized: 38.45 seconds
- Improvement: (73 - 38.45) / 73 × 100% = **47.3% faster** ✅

## What Success Looks Like

### ✅ Performance Optimization Successful If:

1. **Total time < 50 seconds** (vs ~73s baseline)
2. **Combined stage < 35 seconds** (vs ~43s separately)
3. **Cache hits < 1ms** (instant)
4. **Result quality unchanged** (same component/model counts)

### 📊 Expected Results

After running a few analyses, you should see:

```
[PERF] Analysis completed
  totalDurationSeconds: "38-45"  ← Should be 35-50s range
  stageTimings: {
    scraping: "1-2s",
    componentsAndModels: "25-30s",  ← Combined (was ~43s)
    mapping: "14-20s",              ← Faster (was ~30s)
    export: "<1s"
  }
```

## Troubleshooting

### If you don't see [PERF] logs:

1. **Make sure you've deployed the latest code** with performance instrumentation
2. **Run an analysis** on the deployed preview URL
3. **Wait a few seconds** for logs to appear
4. **Check the Functions tab** instead of Logs tab

### If logs show errors:

- Check for `[PERF] Analysis failed` entries
- Look at the `error` field to see what went wrong
- Verify all environment variables are set correctly

## Quick Test

1. **Deploy the latest code** (should already be deployed)
2. **Open the preview URL** in your browser
3. **Analyze a URL** (e.g., `https://token2049.com/dubai`)
4. **Wait for completion**
5. **Check Vercel logs** for `[PERF] Analysis completed`
6. **Note the `totalDurationSeconds` value**
7. **Compare with baseline**: 73 seconds

If `totalDurationSeconds` is **< 50 seconds**, the optimization is successful! 🎉

