# NestJS Browser Parser

A powerful NestJS module for parsing HTML content with JavaScript support using Playwright Core. This module provides comprehensive features for web scraping, data extraction, and automation with both CDP (Chrome DevTools Protocol) and built-in browser support.

## 🚀 Features

- **🎭 Playwright Integration**: Uses playwright-core for reliable JavaScript-enabled HTML parsing
- **🔗 Dual Browser Mode**: Support for both CDP connection and built-in browser
- **📱 Responsive**: Full viewport and device emulation support  
- **🔍 CSS & Limited XPath**: Extract data using CSS selectors (XPath support planned)
- **📸 Screenshots & PDFs**: Generate screenshots and PDF documents
- **⚡ JavaScript Execution**: Execute custom JavaScript on pages
- **🛡️ Proxy Support**: HTTP, HTTPS, SOCKS proxies with authentication
- **🎨 Rich Configuration**: Extensive customization options
- **📊 Response Metadata**: Headers, cookies, timing, and metrics
- **🔧 TypeScript**: Full type safety and IntelliSense support
- **🧹 Auto Cleanup**: Automatic resource management and cleanup

## 📦 Installation

```bash
npm install playwright-core cheerio
# or
yarn add playwright-core cheerio
```

## 🛠️ Quick Start

### Basic Setup

```typescript
import { Module } from '@nestjs/common';
import { BrowserParserModule } from './browser-parser.module';

@Module({
  imports: [BrowserParserModule.forRoot()],
})
export class AppModule {}
```

### Using the Service

```typescript
import { Injectable } from '@nestjs/common';
import { BrowserParserService } from './browser-parser.service';

@Injectable()
export class ScrapingService {
  constructor(private readonly browserParser: BrowserParserService) {}

  async scrapeWebsite(url: string) {
    const response = await this.browserParser.fetchHtml(url, {
      verbose: true,
      timeout: 30000,
    });

    const title = this.browserParser.extractSingle(response.html, 'title');
    return { title, status: response.status };
  }
}
```

## 🎛️ Configuration

### Built-in Browser (Default)

```typescript
BrowserParserModule.forRoot({
  loggerLevel: 'debug',
  headless: true,
  browserConnection: {
    type: 'builtin',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  },
})
```

### CDP (Chrome DevTools Protocol)

```typescript
JSParserModule.forRoot({
  loggerLevel: 'debug',
  browserConnection: {
    type: 'cdp',
    cdpUrl: 'ws://localhost:9222/devtools/browser',
  },
})
```

### Async Configuration

```typescript
BrowserParserModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    loggerLevel: configService.get('LOG_LEVEL', 'error'),
    headless: configService.get('HEADLESS', 'true') === 'true',
    browserConnection: {
      type: configService.get('BROWSER_TYPE', 'builtin'),
      cdpUrl: configService.get('CDP_URL'),
    },
  }),
  inject: [ConfigService],
})
```

## 📖 API Reference

### BrowserParserService Methods

#### `fetchHtml(url, options?)`

Fetch HTML content from a URL with JavaScript execution.

```typescript
const response = await browserParser.fetchHtml('https://example.com', {
  timeout: 30000,
  waitForSelector: '.dynamic-content',
  userAgent: 'Custom Bot 1.0',
  viewport: { width: 1024, height: 768 },
  proxy: {
    server: 'http://proxy.example.com:8080',
    username: 'user',
    password: 'pass',
  },
});
```

#### `extractSingle(html, selector, type?, attribute?, options?)`

Extract a single value from HTML.

```typescript
const title = jsParser.extractSingle(html, 'title');
const description = jsParser.extractSingle(html, 'meta[name="description"]', 'css', 'content');
```

#### `extractMultiple(html, selector, type?, attribute?, options?)`

Extract multiple values from HTML.

```typescript
const links = jsParser.extractMultiple(html, 'a', 'css', 'href');
const headings = jsParser.extractMultiple(html, 'h1, h2, h3');
```

#### `extractStructuredFromHtml(html, schema)`

Extract structured data using a schema.

```typescript
const data = jsParser.extractStructuredFromHtml(html, {
  title: { selector: 'title', type: 'css' },
  links: { selector: 'a', type: 'css', attribute: 'href', multiple: true },
  price: { 
    selector: '.price', 
    type: 'css',
    transform: (text) => parseFloat(text.replace('$', ''))
  },
});
```

#### `takeScreenshot(url, options?)`

Capture a screenshot of a webpage.

```typescript
const screenshot = await jsParser.takeScreenshot('https://example.com', {
  type: 'png',
  fullPage: true,
  clip: { x: 0, y: 0, width: 800, height: 600 },
});
```

#### `generatePDF(url, options?)`

Generate a PDF of a webpage.

```typescript
const pdf = await jsParser.generatePDF('https://example.com', {
  format: 'A4',
  printBackground: true,
  margin: { top: '1cm', bottom: '1cm' },
});
```

#### `evaluateOnPage(url, evaluationFunction, options?)`

Execute JavaScript on a page.

```typescript
const result = await jsParser.evaluateOnPage(
  'https://example.com',
  '() => ({ title: document.title, elementCount: document.querySelectorAll("*").length })'
);
```

## 🌐 Browser Configuration

### Built-in Browser

Uses Playwright's bundled Chromium:

```typescript
{
  browserConnection: {
    type: 'builtin',
    executablePath: '/path/to/chrome', // Optional custom Chrome
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    ignoreDefaultArgs: false,
  }
}
```

### CDP Connection

Connect to existing Chrome instance:

```bash
# Start Chrome with remote debugging
google-chrome --remote-debugging-port=9222 --no-first-run --no-default-browser-check
```

```typescript
{
  browserConnection: {
    type: 'cdp',
    cdpUrl: 'ws://localhost:9222/devtools/browser',
  }
}
```

## 🚀 Run the Demo

```bash
npm run start:dev
```

## 📄 License

MIT
