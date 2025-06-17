import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as cheerio from 'cheerio';
import {
  Browser,
  BrowserContext,
  chromium,
  Page,
  Response,
} from 'playwright-core';
import { JS_PARSER_CONFIG, JSParserModuleConfig } from './js-parser.config';
import {
  ExtractionOptions,
  ExtractionSchema,
  JSParseResponse,
  JSParseResponseWithMetrics,
  JSParserOptions,
  LogLevel,
  NavigationOptions,
  PageMetrics,
  TransformFunction,
  TransformObject,
  TransformType,
} from './types';

@Injectable()
export class JSParserService implements OnModuleDestroy {
  private readonly logger: Logger;
  private readonly loggerLevel: LogLevel | LogLevel[];
  private browser: Browser | null = null;
  private contexts: Set<BrowserContext> = new Set();
  private config: JSParserModuleConfig;

  constructor(
    @Inject(JS_PARSER_CONFIG)
    config: JSParserModuleConfig,
  ) {
    this.logger = new Logger(JSParserService.name, { timestamp: true });
    this.config = config;
    this.loggerLevel = config.loggerLevel || ['log', 'error', 'debug'];
  }

  async onModuleDestroy() {
    await this.cleanup();
  }

  private shouldLog(level: string): boolean {
    const levelHierarchy: LogLevel[] = [
      'error',
      'warn',
      'log',
      'debug',
      'verbose',
    ];

    const targetLevel = level as LogLevel;

    if (Array.isArray(this.loggerLevel)) {
      return this.loggerLevel.includes(targetLevel);
    } else {
      const currentIndex = levelHierarchy.indexOf(this.loggerLevel);
      const targetIndex = levelHierarchy.indexOf(targetLevel);
      return (
        currentIndex !== -1 && targetIndex !== -1 && targetIndex <= currentIndex
      );
    }
  }

