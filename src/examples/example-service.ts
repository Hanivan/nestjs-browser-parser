import { Injectable } from '@nestjs/common';
import { JSParserService } from '../js-parser.service';

@Injectable()
export class ExampleService {
  constructor(private readonly jsParser: JSParserService) {}

  async basicExample() {
    console.log('🚀 Basic HTML Parsing with JavaScript Example');

    try {
      // Fetch a page that requires JavaScript
      const response = await this.jsParser.fetchHtml('https://example.com', {
        verbose: true,
        timeout: 15000,
      });

      const pageInfo = this.jsParser.extractStructuredFromHtml(response.html, {
        title: { selector: 'title', type: 'css' },
      });
      console.log('📄 Page Title:', pageInfo.title);
      console.log('🌐 Final URL:', response.url);
      console.log('📊 Status:', response.status);

      return response;
    } catch (error) {
      console.error('❌ Error:', error);
      throw error;
    }
  }

  async javascriptContentExample() {
    console.log('⚡ JavaScript Content Extraction Example');

    try {
      // Example with a site that loads content via JavaScript
      const response = await this.jsParser.fetchHtml(
        'https://httpbin.org/html',
        {
          waitForTimeout: 2000, // Wait for JS to load
          verbose: true,
        },
      );

      const structured = this.jsParser.extractStructuredFromHtml(
        response.html,
        {
          title: {
            selector: 'h1',
            type: 'css',
          },
          paragraphs: {
            selector: 'p',
            type: 'css',
            multiple: true,
          },
          allLinks: {
            selector: 'a',
            type: 'css',
            attribute: 'href',
            multiple: true,
          },
        },
      );

      console.log('📋 Structured Data:', structured);
      return structured;
    } catch (error) {
      console.error('❌ Error:', error);
      throw error;
    }
  }

  async screenshotExample() {
    console.log('📸 Screenshot Example');

    try {
      const screenshot = await this.jsParser.takeScreenshot(
        'https://example.com',
        {
          type: 'png',
          fullPage: true,
          timeout: 10000,
        },
      );

      console.log('📸 Screenshot captured, size:', screenshot.length, 'bytes');
      return screenshot;
    } catch (error) {
      console.error('❌ Error:', error);
      throw error;
    }
  }

  async evaluateJavaScriptExample() {
    console.log('🔧 JavaScript Evaluation Example');

    try {
      // Execute custom JavaScript on the page
      const result = await this.jsParser.evaluateOnPage(
        'https://httpbin.org/html',
        async (page) => {
          // Custom JavaScript to run on the page
          return await page.evaluate(() => {
            return {
              title: document.title,
              bodyText: document.body.innerText.substring(0, 100),
              elementCount: document.querySelectorAll('*').length,
              url: window.location.href,
            };
          });
        },
      );

      console.log('🔧 JavaScript Evaluation Result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error:', error);
      throw error;
    }
  }

  async advancedConfigExample() {
    console.log('⚙️ Advanced Configuration Example');

    try {
      const response = await this.jsParser.fetchHtml(
        'https://httpbin.org/user-agent',
        {
          userAgent: 'Custom Bot 1.0',
          viewport: { width: 1024, height: 768 },
          extraHTTPHeaders: {
            'X-Custom-Header': 'test-value',
          },
          javaScriptEnabled: true,
          verbose: true,
        },
      );

      console.log('⚙️ Response with custom config:', {
        status: response.status,
        headers: Object.keys(response.headers).slice(0, 5),
      });

      return response;
    } catch (error) {
      console.error('❌ Error:', error);
      throw error;
    }
  }
}
