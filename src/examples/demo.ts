import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { JSParserModule, JSParserService } from '../index';

@Module({
  imports: [
    JSParserModule.forRoot({
      loggerLevel: 'debug',
      headless: true,
      browserConnection: {
        type: 'builtin', // or 'cdp' for Chrome DevTools Protocol
        executablePath: '/usr/bin/chromium',
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      },
      verbose: true,
    }),
  ],
})
export class DemoAppModule {}

export async function runDemo() {
  console.log('🚀 Starting NestJS JS Parser Demo');

  const app = await NestFactory.createApplicationContext(DemoAppModule);
  const jsParser = app.get(JSParserService);

  try {
    // Basic example
    console.log('\n📄 Basic HTML Parsing Example:');
    const response = await jsParser.fetchHtml('https://example.com', {
      verbose: true,
      timeout: 15000,
    });

    const pageInfo = jsParser.extractStructuredFromHtml(response.html, {
      title: { selector: 'title', type: 'css' },
    });
    console.log('Title:', pageInfo.title);
    console.log('Status:', response.status);
    console.log('URL:', response.url);

    // Structured extraction example
    console.log('\n📋 Structured Data Extraction:');
    const structured = jsParser.extractStructuredFromHtml(response.html, {
      title: {
        selector: 'title',
        type: 'css',
      },
      metaDescription: {
        selector: 'meta[name="description"]',
        type: 'css',
        attribute: 'content',
      },
      allLinks: {
        selector: 'a',
        type: 'css',
        attribute: 'href',
        multiple: true,
      },
    });

    console.log('Structured data:', JSON.stringify(structured, null, 2));

    // Screenshot example
    console.log('\n📸 Taking Screenshot:');
    const screenshot = await jsParser.takeScreenshot('https://example.com', {
      type: 'png',
      fullPage: false,
    });
    console.log('Screenshot captured, size:', screenshot.length, 'bytes');

    // JavaScript evaluation example
    console.log('\n⚡ JavaScript Evaluation:');
    const jsResult = await jsParser.evaluateOnPage(
      'https://httpbin.org/html',
      '() => ({ title: document.title, elementCount: document.querySelectorAll("*").length })',
    );
    console.log('JS Evaluation result:', jsResult);
  } catch (error) {
    console.error('❌ Demo error:', error);
  } finally {
    await jsParser.cleanup();
    await app.close();
    console.log('\n✅ Demo completed and cleaned up');
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  runDemo().catch(console.error);
}
