import { Response } from 'playwright-core';

export interface JSParseResponse {
  html: string;
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }>;
  timing?: {
    requestStart: number;
    responseStart: number;
    responseEnd: number;
    domContentLoaded?: number;
    load?: number;
  };
  screenshot?: Buffer;
  pdf?: Buffer;
}

export interface PageMetrics {
  title: string;
  description?: string;
  keywords?: string;
  viewport: {
    width: number;
    height: number;
  };
  userAgent: string;
  loadTime: number;
  resourceCounts: {
    total: number;
    images: number;
    stylesheets: number;
    scripts: number;
    fonts: number;
    xhr: number;
    other: number;
  };
}

export interface JSParseResponseWithMetrics extends JSParseResponse {
  metrics: PageMetrics;
}
