// Define our own LogLevel type to match NestJS LogLevel
export type LogLevel = 'verbose' | 'debug' | 'log' | 'warn' | 'error' | 'fatal';

export interface BrowserParserConfig {
  loggerLevel?: LogLevel | LogLevel[];
  defaultTimeout?: number;
  headless?: boolean;
  defaultViewport?: {
    width: number;
    height: number;
  };
  browserConnection?: BrowserConnectionConfig;
  verbose?: boolean;
}

export interface BrowserConnectionConfig {
  type: 'cdp' | 'builtin';
  cdpUrl?: string;
  executablePath?: string;
  args?: string[];
  ignoreDefaultArgs?: boolean | string[];
}

export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
  bypass?: string;
}

export interface BrowserParserOptions {
  timeout?: number;
  waitForSelector?: string;
  waitForTimeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  proxy?: ProxyConfig;
  extraHTTPHeaders?: Record<string, string>;
  ignoreHTTPSErrors?: boolean;
  javaScriptEnabled?: boolean;
  bypassCSP?: boolean;
  locale?: string;
  timezoneId?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  permissions?: string[];
  colorScheme?: 'light' | 'dark' | 'no-preference';
  reducedMotion?: 'reduce' | 'no-preference';
  forcedColors?: 'active' | 'none';
  verbose?: boolean;
}
