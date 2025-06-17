import { Browser, BrowserContext, Page } from 'playwright-core';

export interface BrowserManager {
  getBrowser(): Promise<Browser>;
  getContext(options?: any): Promise<BrowserContext>;
  getPage(context?: BrowserContext): Promise<Page>;
  cleanup(): Promise<void>;
}

export interface BrowserPool {
  acquireBrowser(): Promise<Browser>;
  releaseBrowser(browser: Browser): Promise<void>;
  cleanup(): Promise<void>;
}

export interface NavigationOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  timeout?: number;
  referer?: string;
}

export interface WaitOptions {
  selector?: string;
  timeout?: number;
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
}
