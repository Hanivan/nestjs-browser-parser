import { Page } from 'playwright-core';

// Pagination strategy types
export type PaginationType = 
  | 'infinite-scroll'
  | 'load-more-button'
  | 'numbered-pagination'
  | 'cursor-based'
  | 'time-based'
  | 'hybrid';

// Base pagination configuration
export interface PaginationConfig {
  /** Type of pagination strategy to use */
  type: PaginationType;
  /** Maximum number of pages to process */
  maxPages?: number;
  /** Maximum number of items to collect */
  maxItems?: number;
  /** Delay between pagination actions (milliseconds) */
  delay?: number;
  /** Enable verbose logging for pagination */
  verbose?: boolean;
  /** Custom condition to stop pagination */
  stopCondition?: (page: Page, currentItems: unknown[], pageNumber: number) => Promise<boolean> | boolean;
}

// Infinite scroll specific configuration
export interface InfiniteScrollConfig extends PaginationConfig {
  type: 'infinite-scroll';
  /** Scroll behavior options */
  scrollOptions?: {
    /** How far to scroll each time (pixels or percentage) */
    scrollDistance?: number | string;
    /** Whether to scroll to bottom or specific distance */
    scrollToBottom?: boolean;
    /** Selector to scroll within (defaults to window) */
    scrollContainer?: string;
    /** Wait time after each scroll */
    scrollDelay?: number;
    /** Maximum scrolls before giving up */
    maxScrolls?: number;
  };
  /** Selector that indicates more content is loading */
  loadingSelector?: string;
  /** Selector that indicates no more content */
  endOfContentSelector?: string;
}

// Load more button specific configuration
export interface LoadMoreButtonConfig extends PaginationConfig {
  type: 'load-more-button';
  /** Selector for the load more button */
  buttonSelector: string;
  /** Alternative selectors to try */
  alternativeSelectors?: string[];
  /** Wait for content to load after clicking */
  waitAfterClick?: number;
  /** Selector to wait for after clicking load more */
  waitForSelector?: string;
}

// Numbered pagination specific configuration
export interface NumberedPaginationConfig extends PaginationConfig {
  type: 'numbered-pagination';
  /** Selector for next page button/link */
  nextButtonSelector: string;
  /** Selector for page numbers */
  pageNumberSelector?: string;
  /** Selector for current page indicator */
  currentPageSelector?: string;
  /** Whether to use direct page number links */
  useDirectPageLinks?: boolean;
  /** Pattern for page URLs (for direct navigation) */
  pageUrlPattern?: string;
}

// Cursor-based pagination configuration
export interface CursorBasedConfig extends PaginationConfig {
  type: 'cursor-based';
  /** Function to extract cursor from current page */
  extractCursor: (page: Page, items: unknown[]) => Promise<string | null>;
  /** Function to navigate to next page using cursor */
  navigateWithCursor: (page: Page, cursor: string) => Promise<void>;
  /** Initial cursor value */
  initialCursor?: string;
}

// Time-based pagination configuration
export interface TimeBasedConfig extends PaginationConfig {
  type: 'time-based';
  /** Date range configuration */
  dateRange?: {
    start: Date;
    end: Date;
    interval: 'day' | 'week' | 'month';
  };
  /** Function to extract timestamp from items */
  extractTimestamp: (item: unknown) => Date | null;
  /** Function to navigate to next time period */
  navigateToTimePeriod: (page: Page, startDate: Date, endDate: Date) => Promise<void>;
}

// Hybrid pagination configuration
export interface HybridConfig extends PaginationConfig {
  type: 'hybrid';
  /** Primary pagination strategy */
  primaryStrategy: PaginationConfig;
  /** Fallback strategy if primary fails */
  fallbackStrategy: PaginationConfig;
  /** Condition to switch to fallback */
  switchCondition?: (page: Page, attempt: number) => Promise<boolean> | boolean;
}

// Union type for all pagination configurations
export type PaginationOptions = 
  | InfiniteScrollConfig
  | LoadMoreButtonConfig
  | NumberedPaginationConfig
  | CursorBasedConfig
  | TimeBasedConfig
  | HybridConfig;

// Pagination result interface
export interface PaginationResult<T = unknown> {
  /** All collected items across pages */
  items: T[];
  /** Total number of pages processed */
  pagesProcessed: number;
  /** Total time taken (milliseconds) */
  totalTime: number;
  /** Whether pagination completed successfully */
  completed: boolean;
  /** Reason for stopping */
  stopReason: 'maxPages' | 'maxItems' | 'endReached' | 'error' | 'customCondition';
  /** Any errors encountered */
  errors: string[];
  /** Metadata about the pagination process */
  metadata: {
    startTime: number;
    endTime: number;
    averagePageTime: number;
    lastCursor?: string;
    lastTimestamp?: Date;
  };
}

// Pagination state for internal tracking
export interface PaginationState {
  currentPage: number;
  totalItems: number;
  errors: string[];
  startTime: number;
  lastCursor?: string;
  lastTimestamp?: Date;
  isLoading: boolean;
}

// Pagination event handlers
export interface PaginationEventHandlers<T = unknown> {
  /** Called when a new page starts loading */
  onPageStart?: (pageNumber: number, state: PaginationState) => void;
  /** Called when a page finishes loading */
  onPageComplete?: (pageNumber: number, items: T[], state: PaginationState) => void;
  /** Called when items are extracted from a page */
  onItemsExtracted?: (items: T[], pageNumber: number, state: PaginationState) => void;
  /** Called when an error occurs */
  onError?: (error: string, pageNumber: number, state: PaginationState) => void;
  /** Called when pagination completes */
  onComplete?: (result: PaginationResult<T>) => void;
}

// Extended extraction options with pagination
export interface PaginatedExtractionOptions<T = unknown> {
  /** Pagination configuration */
  pagination: PaginationOptions;
  /** Event handlers for pagination lifecycle */
  eventHandlers?: PaginationEventHandlers<T>;
  /** Function to extract items from each page */
  extractItems: (page: Page, html: string) => Promise<T[]> | T[];
  /** Function to check if an item is a duplicate */
  isDuplicate?: (item: T, existingItems: T[]) => boolean;
  /** Whether to include duplicate items */
  includeDuplicates?: boolean;
}