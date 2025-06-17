// Transform function types - supports various transformation patterns
export type TransformFunction<TInput = unknown, TOutput = unknown> = (
  value: TInput,
) => TOutput;
export type TransformObject<TInput = unknown, TOutput = unknown> = {
  transform: (value: TInput) => TOutput;
};
export type TransformClass<TInput = unknown, TOutput = unknown> = new () => {
  transform: (value: TInput) => TOutput;
};
export type TransformType<TInput = unknown, TOutput = unknown> =
  | TransformFunction<TInput, TOutput>
  | TransformObject<TInput, TOutput>
  | TransformClass<TInput, TOutput>
  | TransformFunction<TInput, TOutput>[];

// Enhanced extraction configuration for each field
export interface ExtractionFieldConfig<TValue = unknown> {
  /** CSS selector or XPath expression */
  selector: string;
  /** Type of selector to use */
  type?: 'css' | 'xpath';
  /** HTML attribute to extract (if not specified, extracts text content) */
  attribute?: string;
  /** Whether to extract multiple values (returns array) */
  multiple?: boolean;
  /** Whether to return raw HTML instead of text content */
  raw?: boolean;
  /** Transform function to apply to extracted value(s) */
  transform?: TransformType<unknown, TValue>;
  /** Whether to wait for selector to appear */
  waitForSelector?: boolean;
  /** Timeout for waiting (in milliseconds) */
  timeout?: number;
}

// Main extraction schema interface with full type safety
export type ExtractionSchema<T = Record<string, unknown>> = {
  [K in keyof T]: ExtractionFieldConfig<T[K]>;
};

// Options for extraction methods
export interface ExtractionOptions {
  /** Enable verbose logging */
  verbose?: boolean;
  /** Default timeout for operations */
  timeout?: number;
}

// Evaluation function types
export interface EvaluationFunction {
  (element: Element): unknown;
}

export interface PageEvaluationOptions {
  selector?: string;
  timeout?: number;
  waitForSelector?: boolean;
}
