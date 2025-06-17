import { Page } from 'playwright-core';
import { BrowserParserService } from '../browser-parser.service';
import { PaginatedExtractionOptions } from '../types';

interface SimpleItem {
  title: string;
  content: string;
  index: number;
}

async function testInfiniteScroll() {
  console.log('🧪 Testing Infinite Scroll Functionality\n');

  const parser = new BrowserParserService({
    loggerLevel: ['log', 'error', 'debug'],
    headless: false, // Keep visible to see scrolling
    browserConnection: {
      type: 'builtin',
      executablePath: '/usr/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
    },
  });

  try {
    // Test with a site that has infinite scroll
    console.log('🌐 Testing infinite scroll on a simple page...');

    const paginationOptions: PaginatedExtractionOptions<SimpleItem> = {
      pagination: {
        type: 'infinite-scroll',
        maxPages: 3,
        maxItems: 20,
        delay: 2000,
        verbose: true,
        scrollOptions: {
          scrollToBottom: true,
          scrollDelay: 1500,
          maxScrolls: 5,
        },
      },
      extractItems: async (page: Page, _html: string) => {
        return await page.evaluate(() => {
          const items: SimpleItem[] = [];

          // Create dynamic content to simulate infinite scroll
          const existingItems = document.querySelectorAll('.test-item');
          const currentCount = existingItems.length;

          // Add new items when scrolled to bottom
          const scrollPosition = window.scrollY + window.innerHeight;
          const documentHeight = document.documentElement.scrollHeight;

          if (scrollPosition >= documentHeight - 100) {
            // Add new items to simulate loading
            const container = document.body;
            for (let i = 0; i < 5; i++) {
              const div = document.createElement('div');
              div.className = 'test-item';
              div.innerHTML = `
                <h3>Item ${currentCount + i + 1}</h3>
                <p>This is test content for item ${currentCount + i + 1}. Generated dynamically on scroll.</p>
              `;
              container.appendChild(div);
            }
          }

          // Extract all current items
          document.querySelectorAll('.test-item').forEach((element, index) => {
            const titleEl = element.querySelector('h3');
            const contentEl = element.querySelector('p');

            if (titleEl && contentEl) {
              items.push({
                title: titleEl.textContent?.trim() || '',
                content: contentEl.textContent?.trim() || '',
                index: index + 1,
              });
            }
          });

          console.log(`Found ${items.length} items on page`);
          return items;
        });
      },
      isDuplicate: (item: SimpleItem, existingItems: SimpleItem[]) => {
        return existingItems.some((existing) => existing.index === item.index);
      },
      includeDuplicates: false,
      eventHandlers: {
        onPageStart: (pageNumber, state) => {
          console.log(
            `🔄 Starting scroll ${pageNumber + 1} (Total items so far: ${state.totalItems})`,
          );
        },
        onPageComplete: (pageNumber, items, _state) => {
          console.log(
            `✅ Scroll ${pageNumber + 1} completed: ${items.length} items extracted`,
          );
        },
        onItemsExtracted: (items, pageNumber, _state) => {
          console.log(
            `📦 Extracted ${items.length} items from scroll ${pageNumber + 1}`,
          );
        },
        onError: (error, pageNumber, _state) => {
          console.log(`❌ Error on scroll ${pageNumber + 1}: ${error}`);
        },
        onComplete: (result) => {
          console.log(
            `🎯 Infinite scroll test completed! Total: ${result.items.length} items`,
          );
        },
      },
    };

    // Create a test page with some initial content
    const testPageUrl =
      'data:text/html,<!DOCTYPE html><html><head><title>Test Infinite Scroll</title><style>body{margin:20px;font-family:Arial,sans-serif;}.test-item{margin:20px 0;padding:15px;border:1px solid #ccc;border-radius:5px;}</style></head><body><h1>Infinite Scroll Test Page</h1><div class="test-item"><h3>Item 1</h3><p>This is the initial content item 1.</p></div><div class="test-item"><h3>Item 2</h3><p>This is the initial content item 2.</p></div><div class="test-item"><h3>Item 3</h3><p>This is the initial content item 3.</p></div><script>console.log("Test page loaded");</script></body></html>';

    const result = await parser.extractWithPagination(
      testPageUrl,
      paginationOptions,
      {
        timeout: 30000,
        waitForTimeout: 2000,
      },
    );

    displayScrollResults(result);

    console.log('\n🎉 Infinite scroll test completed!');
  } catch (error) {
    console.error(
      '❌ Error in infinite scroll test:',
      (error as Error).message,
    );
  } finally {
    await parser.cleanup();
  }
}

function displayScrollResults(result: {
  items: SimpleItem[];
  pagesProcessed: number;
  totalTime: number;
  completed: boolean;
  stopReason: string;
  errors: string[];
}) {
  console.log(`\n📊 Infinite Scroll Test Results:`);
  console.log('='.repeat(40));
  console.log(`✅ Completed: ${result.completed}`);
  console.log(`📄 Scrolls processed: ${result.pagesProcessed}`);
  console.log(`📦 Total items: ${result.items.length}`);
  console.log(`⏱️ Total time: ${result.totalTime}ms`);
  console.log(`🛑 Stop reason: ${result.stopReason}`);

  if (result.errors.length > 0) {
    console.log(`❌ Errors: ${result.errors.length}`);
    result.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  console.log(`\n🎯 Sample Items (showing first 5):`);
  result.items.slice(0, 5).forEach((item, index) => {
    console.log(`\n📄 Item ${index + 1}:`);
    console.log(`   title: ${item.title}`);
    console.log(`   content: ${item.content.substring(0, 80)}...`);
    console.log(`   index: ${item.index}`);
  });
}

// Export the test function
export { testInfiniteScroll };

// Run the test if this file is executed directly
if (require.main === module) {
  testInfiniteScroll().catch((error) =>
    console.error('\n💥 Test failed:', (error as Error).message),
  );
}
