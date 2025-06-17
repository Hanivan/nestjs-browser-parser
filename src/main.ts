/**
 * @fileoverview NestJS JS Parser Package
 *
 * A powerful NestJS package for parsing HTML content that needs JavaScript enabled using Playwright Core:
 *
 * ## Features
 * - **Playwright Integration**: Uses playwright-core for reliable JavaScript-enabled HTML parsing
 * - **Dual Browser Mode**: Support for both CDP connection and built-in browser
 * - **CSS Selectors**: Extract data using CSS selectors (XPath support planned)
 * - **Screenshots & PDFs**: Generate screenshots and PDF documents
 * - **JavaScript Execution**: Execute custom JavaScript on pages
 * - **Proxy Support**: HTTP, HTTPS, SOCKS proxies with authentication
 * - **Rich Configuration**: Extensive customization options
 * - **Response Metadata**: Headers, cookies, timing, and metrics
 * - **TypeScript**: Full type safety and IntelliSense support
 * - **Auto Cleanup**: Automatic resource management and cleanup
 *
 * ## Quick Start
 * ```typescript
 * import { JSParserModule, JSParserService } from 'nestjs-js-parser';
 *
 * // In your module
 * @Module({
 *   imports: [JSParserModule.forRoot()],
 * })
 * export class AppModule {}
 *
 * // In your service
 * @Injectable()
 * export class MyService {
 *   constructor(private jsParser: JSParserService) {}
 *
 *   async getData() {
 *     const response = await this.jsParser.fetchHtml('https://example.com');
 *     const title = this.jsParser.extractSingle(response.html, 'title');
 *     return title;
 *   }
 * }
 * ```
 *
 * @author Your Name <your.email@example.com>
 * @license MIT
 */

export * from './examples';
export * from './js-parser.module';
export * from './js-parser.service';
export * from './js-parser.config';
export * from './types';