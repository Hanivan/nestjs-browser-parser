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
  PaginatedExtractionOptions,
  PaginationResult,
  PaginationState,
  PaginationOptions,
  InfiniteScrollConfig,
  LoadMoreButtonConfig,
  NumberedPaginationConfig,
  CursorBasedConfig,
  HybridConfig,
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

  async extractStructured<T = Record<string, unknown>>(
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

  extractStructuredFromHtml<T = Record<string, unknown>>(
    html: string,
    schema: ExtractionSchema<T>,
    options?: ExtractionOptions,
  ): T {
    const result: Record<string, unknown> = {};

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

  /**
   * Extract data with automatic pagination support
   */
  async extractWithPagination<T = unknown>(
    url: string,
    options: PaginatedExtractionOptions<T>,
    parserOptions?: JSParserOptions
  ): Promise<PaginationResult<T>> {
    const startTime = Date.now();
    const state: PaginationState = {
      currentPage: 0,
      totalItems: 0,
      errors: [],
      startTime,
      isLoading: false,
    };

    const result: PaginationResult<T> = {
      items: [],
      pagesProcessed: 0,
      totalTime: 0,
      completed: false,
      stopReason: 'endReached',
      errors: [],
      metadata: {
        startTime,
        endTime: 0,
        averagePageTime: 0,
      },
    };

    const { page, context } = await this.getPage(url, parserOptions);

    try {
      options.eventHandlers?.onPageStart?.(0, state);

      // Perform pagination based on strategy
      await this.performPagination(page, options, state, result);

      result.completed = true;
      result.totalTime = Date.now() - startTime;
      result.metadata.endTime = Date.now();
      result.metadata.averagePageTime = result.pagesProcessed > 0 
        ? result.totalTime / result.pagesProcessed 
        : 0;

      options.eventHandlers?.onComplete?.(result);

      return result;
    } catch (error) {
      const errorMessage = (error as Error).message;
      result.errors.push(errorMessage);
      result.stopReason = 'error';
      
      if (this.shouldLog('error')) {
        this.logWithLevel('error', 'Pagination error:', error);
      }

      options.eventHandlers?.onError?.(errorMessage, state.currentPage, state);
      return result;
    } finally {
      await page.close();
      await context.close();
    }
  }

  /**
   * Perform pagination based on the configured strategy
   */
  private async performPagination<T>(
    page: Page,
    options: PaginatedExtractionOptions<T>,
    state: PaginationState,
    result: PaginationResult<T>
  ): Promise<void> {
    const config = options.pagination;

    switch (config.type) {
      case 'infinite-scroll':
        await this.performInfiniteScroll(page, options, state, result);
        break;
      case 'load-more-button':
        await this.performLoadMoreButton(page, options, state, result);
        break;
      case 'numbered-pagination':
        await this.performNumberedPagination(page, options, state, result);
        break;
      case 'cursor-based':
        await this.performCursorBasedPagination(page, options, state, result);
        break;
      case 'time-based':
        await this.performTimeBasedPagination(page, options, state, result);
        break;
      case 'hybrid':
        await this.performHybridPagination(page, options, state, result);
        break;
      default:
        throw new Error(`Unsupported pagination type: ${(config as { type: string }).type}`);
    }
  }

  /**
   * Handle infinite scroll pagination
   */
  private async performInfiniteScroll<T>(
    page: Page,
    options: PaginatedExtractionOptions<T>,
    state: PaginationState,
    result: PaginationResult<T>
  ): Promise<void> {
    const config = options.pagination as InfiniteScrollConfig;
    const scrollOptions = config.scrollOptions || {};
    let scrollCount = 0;
    let lastItemCount = 0;

    while (this.shouldContinuePagination(config, state, result)) {
      // Extract items from current view
      const html = await page.content();
      const newItems = await options.extractItems(page, html);
      
      if (config.verbose) {
        this.logWithLevel('debug', `📦 Extracted ${newItems.length} items from scroll ${state.currentPage + 1}`);
      }
      
      await this.processNewItems(newItems, options, state, result);
      
      options.eventHandlers?.onPageComplete?.(state.currentPage, newItems, state);

      // Check if we have new items
      if (result.items.length === lastItemCount) {
        // No new items, try scrolling
        if (config.verbose) {
          this.logWithLevel('debug', `🔄 No new items found, attempting scroll (${scrollCount + 1}/${scrollOptions.maxScrolls || 'unlimited'})`);
        }
        
        const scrolled = await this.performScroll(page, scrollOptions);
        if (!scrolled) {
          if (config.verbose) {
            this.logWithLevel('debug', '🛑 Scroll failed or reached end of page');
          }
          result.stopReason = 'endReached';
          break;
        }
        scrollCount++;
        
        if (scrollOptions.maxScrolls && scrollCount >= scrollOptions.maxScrolls) {
          if (config.verbose) {
            this.logWithLevel('debug', `🛑 Reached maximum scroll limit (${scrollOptions.maxScrolls})`);
          }
          result.stopReason = 'endReached';
          break;
        }

        // Wait for content to load after scrolling
        if (config.loadingSelector) {
          try {
            await page.waitForSelector(config.loadingSelector, { timeout: 2000 });
            await page.waitForSelector(config.loadingSelector, { state: 'hidden', timeout: 10000 });
          } catch {
            // Loading indicator might not appear or disappear quickly
          }
        } else {
          // Give time for new content to load
          await page.waitForTimeout(2000);
        }
        
      } else {
        if (config.verbose) {
          this.logWithLevel('debug', `✅ Found ${result.items.length - lastItemCount} new items (total: ${result.items.length})`);
        }
        lastItemCount = result.items.length;
        scrollCount = 0; // Reset scroll count when we get new items
      }

      await page.waitForTimeout(config.delay || 1000);
      state.currentPage++;
      result.pagesProcessed++;
    }
  }

  /**
   * Handle load more button pagination
   */
  private async performLoadMoreButton<T>(
    page: Page,
    options: PaginatedExtractionOptions<T>,
    state: PaginationState,
    result: PaginationResult<T>
  ): Promise<void> {
    const config = options.pagination as LoadMoreButtonConfig;

    // Extract initial items
    let html = await page.content();
    let newItems = await options.extractItems(page, html);
    await this.processNewItems(newItems, options, state, result);

    while (this.shouldContinuePagination(config, state, result)) {
      // Try to find and click load more button
      const buttonClicked = await this.clickLoadMoreButton(page, config);
      
      if (!buttonClicked) {
        result.stopReason = 'endReached';
        break;
      }

      // Wait for new content
      await page.waitForTimeout(config.waitAfterClick || 2000);
      
      if (config.waitForSelector) {
        try {
          await page.waitForSelector(config.waitForSelector, { timeout: 10000 });
        } catch {
          // Selector might not appear
        }
      }

      // Extract new items
      html = await page.content();
      newItems = await options.extractItems(page, html);
      await this.processNewItems(newItems, options, state, result);
      
      options.eventHandlers?.onPageComplete?.(state.currentPage, newItems, state);

      await page.waitForTimeout(config.delay || 1000);
      state.currentPage++;
      result.pagesProcessed++;
    }
  }

  /**
   * Handle numbered pagination
   */
  private async performNumberedPagination<T>(
    page: Page,
    options: PaginatedExtractionOptions<T>,
    state: PaginationState,
    result: PaginationResult<T>
  ): Promise<void> {
    const config = options.pagination as NumberedPaginationConfig;

    while (this.shouldContinuePagination(config, state, result)) {
      // Extract items from current page
      const html = await page.content();
      const newItems = await options.extractItems(page, html);
      await this.processNewItems(newItems, options, state, result);
      
      options.eventHandlers?.onPageComplete?.(state.currentPage, newItems, state);

      // Try to navigate to next page
      const navigated = await this.navigateToNextPage(page, config);
      
      if (!navigated) {
        result.stopReason = 'endReached';
        break;
      }

      await page.waitForTimeout(config.delay || 2000);
      state.currentPage++;
      result.pagesProcessed++;
    }
  }

  /**
   * Handle cursor-based pagination
   */
  private async performCursorBasedPagination<T>(
    page: Page,
    options: PaginatedExtractionOptions<T>,
    state: PaginationState,
    result: PaginationResult<T>
  ): Promise<void> {
    const config = options.pagination as CursorBasedConfig;
    let cursor = config.initialCursor;

    while (this.shouldContinuePagination(config, state, result)) {
      // Extract items from current page
      const html = await page.content();
      const newItems = await options.extractItems(page, html);
      await this.processNewItems(newItems, options, state, result);
      
      options.eventHandlers?.onPageComplete?.(state.currentPage, newItems, state);

      // Extract cursor for next page
      const nextCursor = await config.extractCursor(page, result.items);
      
      if (!nextCursor) {
        result.stopReason = 'endReached';
        break;
      }
      
      cursor = nextCursor;

      state.lastCursor = cursor;
      result.metadata.lastCursor = cursor;

      // Navigate to next page using cursor
      await config.navigateWithCursor(page, cursor);
      await page.waitForTimeout(config.delay || 2000);
      
      state.currentPage++;
      result.pagesProcessed++;
    }
  }

  /**
   * Handle time-based pagination
   */
  private async performTimeBasedPagination<T>(
    _page: Page,
    _options: PaginatedExtractionOptions<T>,
    _state: PaginationState,
    _result: PaginationResult<T>
  ): Promise<void> {
    // Implementation for time-based pagination
    // This is more complex and depends on specific use cases
    throw new Error('Time-based pagination not yet implemented');
  }

  /**
   * Handle hybrid pagination
   */
  private async performHybridPagination<T>(
    page: Page,
    options: PaginatedExtractionOptions<T>,
    state: PaginationState,
    result: PaginationResult<T>
  ): Promise<void> {
    const config = options.pagination as HybridConfig;
    
    try {
      // Try primary strategy first
      const primaryOptions: PaginatedExtractionOptions<T> = { 
        ...options, 
        pagination: config.primaryStrategy as PaginationOptions 
      };
      await this.performPagination(page, primaryOptions, state, result);
    } catch (error) {
      if (this.shouldLog('warn')) {
        this.logWithLevel('warn', 'Primary pagination strategy failed, trying fallback');
      }
      
      // Try fallback strategy
      const fallbackOptions: PaginatedExtractionOptions<T> = { 
        ...options, 
        pagination: config.fallbackStrategy as PaginationOptions 
      };
      await this.performPagination(page, fallbackOptions, state, result);
    }
  }

  /**
   * Check if pagination should continue
   */
  private shouldContinuePagination<T>(
    config: PaginationOptions,
    state: PaginationState,
    result: PaginationResult<T>
  ): boolean {
    if (config.maxPages && state.currentPage >= config.maxPages) {
      result.stopReason = 'maxPages';
      return false;
    }
    
    if (config.maxItems && result.items.length >= config.maxItems) {
      result.stopReason = 'maxItems';
      return false;
    }

    if (config.stopCondition) {
      // This would need to be handled in the calling context
      // since we can't pass the page object here easily
    }

    return true;
  }

  /**
   * Process new items from a page
   */
  private async processNewItems<T>(
    newItems: T[],
    options: PaginatedExtractionOptions<T>,
    state: PaginationState,
    result: PaginationResult<T>
  ): Promise<void> {
    for (const item of newItems) {
      const isDuplicate = options.isDuplicate 
        ? options.isDuplicate(item, result.items)
        : false;

      if (!isDuplicate || options.includeDuplicates) {
        result.items.push(item);
        state.totalItems++;
      }
    }

    options.eventHandlers?.onItemsExtracted?.(newItems, state.currentPage, state);
  }

  /**
   * Perform scroll action
   */
  private async performScroll(
    page: Page,
    scrollOptions: InfiniteScrollConfig['scrollOptions'] = {}
  ): Promise<boolean> {
    try {
      if (scrollOptions.scrollToBottom !== false) {
        // Get current scroll position and document height before scrolling
        const beforeScroll = await page.evaluate(() => ({
          scrollY: window.scrollY,
          scrollHeight: document.documentElement.scrollHeight,
          clientHeight: document.documentElement.clientHeight
        }));

        if (this.shouldLog('debug')) {
          this.logWithLevel('debug', `🔄 Scrolling to bottom from ${beforeScroll.scrollY} (page height: ${beforeScroll.scrollHeight})`);
        }

        // Scroll to bottom using multiple methods for better compatibility
        await page.evaluate(() => {
          // Method 1: Scroll to document height
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
          });
        });

        // Wait a moment for smooth scroll
        await page.waitForTimeout(500);

        // Method 2: Ensure we're really at the bottom
        await page.evaluate(() => {
          document.documentElement.scrollTop = document.documentElement.scrollHeight;
          document.body.scrollTop = document.body.scrollHeight;
        });

        // Verify we actually scrolled
        const afterScroll = await page.evaluate(() => ({
          scrollY: window.scrollY,
          scrollHeight: document.documentElement.scrollHeight,
          clientHeight: document.documentElement.clientHeight
        }));

        if (this.shouldLog('debug')) {
          this.logWithLevel('debug', `✅ Scrolled to ${afterScroll.scrollY} (page height: ${afterScroll.scrollHeight})`);
        }

        // Check if we're near the bottom (within 100px)
        const isNearBottom = afterScroll.scrollY + afterScroll.clientHeight >= afterScroll.scrollHeight - 100;
        
        if (!isNearBottom && afterScroll.scrollY === beforeScroll.scrollY) {
          if (this.shouldLog('debug')) {
            this.logWithLevel('debug', '⚠️ Scroll position did not change, may have reached end');
          }
          return false;
        }

      } else if (scrollOptions.scrollDistance) {
        const distance = typeof scrollOptions.scrollDistance === 'string'
          ? parseInt(scrollOptions.scrollDistance)
          : scrollOptions.scrollDistance;

        if (this.shouldLog('debug')) {
          this.logWithLevel('debug', `🔄 Scrolling by ${distance}px`);
        }
          
        await page.evaluate((dist) => {
          window.scrollBy({
            top: dist,
            behavior: 'smooth'
          });
        }, distance);
      }

      await page.waitForTimeout(scrollOptions.scrollDelay || 1000);
      return true;
    } catch (error) {
      if (this.shouldLog('error')) {
        this.logWithLevel('error', 'Scroll error:', error);
      }
      return false;
    }
  }

  /**
   * Click load more button
   */
  private async clickLoadMoreButton(
    page: Page,
    config: LoadMoreButtonConfig
  ): Promise<boolean> {
    const selectors = [config.buttonSelector, ...(config.alternativeSelectors || [])];

    for (const selector of selectors) {
      try {
        const button = page.locator(selector);
        const isVisible = await button.isVisible();
        
        if (isVisible) {
          await button.click();
          return true;
        }
      } catch {
        // Try next selector
      }
    }

    return false;
  }

  /**
   * Navigate to next page in numbered pagination
   */
  private async navigateToNextPage(
    page: Page,
    config: NumberedPaginationConfig
  ): Promise<boolean> {
    try {
      const nextButton = page.locator(config.nextButtonSelector);
      const isVisible = await nextButton.isVisible();
      
      if (isVisible) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
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