  private logWithLevel(
    level: LogLevel,
    message: string,
    ...optionalParams: unknown[]
  ): void {
    if (this.shouldLog(level)) {
      switch (level) {
        case 'error':
          this.logger.error(message, ...optionalParams);
          break;
        case 'warn':
          this.logger.warn(message, ...optionalParams);
          break;
        case 'log':
          this.logger.log(message, ...optionalParams);
          break;
        case 'debug':
          this.logger.debug(message, ...optionalParams);
          break;
        case 'verbose':
          this.logger.verbose(message, ...optionalParams);
          break;
        default:
          this.logger.log(message, ...optionalParams);
      }
    }
  }

  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      if (
        this.config.browserConnection?.type === 'cdp' &&
        this.config.browserConnection.cdpUrl
      ) {
        if (this.config.verbose) {
          this.logWithLevel(
            'debug',
            `🔗 Connecting to CDP at: ${this.config.browserConnection.cdpUrl}`,
          );
        }
        this.browser = await chromium.connectOverCDP(
          this.config.browserConnection.cdpUrl,
        );
      } else {
        if (this.config.verbose) {
          this.logWithLevel('debug', '🚀 Launching built-in browser');
        }
        this.browser = await chromium.launch({
          headless: this.config.headless ?? true,
          executablePath: this.config.browserConnection?.executablePath,
          args: this.config.browserConnection?.args,
          ignoreDefaultArgs: this.config.browserConnection?.ignoreDefaultArgs,
        });
      }
    }
    return this.browser;
  }

  async createContext(
    options?: Record<string, unknown>,
  ): Promise<BrowserContext> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      viewport: this.config.defaultViewport || { width: 1920, height: 1080 },
      ...options,
    });

    this.contexts.add(context);

    context.on('close', () => {
      this.contexts.delete(context);
    });

    return context;
  }

  async getPage(
    url: string,
    options?: JSParserOptions,
  ): Promise<{
    page: Page;
    context: BrowserContext;
    response: Response | null;
  }> {
    const verbose = options?.verbose ?? false;

    if (verbose) {
      this.logWithLevel('debug', `🌐 Opening page: ${url}`);
    }

    const context = await this.createContext({
      viewport: options?.viewport || this.config.defaultViewport,
      userAgent: options?.userAgent,
      proxy: options?.proxy,
      extraHTTPHeaders: options?.extraHTTPHeaders,
      ignoreHTTPSErrors: options?.ignoreHTTPSErrors,
      javaScriptEnabled: options?.javaScriptEnabled ?? true,
      bypassCSP: options?.bypassCSP,
      locale: options?.locale,
      timezoneId: options?.timezoneId,
      geolocation: options?.geolocation,
      permissions: options?.permissions,
      colorScheme: options?.colorScheme,
      reducedMotion: options?.reducedMotion,
      forcedColors: options?.forcedColors,
    });

    const page = await context.newPage();

    const navigationOptions: NavigationOptions = {
      timeout: options?.timeout || this.config.defaultTimeout || 30000,
      waitUntil: options?.waitUntil || 'networkidle',
    };

    const startTime = Date.now();
    const response = await page.goto(url, navigationOptions);

    if (!response) {
      throw new Error('Failed to navigate to page');
    }

    if (options?.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, {
        timeout: options?.waitForTimeout || 5000,
      });
    } else if (options?.waitForTimeout) {
      await page.waitForTimeout(options.waitForTimeout);
    }

    const endTime = Date.now();

    if (verbose) {
      this.logWithLevel(
        'debug',
        `✅ Successfully opened ${url} in ${endTime - startTime}ms`,
      );
    }

    return { page, context, response };
  }

  async fetchHtml(
    url: string,
    options?: JSParserOptions,
  ): Promise<JSParseResponse> {
    const { page, context, response } = await this.getPage(url, options);

    try {
      const html = await page.content();
      const cookies = await context.cookies();

      if (!response) {
        throw new Error('No response available');
      }

      const responseHeaders = response.headers();

      const result: JSParseResponse = {
        html,
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: responseHeaders,
        cookies: cookies.map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          expires: cookie.expires,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
        })),
        timing: {
          requestStart: Date.now(),
          responseStart: Date.now(),
          responseEnd: Date.now(),
        },
      };

      return result;
    } finally {
      await page.close();
      await context.close();
    }
  }

  async fetchHtmlWithMetrics(
    url: string,
    options?: JSParserOptions,
  ): Promise<JSParseResponseWithMetrics> {
    const response = await this.fetchHtml(url, options);
    const metrics = this.extractPageMetrics(response.html);

    return {
      ...response,
      metrics,
    };
  }

  private extractPageMetrics(html: string): PageMetrics {
    const $ = cheerio.load(html);

    return {
      title: $('title').text() || '',
      description: $('meta[name="description"]').attr('content'),
      keywords: $('meta[name="keywords"]').attr('content'),
      viewport: this.config.defaultViewport || { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 Playwright',
      loadTime: 0, // Will be set by caller
      resourceCounts: {
        total: $('*').length,
        images: $('img').length,
        stylesheets: $('link[rel="stylesheet"]').length,
        scripts: $('script').length,
        fonts: $('link[rel="font"], style').length,
        xhr: 0, // Cannot determine from static HTML
        other: 0,
      },
    };
  }

  async takeScreenshot(
    url: string,
    options?: JSParserOptions & {
      path?: string;
      type?: 'png' | 'jpeg';
      quality?: number;
      fullPage?: boolean;
      clip?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    },
  ): Promise<Buffer> {
    const context = await this.createContext({
      viewport: options?.viewport || this.config.defaultViewport,
    });

    let page: Page | null = null;

    try {
      page = await context.newPage();
      await page.goto(url, { timeout: options?.timeout || 30000 });

      if (options?.waitForSelector) {
        await page.waitForSelector(options.waitForSelector);
      }

      return await page.screenshot({
        path: options?.path,
        type: options?.type,
        quality: options?.quality,
        fullPage: options?.fullPage,
        clip: options?.clip,
      });
    } finally {
      if (page) {
        await page.close();
      }
      await context.close();
    }
  }

  async generatePDF(
    url: string,
    options?: JSParserOptions & {
      path?: string;
      format?: string;
      printBackground?: boolean;
      margin?: {
        top?: string;
        right?: string;
        bottom?: string;
        left?: string;
      };
    },
  ): Promise<Buffer> {
    const context = await this.createContext();
    let page: Page | null = null;

    try {
      page = await context.newPage();
      await page.goto(url, { timeout: options?.timeout || 30000 });

      if (options?.waitForSelector) {
        await page.waitForSelector(options.waitForSelector);
      }

      return await page.pdf({
        path: options?.path,
        format: options?.format as 'A4' | 'Letter' | undefined,
        printBackground: options?.printBackground,
        margin: options?.margin,
      });
    } finally {
      if (page) {
        await page.close();
      }
      await context.close();
    }
  }

  async evaluateOnPage<T = unknown>(
    url: string,
    evaluationFunction: string | ((page: Page) => Promise<T>),
    options?: JSParserOptions,
  ): Promise<T | null> {
    const { page, context } = await this.getPage(url, options);

    try {
      if (typeof evaluationFunction === 'string') {
        return await page.evaluate(evaluationFunction);
      } else {
        return await evaluationFunction(page);
      }
    } catch (error) {
      if (this.shouldLog('error')) {
        this.logWithLevel('error', 'Error in evaluateOnPage:', error);
      }
      return null;
    } finally {
      await page.close();
      await context.close();
    }
  }

  async closePage(page: Page, context: BrowserContext): Promise<void> {
    try {
      if (page && !page.isClosed()) {
        await page.close();
      }
      if (context && !context.browser()?.isConnected()) {
        await context.close();
      }
    } catch (error) {
      if (this.shouldLog('error')) {
        this.logWithLevel('error', 'Error closing page:', error);
      }
    }
  }

  async extractStructured<T = Record<string, any>>(
    url: string,
    schema: ExtractionSchema<T>,
    options?: JSParserOptions,
  ): Promise<T> {
    const response = await this.fetchHtml(url, options);
    return this.extractStructuredFromHtml(response.html, schema, {
      verbose: options?.verbose,
      timeout: options?.timeout,
    });
  }

  extractStructuredFromHtml<T = Record<string, any>>(
    html: string,
    schema: ExtractionSchema<T>,
    options?: ExtractionOptions,
  ): T {
    const result: Record<string, any> = {};

    for (const [key, config] of Object.entries(schema)) {
      try {
        const fieldConfig = config as {
          type?: string;
          multiple?: boolean;
          selector: string;
          attribute?: string;
          raw?: boolean;
          transform?: TransformType;
        };

        // Skip evaluate type in HTML-only mode
        if (fieldConfig.type === 'evaluate') {
          if (options?.verbose) {
            this.logWithLevel(
              'debug',
              `Skipping evaluate field '${key}' in HTML-only mode`,
            );
          }
          result[key] = fieldConfig.multiple ? [] : null;
          continue;
        }

        // Determine selector type (default to css)
        const selectorType = fieldConfig.type || 'css';

        let value: unknown;

        // Inline extraction logic
        if (selectorType === 'xpath') {
          throw new Error(
            'XPath extraction not yet implemented. Use CSS selectors or evaluate on page.',
          );
        }

        const $ = cheerio.load(html);
        const elements = $(fieldConfig.selector);

        if (fieldConfig.multiple) {
          // Extract multiple values
          const results: string[] = [];
          elements.each((_, element) => {
            const $element = $(element);
            if (fieldConfig.raw) {
              results.push($.html($element) || '');
            } else if (fieldConfig.attribute) {
              const attrValue = $element.attr(fieldConfig.attribute);
              if (attrValue) results.push(attrValue);
            } else {
              const text = $element.text().trim();
              if (text) results.push(text);
            }
          });

          value = fieldConfig.transform
            ? this.applyTransform(results, fieldConfig.transform)
            : results;
        } else {
          // Extract single value
          const element = elements.first();
          if (element.length > 0) {
            let extracted: string | null;
            if (fieldConfig.raw) {
              extracted = $.html(element);
            } else if (fieldConfig.attribute) {
              extracted = element.attr(fieldConfig.attribute) || null;
            } else {
              extracted = element.text().trim() || null;
            }

            value =
              extracted !== null && fieldConfig.transform
                ? this.applyTransform(extracted, fieldConfig.transform)
                : extracted;
          } else {
            value = null;
          }
        }

        result[key] = value;

        if (options?.verbose) {
          this.logWithLevel('debug', `Extracted field '${key}':`, value);
        }
      } catch (error) {
        if (this.shouldLog('error')) {
          this.logWithLevel('error', `Error extracting field '${key}':`, error);
        }
        const fieldConfig = config as { multiple?: boolean };
        result[key] = fieldConfig.multiple ? [] : null;
      }
    }

    return result as T;
  }

  /**
   * Apply transformation to extracted values
   * Supports functions, objects with transform method, classes, and arrays of transforms
   */
  private applyTransform(value: unknown, transform: TransformType): unknown {
    if (!transform) return value;

    // Handle array of transforms - apply in sequence
    if (Array.isArray(transform)) {
      return transform.reduce((acc, t) => this.applyTransform(acc, t), value);
    }

    // Handle transform function
    if (typeof transform === 'function') {
      return (transform as TransformFunction)(value);
    }

    // Handle transform object with transform method
    if (typeof transform === 'object' && 'transform' in transform) {
      return (transform as TransformObject).transform(value);
    }

    // Handle transform class - instantiate and call transform
    if (typeof transform === 'function') {
      try {
        // Try to instantiate as a class
        const TransformClass = transform as new () => {
          transform: (value: unknown) => unknown;
        };
        const instance = new TransformClass();
        if (instance && typeof instance.transform === 'function') {
          return instance.transform(value);
        }
      } catch (error) {
        // If instantiation fails, treat as regular function
        return (transform as TransformFunction)(value);
      }
    }

    return value;
  }

  async cleanup(): Promise<void> {
    try {
      // Close all contexts
      for (const context of this.contexts) {
        if (!context.browser()?.isConnected()) continue;
        await context.close();
      }
      this.contexts.clear();

      // Close browser if it exists and is connected
      if (this.browser && this.browser.isConnected()) {
        await this.browser.close();
      }

      this.browser = null;

      if (this.shouldLog('debug')) {
        this.logWithLevel('debug', '🧹 JSParserService cleanup completed');
      }
    } catch (error) {
      if (this.shouldLog('error')) {
        this.logWithLevel('error', 'Error during cleanup:', error);
      }
    }
  }
}
