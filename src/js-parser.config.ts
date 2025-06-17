import { LogLevel } from '@nestjs/common';

export const JS_PARSER_CONFIG = Symbol('JS_PARSER_CONFIG');
export const JS_PARSER_BROWSER_CONFIG = Symbol('JS_PARSER_BROWSER_CONFIG');

export interface JSParserModuleConfig {
  loggerLevel?: LogLevel | LogLevel[];
  defaultTimeout?: number;
  headless?: boolean;
  defaultViewport?: {
    width: number;
    height: number;
  };
  browserConnection?: {
    type: 'cdp' | 'builtin';
    cdpUrl?: string;
    executablePath?: string;
    args?: string[];
    ignoreDefaultArgs?: boolean | string[];
  };
  verbose?: boolean;
}

export const defaultJSParserConfig: JSParserModuleConfig = {
  loggerLevel: ['log', 'error', 'debug'],
  defaultTimeout: 30000,
  headless: true,
  defaultViewport: {
    width: 1920,
    height: 1080,
  },
  browserConnection: {
    type: 'builtin',
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  },
};
