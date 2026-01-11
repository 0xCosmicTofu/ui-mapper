# Setup Guide

## Quick Start

1. **Install dependencies**:
```bash
npm install
```

2. **Install Playwright browsers**:
```bash
npx playwright install chromium
```

3. **Configure environment**:
```bash
cp .env.example .env
```

Add your API key to `.env`:
```
VENICE_API_KEY=your_venice_api_key_here  # Required
VENICE_MODEL_ID=claude-opus-4.5          # Optional - defaults to claude-opus-4.5
```

4. **Run development server**:
```bash
npm run dev
```

5. **Test with example URL**:
```
https://token2049.com/dubai
```

## API Keys

### Venice API - **Required**
- Sign up at: https://venice.ai/
- Get API key from: https://venice.ai/ (after signup)
- Add to `.env` as `VENICE_API_KEY`
- **This is the only API key you need** - the app uses Venice's OpenAI-compatible API

### Model Selection (Optional)
- Default model: `claude-opus-4.5` (Claude Opus 4.5 via Venice)
- Other available models:
  - `mistral-31-24b` - Vision model with image analysis
  - `zai-org-glm-4.6` - Reasoning model for complex tasks
- Set `VENICE_MODEL_ID` in `.env` to use a different model

## Troubleshooting

### Playwright Issues
If you see "Executable doesn't exist" errors:
```bash
npx playwright install chromium
```

### API Key Errors
- Ensure `.env` file exists in project root
- Check that API keys are correctly formatted (no quotes, no spaces)
- Verify API keys are active in your account

### Screenshot Directory
Screenshots are saved to `public/screenshots/`. Ensure this directory exists:
```bash
mkdir -p public/screenshots
```

## Project Structure

```
webflow-ui-mapper/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts    # Main analysis endpoint
│   │   └── export/route.ts     # Export endpoint
│   ├── layout.tsx
│   └── page.tsx                 # Main UI
├── lib/
│   ├── types.ts                 # TypeScript types
│   └── services/
│       ├── analyzer.ts          # Main orchestrator
│       ├── scraper.ts           # Playwright scraper
│       ├── ai-component-detector.ts
│       ├── ai-content-modeler.ts
│       ├── ai-mapper.ts
│       └── webflow-exporter.ts
├── public/
│   └── screenshots/             # Generated screenshots
└── .env                         # Your API keys (not in git)
```

## Next Steps

1. Test with `token2049.com/dubai`
2. Review the generated models, components, and mappings
3. Export JSON/CSV for Webflow import
4. Customize prompts in AI services for better results
