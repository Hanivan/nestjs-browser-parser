import { Page } from 'playwright-core';
import { BrowserParserService } from '../browser-parser.service';
import { PaginatedExtractionOptions, PaginationResult } from '../types';

interface NewsArticle {
  title: string;
  summary: string;
  url: string;
  timestamp: string;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface RedditPost {
  title: string;
  author: string;
  score: string;
  comments: string;
  url: string;
  subreddit: string;
}

interface IMDBMovie {
  title: string;
  year: string;
  type: string;
  description: string;
  url: string;
  rating?: string;
}

interface QuoteItem {
  text: string;
  author: string;
  tags: string[];
}

async function demonstratePaginationStrategies() {
  console.log('📄 NestJS Browser Parser - Pagination Strategies Demo\n');

  const parser = new BrowserParserService({
    loggerLevel: ['log', 'error', 'debug'],
    headless: false,
    browserConnection: {
      type: 'builtin',
      executablePath: '/usr/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ],
    },
  });

  try {
    console.log('🔢 Testing Numbered Pagination Strategy (Hacker News)');
    console.log('='.repeat(50));
    await testNumberedPagination(parser);

    // console.log('\n' + '='.repeat(60));
    // console.log('Waiting 3 seconds before next test...');
    // await new Promise((resolve) => setTimeout(resolve, 3000));

    // console.log('\n📜 Testing Infinite Scroll Strategy (Reddit)');
    // console.log('='.repeat(50));
    // await testRedditInfiniteScroll(parser);

    console.log('\n' + '='.repeat(60));
    console.log('Waiting 3 seconds before next test...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('\n🎬 Testing Load More Button Strategy (IMDB)');
    console.log('='.repeat(50));
    await testIMDBLoadMore(parser);

    console.log('\n' + '='.repeat(60));
    console.log('Waiting 3 seconds before next test...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('\n📖 Testing Quotes Scraping (Quotes to Scrape)');
    console.log('='.repeat(50));
    await testQuotesNumberedPagination(parser);
  } catch (error) {
    console.error(
      '❌ Error in pagination strategies demo:',
      (error as Error).message,
    );
  } finally {
    await parser.cleanup();
  }

  console.log('\n🎉 Pagination strategies demo completed!');
}

async function testNumberedPagination(parser: BrowserParserService) {
  // Example with a hypothetical news site that uses numbered pagination
  const searchUrl = 'https://news.ycombinator.com/';

  const paginationOptions: PaginatedExtractionOptions<NewsArticle> = {
    pagination: {
      type: 'numbered-pagination',
      maxPages: 3,
      maxItems: 50,
      delay: 2000,
      verbose: true,
      nextButtonSelector: '.morelink, a[rel="next"], .next',
      pageNumberSelector: '.pagenav a',
      currentPageSelector: '.pagenav .current',
    },
    extractItems: async (page: Page, _html: string) => {
      return await page.evaluate(() => {
        const articles: NewsArticle[] = [];

        // Extract Hacker News stories
        const storyElements = document.querySelectorAll('.athing');

        storyElements.forEach((element) => {
          try {
            const titleElement = element.querySelector('.titleline > a');
            const metaElement = element.nextElementSibling;
            const scoreElement = metaElement?.querySelector('.score');
            const ageElement = metaElement?.querySelector('.age');

            if (titleElement) {
              const title = titleElement.textContent?.trim() || '';
              const url = titleElement.getAttribute('href') || '';
              const score = scoreElement?.textContent?.trim() || '0 points';
              const age = ageElement?.textContent?.trim() || '';

              if (title && title.length > 3) {
                articles.push({
                  title,
                  summary: `${score} • ${age}`,
                  url: url.startsWith('http')
                    ? url
                    : `https://news.ycombinator.com/${url}`,
                  timestamp: age,
                });
              }
            }
          } catch (error) {
            // Skip this article if extraction fails
          }
        });

        return articles;
      });
    },
    isDuplicate: (article: NewsArticle, existingArticles: NewsArticle[]) => {
      return existingArticles.some((existing) => existing.url === article.url);
    },
    includeDuplicates: false,
    eventHandlers: {
      onPageStart: (pageNumber, state) => {
        console.log(
          `🔄 Starting page ${pageNumber + 1} (Total articles so far: ${state.totalItems})`,
        );
      },
      onPageComplete: (pageNumber, items, _state) => {
        console.log(
          `✅ Page ${pageNumber + 1} completed: ${items.length} new articles found`,
        );
      },
      onError: (error, pageNumber, _state) => {
        console.log(`❌ Error on page ${pageNumber + 1}: ${error}`);
      },
      onComplete: (result) => {
        console.log(
          `🎯 Pagination completed! Total: ${result.items.length} articles`,
        );
      },
    },
  };

  const result: PaginationResult<NewsArticle> =
    await parser.extractWithPagination(searchUrl, paginationOptions, {
      timeout: 30000,
      waitForTimeout: 2000,
    });

  displayResults(result, 'Numbered Pagination', 'articles');
}

async function testRedditInfiniteScroll(parser: BrowserParserService) {
  // Reddit r/programming with infinite scroll
  const searchUrl = 'https://reddit.com/r/programming/';

  const paginationOptions: PaginatedExtractionOptions<RedditPost> = {
    pagination: {
      type: 'infinite-scroll',
      maxPages: 3,
      maxItems: 25,
      delay: 2000,
      verbose: true,
      scrollOptions: {
        scrollToBottom: true,
        scrollDelay: 1500,
        maxScrolls: 8,
      },
    },
    extractItems: async (page: Page, _html: string) => {
      return await page.evaluate(() => {
        const posts: RedditPost[] = [];

        // Extract Reddit posts
        const postElements = document.querySelectorAll('.thing:not(.promoted)');

        postElements.forEach((element) => {
          try {
            const titleElement = element.querySelector('.title a.title');
            const authorElement = element.querySelector('.author');
            const scoreElement = element.querySelector(
              '.score.unvoted, .score.likes, .score.dislikes',
            );
            const commentsElement = element.querySelector('.comments');
            const subredditElement = element.querySelector('.subreddit');

            if (titleElement && authorElement) {
              const title = titleElement.textContent?.trim() || '';
              const author = authorElement.textContent?.trim() || '';
              const score = scoreElement?.textContent?.trim() || '0';
              const comments =
                commentsElement?.textContent?.trim() || '0 comments';
              const url = titleElement.getAttribute('href') || '';
              const subreddit =
                subredditElement?.textContent?.trim() || 'programming';

              if (title && title.length > 3) {
                posts.push({
                  title,
                  author,
                  score,
                  comments,
                  url: url.startsWith('http')
                    ? url
                    : `https://reddit.com${url}`,
                  subreddit,
                });
              }
            }
          } catch (error) {
            // Skip this post if extraction fails
          }
        });

        return posts;
      });
    },
    isDuplicate: (post: RedditPost, existingPosts: RedditPost[]) => {
      return existingPosts.some((existing) => existing.url === post.url);
    },
    includeDuplicates: false,
    eventHandlers: {
      onPageStart: (pageNumber, state) => {
        console.log(
          `🔄 Starting scroll ${pageNumber + 1} (Total posts so far: ${state.totalItems})`,
        );
      },
      onPageComplete: (pageNumber, items, _state) => {
        console.log(
          `✅ Scroll ${pageNumber + 1} completed: ${items.length} new posts found`,
        );
      },
      onItemsExtracted: (items, pageNumber, _state) => {
        console.log(
          `📦 Extracted ${items.length} posts from scroll ${pageNumber + 1}`,
        );
      },
      onError: (error, pageNumber, _state) => {
        console.log(`❌ Error on scroll ${pageNumber + 1}: ${error}`);
      },
      onComplete: (result) => {
        console.log(
          `🎯 Reddit infinite scroll completed! Total: ${result.items.length} posts`,
        );
      },
    },
  };

  const result: PaginationResult<RedditPost> =
    await parser.extractWithPagination(searchUrl, paginationOptions, {
      timeout: 30000,
      waitForTimeout: 2000,
    });

  displayResults(result, 'Reddit Infinite Scroll', 'posts');
}

async function testIMDBLoadMore(parser: BrowserParserService) {
  // IMDB search results with load more functionality
  const searchUrl =
    'https://www.imdb.com/find/?q=spiderman&s=tt&exact=true&ref_=fn_ttl_ex';

  const paginationOptions: PaginatedExtractionOptions<IMDBMovie> = {
    pagination: {
      type: 'load-more-button',
      maxPages: 3,
      maxItems: 30,
      delay: 2000,
      verbose: true,
      buttonSelector: '.ipc-see-more__button, .find-see-more-title-btn button',
      alternativeSelectors: [
        'button:contains("More exact matches")',
        '.results-section-see-more-btn button',
        '.ipc-btn:contains("More")',
      ],
      waitAfterClick: 3000,
      waitForSelector: '.find-result-item, .ipc-metadata-list-summary-item',
    },
    extractItems: async (page: Page, _html: string) => {
      return await page.evaluate(() => {
        const movies: IMDBMovie[] = [];

        // Extract IMDB movie results
        const movieElements = document.querySelectorAll(
          '.find-result-item, .ipc-metadata-list-summary-item, .titleResult',
        );

        movieElements.forEach((element) => {
          try {
            const titleElement = element.querySelector(
              '.ipc-metadata-list-summary-item__t, .result_text a, h3 a',
            );
            const yearElement = element.querySelector(
              '.titleDescription, .result_text, .ipc-metadata-list-summary-item__li',
            );
            const descElement = element.querySelector(
              '.plot_summary, .storyline, .ipc-html-content',
            );
            const ratingElement = element.querySelector(
              '.ratings-bar, .iMDbRating, .ratingValue',
            );

            if (titleElement) {
              const fullText = titleElement.textContent?.trim() || '';
              const url = titleElement.getAttribute('href') || '';

              // Extract title and year from text like "Spider-Man (2002)"
              const titleMatch = fullText.match(/^(.+?)\s*\((\d{4}).*\)/) || [
                null,
                fullText,
                '',
              ];
              const title = titleMatch[1]?.trim() || fullText;
              const year = titleMatch[2] || '';

              // Determine type (movie, TV series, etc.)
              const typeText = yearElement?.textContent || '';
              const type = typeText.includes('TV')
                ? 'TV Series'
                : typeText.includes('Video')
                  ? 'Video'
                  : 'Movie';

              const description = descElement?.textContent?.trim() || '';
              const rating = ratingElement?.textContent?.trim() || '';

              if (title && title.length > 1) {
                movies.push({
                  title,
                  year,
                  type,
                  description: description.substring(0, 200),
                  url: url.startsWith('http')
                    ? url
                    : `https://www.imdb.com${url}`,
                  rating: rating || undefined,
                });
              }
            }
          } catch (error) {
            // Skip this movie if extraction fails
          }
        });

        return movies;
      });
    },
    isDuplicate: (movie: IMDBMovie, existingMovies: IMDBMovie[]) => {
      return existingMovies.some((existing) => existing.url === movie.url);
    },
    includeDuplicates: false,
    eventHandlers: {
      onPageStart: (pageNumber, state) => {
        console.log(
          `🔄 Starting page ${pageNumber + 1} (Total movies so far: ${state.totalItems})`,
        );
      },
      onPageComplete: (pageNumber, items, _state) => {
        console.log(
          `✅ Page ${pageNumber + 1} completed: ${items.length} new movies found`,
        );
      },
      onError: (error, pageNumber, _state) => {
        console.log(`❌ Error on page ${pageNumber + 1}: ${error}`);
      },
      onComplete: (result) => {
        console.log(
          `🎯 IMDB load more completed! Total: ${result.items.length} movies`,
        );
      },
    },
  };

  const result: PaginationResult<IMDBMovie> =
    await parser.extractWithPagination(searchUrl, paginationOptions, {
      timeout: 30000,
      waitForTimeout: 3000,
    });

  displayResults(result, 'IMDB Load More', 'movies');
}

async function testQuotesNumberedPagination(parser: BrowserParserService) {
  // Quotes to Scrape - a site designed for scraping practice with numbered pagination
  const searchUrl = 'http://quotes.toscrape.com/';

  const paginationOptions: PaginatedExtractionOptions<QuoteItem> = {
    pagination: {
      type: 'numbered-pagination',
      maxPages: 5,
      maxItems: 50,
      delay: 1500,
      verbose: true,
      nextButtonSelector: '.next a',
      pageNumberSelector: '.pager a',
      currentPageSelector: '.pager .current',
    },
    extractItems: async (page: Page, _html: string) => {
      return await page.evaluate(() => {
        const quotes: QuoteItem[] = [];

        // Extract quotes from the page
        const quoteElements = document.querySelectorAll('.quote');

        quoteElements.forEach((element) => {
          try {
            const textElement = element.querySelector('.text');
            const authorElement = element.querySelector('.author');
            const tagElements = element.querySelectorAll('.tag');

            if (textElement && authorElement) {
              const text = textElement.textContent?.trim() || '';
              const author = authorElement.textContent?.trim() || '';
              const tags = Array.from(tagElements).map(
                (tag) => tag.textContent?.trim() || '',
              );

              if (text && author) {
                quotes.push({
                  text,
                  author,
                  tags: tags.filter((tag) => tag.length > 0),
                });
              }
            }
          } catch (error) {
            // Skip this quote if extraction fails
          }
        });

        return quotes;
      });
    },
    isDuplicate: (quote: QuoteItem, existingQuotes: QuoteItem[]) => {
      return existingQuotes.some(
        (existing) =>
          existing.text === quote.text && existing.author === quote.author,
      );
    },
    includeDuplicates: false,
    eventHandlers: {
      onPageStart: (pageNumber, state) => {
        console.log(
          `🔄 Starting page ${pageNumber + 1} (Total quotes so far: ${state.totalItems})`,
        );
      },
      onPageComplete: (pageNumber, items, _state) => {
        console.log(
          `✅ Page ${pageNumber + 1} completed: ${items.length} new quotes found`,
        );
      },
      onError: (error, pageNumber, _state) => {
        console.log(`❌ Error on page ${pageNumber + 1}: ${error}`);
      },
      onComplete: (result) => {
        console.log(
          `🎯 Quotes pagination completed! Total: ${result.items.length} quotes`,
        );
      },
    },
  };

  const result: PaginationResult<QuoteItem> =
    await parser.extractWithPagination(searchUrl, paginationOptions, {
      timeout: 30000,
      waitForTimeout: 1500,
    });

  displayResults(result, 'Quotes Numbered Pagination', 'quotes');
}

function displayResults<T>(
  result: PaginationResult<T>,
  strategy: string,
  itemType: string,
) {
  console.log(`\n📊 ${strategy} Results:`);
  console.log('='.repeat(40));
  console.log(`✅ Completed: ${result.completed}`);
  console.log(`📄 Pages processed: ${result.pagesProcessed}`);
  console.log(`📦 Total ${itemType}: ${result.items.length}`);
  console.log(`⏱️ Total time: ${result.totalTime}ms`);
  console.log(
    `⚡ Average time per page: ${result.metadata.averagePageTime.toFixed(0)}ms`,
  );
  console.log(`🛑 Stop reason: ${result.stopReason}`);

  if (result.errors.length > 0) {
    console.log(`❌ Errors: ${result.errors.length}`);
    result.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  console.log(`\n🎯 Sample Items (showing first 3):`);
  result.items.slice(0, 3).forEach((item: T, index) => {
    console.log(`\n📄 Item ${index + 1}:`);
    const itemObj = item as {
      title?: string;
      summary?: string;
      snippet?: string;
      url?: string;
      timestamp?: string;
      author?: string;
      score?: string;
      comments?: string;
      subreddit?: string;
      name?: string;
      description?: string;
      stars?: string;
      language?: string;
      updatedAt?: string;
      year?: string;
      type?: string;
      rating?: string;
      text?: string;
      tags?: string[];
    };

    if (itemObj.title)
      console.log(`   title: ${itemObj.title.substring(0, 60)}...`);
    if (itemObj.name) console.log(`   name: ${itemObj.name}`);
    if (itemObj.text)
      console.log(`   text: ${itemObj.text.substring(0, 100)}...`);
    if (itemObj.summary) console.log(`   summary: ${itemObj.summary}`);
    if (itemObj.snippet)
      console.log(`   snippet: ${itemObj.snippet.substring(0, 80)}...`);
    if (itemObj.description)
      console.log(`   description: ${itemObj.description.substring(0, 80)}...`);
    if (itemObj.author) console.log(`   author: ${itemObj.author}`);
    if (itemObj.score) console.log(`   score: ${itemObj.score}`);
    if (itemObj.stars) console.log(`   stars: ${itemObj.stars}`);
    if (itemObj.language) console.log(`   language: ${itemObj.language}`);
    if (itemObj.year) console.log(`   year: ${itemObj.year}`);
    if (itemObj.type) console.log(`   type: ${itemObj.type}`);
    if (itemObj.rating) console.log(`   rating: ${itemObj.rating}`);
    if (itemObj.subreddit) console.log(`   subreddit: ${itemObj.subreddit}`);
    if (itemObj.comments) console.log(`   comments: ${itemObj.comments}`);
    if (itemObj.tags && itemObj.tags.length > 0)
      console.log(`   tags: ${itemObj.tags.join(', ')}`);
    if (itemObj.url) console.log(`   url: ${itemObj.url.substring(0, 60)}...`);
    if (itemObj.timestamp) console.log(`   timestamp: ${itemObj.timestamp}`);
    if (itemObj.updatedAt) console.log(`   updated: ${itemObj.updatedAt}`);
  });
}

// Example of how to use different pagination strategies
export function createPaginationConfig() {
  // Infinite Scroll Configuration (Twitter/X, Instagram, Facebook style)
  const infiniteScrollConfig = {
    type: 'infinite-scroll' as const,
    maxPages: 5,
    maxItems: 100,
    delay: 2000,
    scrollOptions: {
      scrollToBottom: true,
      scrollDelay: 1000,
      maxScrolls: 20,
    },
    loadingSelector: '.loading, .spinner, [data-testid="spinner"]',
    endOfContentSelector: '.no-more-content, .end-of-results',
  };

  // Load More Button Configuration (Medium, DEV.to style)
  const loadMoreConfig = {
    type: 'load-more-button' as const,
    maxPages: 10,
    maxItems: 200,
    delay: 3000,
    buttonSelector: '.load-more, .show-more, [data-testid="load-more"]',
    alternativeSelectors: [
      'button:contains("Load More")',
      'button:contains("Show More")',
      '.pagination-button',
      '[aria-label="Load more"]',
    ],
    waitAfterClick: 2000,
    waitForSelector: '.new-content, .loaded-items',
  };

  // Numbered Pagination Configuration (Google, Bing style)
  const numberedConfig = {
    type: 'numbered-pagination' as const,
    maxPages: 15,
    maxItems: 300,
    delay: 2500,
    nextButtonSelector: '.next, .pagination-next, a[rel="next"], #pnnext',
    pageNumberSelector: '.page-number, .pagination a, [aria-label*="Page"]',
    currentPageSelector: '.current, .active, .pagination .current',
    useDirectPageLinks: true,
    pageUrlPattern: 'https://example.com/page/{page}',
  };

  // Cursor-based Configuration (API-style pagination)
  const cursorConfig = {
    type: 'cursor-based' as const,
    maxPages: 20,
    maxItems: 500,
    delay: 1500,
    initialCursor: null,
    extractCursor: async (page: Page, items: unknown[]) => {
      // Extract cursor from API response or page data
      return await page.evaluate(() => {
        const nextLink = document.querySelector(
          '[data-cursor], [data-next-cursor]',
        );
        return nextLink?.getAttribute('data-cursor') || null;
      });
    },
    navigateWithCursor: async (page: Page, cursor: string) => {
      // Navigate to next page using cursor
      await page.goto(`${page.url()}&cursor=${cursor}`);
    },
  };

  // Hybrid Configuration (Fallback strategy)
  const hybridConfig = {
    type: 'hybrid' as const,
    maxPages: 10,
    maxItems: 150,
    delay: 2000,
    primaryStrategy: infiniteScrollConfig,
    fallbackStrategy: loadMoreConfig,
    switchCondition: async (_page: Page, attempt: number) => {
      // Switch to fallback after 3 failed attempts
      return attempt > 3;
    },
  };

  return {
    infiniteScrollConfig,
    loadMoreConfig,
    numberedConfig,
    cursorConfig,
    hybridConfig,
  };
}

// Real-world pagination selectors for popular websites
export const POPULAR_SITE_SELECTORS = {
  // Google Search Results
  google: {
    type: 'numbered-pagination' as const,
    nextButtonSelector: '#pnnext, [aria-label="Next"]',
    pageNumberSelector: '[aria-label*="Page"] a',
    currentPageSelector: '[aria-current="page"]',
    itemSelector: '.g, .MjjYud',
  },

  // Amazon Product Listings
  amazon: {
    type: 'numbered-pagination' as const,
    nextButtonSelector:
      '.a-pagination .a-last a, [aria-label="Go to next page"]',
    pageNumberSelector: '.a-pagination a',
    currentPageSelector: '.a-pagination .a-selected',
    itemSelector: '[data-component-type="s-search-result"], .s-result-item',
  },

  // Reddit (Old Reddit)
  reddit: {
    type: 'numbered-pagination' as const,
    nextButtonSelector: '.next-button a, [rel="nofollow next"]',
    pageNumberSelector: '.pagination a',
    currentPageSelector: '.pagination .current',
    itemSelector: '.thing:not(.promoted)',
  },

  // GitHub Repository Search
  github: {
    type: 'load-more-button' as const,
    buttonSelector:
      '[data-testid="results-list-next-button"], .ajax-pagination-btn',
    itemSelector: '.repo-list-item, [data-testid="results-list"] > div',
    waitAfterClick: 3000,
  },

  // YouTube Search Results
  youtube: {
    type: 'infinite-scroll' as const,
    scrollOptions: {
      scrollToBottom: true,
      scrollDelay: 2000,
      maxScrolls: 15,
    },
    loadingSelector: '.ytd-continuation-item-renderer',
    itemSelector: 'ytd-video-renderer, ytd-rich-item-renderer',
  },

  // Hacker News
  hackerNews: {
    type: 'numbered-pagination' as const,
    nextButtonSelector: '.morelink, a[rel="next"]',
    pageNumberSelector: '.pagenav a',
    itemSelector: '.athing',
  },

  // Stack Overflow Questions
  stackoverflow: {
    type: 'numbered-pagination' as const,
    nextButtonSelector: '.pager-answers .next, [rel="next"]',
    pageNumberSelector: '.pager a',
    currentPageSelector: '.pager .current',
    itemSelector: '.question-summary, [id^="question-summary-"]',
  },
};

// Export the demo function
export { demonstratePaginationStrategies };

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstratePaginationStrategies()
    .then(() => console.log('\n🎉 Pagination strategies demo completed!'))
    .catch((error) =>
      console.error('\n💥 Demo failed:', (error as Error).message),
    );
}
