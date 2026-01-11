# Webflow UI Mapper

Transform any website into Webflow Collections, Symbols, and Bindings using AI-powered analysis.

## 🎯 Overview

**Webflow UI Mapper** automates the manual 8-20 hour process of:
1. Scraping a website
2. Identifying content patterns
3. Defining data models
4. Mapping to UI components
5. Building Webflow Collections and Symbols

**Input**: A URL (e.g., `https://token2049.com/dubai`)  
**Output**: Complete Webflow export with Collections, Symbols, Bindings, and CSV data

## ✨ Features

- **AI-Powered Component Detection**: Uses Venice API (Claude Opus 4.5) with vision capabilities to identify reusable UI components
- **Semantic Content Modeling**: Extracts data models from HTML structure
- **Explicit Mappings**: Creates clear bindings between models and component slots
- **Webflow Export**: Generates ready-to-import JSON and CSV files
- **Full Page Screenshots**: Visual reference for analysis

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- **Required**: Venice API Key - [Get API Key](https://venice.ai/)

### Installation

1. **Clone and install dependencies**:
```bash
cd webflow-ui-mapper
npm install
```

2. **Install Playwright browsers**:
```bash
npx playwright install chromium
```

3. **Set up environment variables**:
```bash
cp .env.example .env
```

Edit `.env` and add your API key:
```
VENICE_API_KEY=your_key_here  # Required
VENICE_MODEL_ID=claude-opus-4.5  # Optional - defaults to claude-opus-4.5
```

4. **Run the development server**:
```bash
npm run dev
```

5. **Open your browser**:
Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage

1. **Enter a URL**: Paste the website URL you want to analyze (e.g., `https://token2049.com/dubai`)
2. **Click "Analyze"**: The system will:
   - Scrape the website (DOM + screenshot)
   - Detect UI components using AI vision
   - Extract content models
   - Create explicit mappings
   - Generate Webflow export
3. **Review Results**: See content models, UI components, and mappings
4. **Export**: Download JSON or CSV files for Webflow import

## 🏗️ Architecture

### Pipeline Flow

```
URL Input
  ↓
Playwright Scraper (DOM + Screenshot)
  ↓
AI Component Detector (Claude Vision)
  ↓
AI Content Modeler (Claude)
  ↓
AI Mapping Service (Claude)
  ↓
Webflow Exporter
  ↓
JSON/CSV Export
```

### Key Services

- **`WebScraper`**: Uses Playwright to scrape websites and capture screenshots
- **`ComponentDetector`**: AI vision analysis to identify reusable components
- **`ContentModeler`**: Extracts semantic data models from HTML
- **`MappingService`**: Creates explicit bindings between models and components
- **`WebflowExporter`**: Generates Webflow-compatible exports

## 📦 Output Format

### Analysis Result

```json
{
  "contentModels": [
    {
      "name": "Event",
      "fields": [
        {"name": "title", "type": "string"},
        {"name": "stats", "type": "array"}
      ]
    }
  ],
  "uiComponents": [
    {
      "name": "HeroBanner",
      "selector": ".hero",
      "slots": [
        {"name": "title", "selector": "h1", "type": "text"}
      ]
    }
  ],
  "mappings": [
    {
      "pageName": "Homepage",
      "componentMappings": [
        {
          "componentName": "HeroBanner",
          "slotMappings": {
            "title": "Event.title"
          }
        }
      ]
    }
  ]
}
```

### Webflow Export

- **Collections**: Data models as Webflow CMS collections
- **Symbols**: UI components as Webflow symbols
- **Bindings**: Slot-to-field mappings
- **CSV Data**: Pre-populated sample data

## 🧪 Testing

Test with the example URL:
```
https://token2049.com/dubai
```

Expected output:
- Event model with title, stats, speakers
- HeroBanner component with title, stats slots
- Homepage mapping: HeroBanner.title ← Event.title

## 🔧 Configuration

### Environment Variables

- `VENICE_API_KEY`: **Required** - Used for all AI analysis (component detection, content modeling, mappings) via Venice API
- `VENICE_MODEL_ID`: **Optional** - Model to use (defaults to `claude-opus-4.5`). Other options: `mistral-31-24b` (vision), `zai-org-glm-4.6` (reasoning)
- `WEBFLOW_API_KEY`: Optional, for direct Webflow API integration (future)

### Timeout Settings

Default timeouts can be adjusted in:
- `lib/services/scraper.ts`: Page load timeout (30s)
- `lib/services/ai-*.ts`: AI model max tokens (4000)

## 🚧 Roadmap

- [ ] Direct Webflow API integration
- [ ] Batch processing for multiple URLs
- [ ] Custom component templates
- [ ] Figma export support
- [ ] Real-time progress updates
- [ ] Export validation and testing

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

## 💰 Revenue Potential

- **Webflow agencies**: $199/site migration
- **Design systems teams**: $99/mo unlimited
- **Market**: Every Webflow redesign project

---

Built with Next.js, Playwright, Claude AI, and ❤️
