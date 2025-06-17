import { Page } from 'playwright-core';
import { JSParserService } from '../js-parser.service';
import { PaginatedExtractionOptions, PaginationResult } from '../types';

// Define typed interfaces for YouTube video data
interface YouTubeVideo {
  title: string;
  channel: string;
  views: string;
  duration: string;
  uploadTime: string;
  thumbnail: string;
  videoUrl: string;
  description?: string;
}

async function demonstrateYouTubePagination() {
  console.log('🎥 NestJS JS Parser - YouTube Pagination Demo\n');

  const parser = new JSParserService({
    loggerLevel: ['log', 'error', 'debug'],
    headless: false, // Keep visible to see the process
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
    // Test different pagination strategies
    await testInfiniteScrollPagination(parser);

    // console.log('\n' + '='.repeat(60));
    // console.log('Waiting 5 seconds before next test...');
    // await new Promise(resolve => setTimeout(resolve, 5000));

    // await testLoadMoreButtonPagination(parser);
    console.log('\n🎉 YouTube pagination demo completed!');
  } catch (error) {
    console.error('❌ Error in pagination demo:', (error as Error).message);
  } finally {
    await parser.cleanup();
  }
}

async function testInfiniteScrollPagination(parser: JSParserService) {
  console.log('📜 Testing Infinite Scroll Pagination');
  console.log('='.repeat(40));

  const searchUrl =
    'https://youtube.com/results?search_query=javascript+tutorial';

  const paginationOptions: PaginatedExtractionOptions<YouTubeVideo> = {
    pagination: {
      type: 'infinite-scroll',
      maxPages: 5,
      maxItems: 50,
      delay: 3000,
      verbose: true,
      scrollOptions: {
        scrollToBottom: true,
        scrollDelay: 2000,
        maxScrolls: 15,
      },
      loadingSelector: '.ytd-continuation-item-renderer',
      endOfContentSelector: '.yt-no-results-renderer',
    },
    extractItems: async (page: Page, html: string) => {
      return await extractYouTubeVideos(page);
    },
    isDuplicate: (video: YouTubeVideo, existingVideos: YouTubeVideo[]) => {
      return existingVideos.some(
        (existing) => existing.videoUrl === video.videoUrl,
      );
    },
    includeDuplicates: false,
    eventHandlers: {
      onPageStart: (pageNumber, state) => {
        console.log(
          `🔄 Starting page ${pageNumber + 1} (Total items so far: ${state.totalItems})`,
        );
      },
      onPageComplete: (pageNumber, items, state) => {
        console.log(
          `✅ Page ${pageNumber + 1} completed: ${items.length} new videos found`,
        );
      },
      onItemsExtracted: (items, pageNumber, state) => {
        console.log(
          `📦 Extracted ${items.length} videos from page ${pageNumber + 1}`,
        );
      },
      onError: (error, pageNumber, state) => {
        console.log(`❌ Error on page ${pageNumber + 1}: ${error}`);
      },
      onComplete: (result) => {
        console.log(
          `🎯 Pagination completed! Total: ${result.items.length} videos in ${result.totalTime}ms`,
        );
      },
    },
  };

  const result: PaginationResult<YouTubeVideo> =
    await parser.extractWithPagination(searchUrl, paginationOptions, {
      timeout: 30000,
      waitForTimeout: 3000,
    });

  displayPaginationResults(result, 'Infinite Scroll');
}

async function testLoadMoreButtonPagination(parser: JSParserService) {
  console.log('🔘 Testing Load More Button Pagination');
  console.log('='.repeat(40));

  // This is a hypothetical example - YouTube uses infinite scroll, not load more buttons
  // But this shows how you would configure load more button pagination
  const searchUrl = 'https://youtube.com/results?search_query=nestjs+tutorial';

  const paginationOptions: PaginatedExtractionOptions<YouTubeVideo> = {
    pagination: {
      type: 'load-more-button',
      maxPages: 2,
      maxItems: 20,
      delay: 3000,
      verbose: true,
      buttonSelector:
        '.load-more-button, .show-more-button, .ytd-continuation-item-renderer',
      alternativeSelectors: [
        '[aria-label*="Show more"]',
        '.ytd-button-renderer button',
        '.yt-spec-button-shape-next',
      ],
      waitAfterClick: 3000,
      waitForSelector: 'ytd-video-renderer, ytd-rich-item-renderer',
    },
    extractItems: async (page: Page, html: string) => {
      return await extractYouTubeVideos(page);
    },
    isDuplicate: (video: YouTubeVideo, existingVideos: YouTubeVideo[]) => {
      return existingVideos.some(
        (existing) => existing.videoUrl === video.videoUrl,
      );
    },
    includeDuplicates: false,
    eventHandlers: {
      onPageStart: (pageNumber, state) => {
        console.log(
          `🔄 Starting page ${pageNumber + 1} (Total items so far: ${state.totalItems})`,
        );
      },
      onPageComplete: (pageNumber, items, state) => {
        console.log(
          `✅ Page ${pageNumber + 1} completed: ${items.length} new videos found`,
        );
      },
      onError: (error, pageNumber, state) => {
        console.log(`❌ Error on page ${pageNumber + 1}: ${error}`);
      },
      onComplete: (result) => {
        console.log(
          `🎯 Pagination completed! Total: ${result.items.length} videos in ${result.totalTime}ms`,
        );
      },
    },
  };

  const result: PaginationResult<YouTubeVideo> =
    await parser.extractWithPagination(searchUrl, paginationOptions, {
      timeout: 30000,
      waitForTimeout: 3000,
    });

  displayPaginationResults(result, 'Load More Button');
}

async function extractYouTubeVideos(page: Page): Promise<YouTubeVideo[]> {
  return await page.evaluate(() => {
    const videos: YouTubeVideo[] = [];

    // Extract video data using YouTube's current selectors
    const videoElements = document.querySelectorAll(
      'ytd-video-renderer, ytd-rich-item-renderer',
    );

    videoElements.forEach((element) => {
      try {
        const titleElement = element.querySelector(
          '#video-title, #video-title-link',
        );
        const channelElement = element.querySelector(
          '#channel-name a, .ytd-channel-name a',
        );
        const viewsElement = element.querySelector(
          '#metadata-line span:first-child, .inline-metadata-item:first-child',
        );
        const durationElement = element.querySelector(
          '.ytd-thumbnail-overlay-time-status-renderer, .badge-shape-wiz__text',
        );
        const uploadTimeElement = element.querySelector(
          '#metadata-line span:last-child, .inline-metadata-item:last-child',
        );
        const thumbnailElement = element.querySelector('img');
        const linkElement = element.querySelector(
          '#video-title, #video-title-link',
        );
        const descriptionElement = element.querySelector(
          '#description-text, .metadata-snippet-text',
        );

        if (titleElement && channelElement) {
          const title = titleElement.textContent?.trim() || '';
          const channel = channelElement.textContent?.trim() || '';
          const views = viewsElement?.textContent?.trim() || '';
          const duration = durationElement?.textContent?.trim() || '';
          const uploadTime = uploadTimeElement?.textContent?.trim() || '';
          const thumbnail = thumbnailElement?.getAttribute('src') || '';
          const videoUrl = linkElement?.getAttribute('href') || '';
          const description = descriptionElement?.textContent?.trim() || '';

          if (title && channel && title.length > 3) {
            videos.push({
              title,
              channel,
              views,
              duration,
              uploadTime,
              thumbnail,
              videoUrl: videoUrl.startsWith('/')
                ? `https://youtube.com${videoUrl}`
                : videoUrl,
              description: description.length > 10 ? description : undefined,
            });
          }
        }
      } catch (error) {
        // Skip this video if extraction fails
      }
    });

    return videos;
  });
}

function displayPaginationResults(
  result: PaginationResult<YouTubeVideo>,
  strategy: string,
) {
  console.log(`\n📊 ${strategy} Pagination Results:`);
  console.log('='.repeat(50));
  console.log(`✅ Completed: ${result.completed}`);
  console.log(`📄 Pages processed: ${result.pagesProcessed}`);
  console.log(`🎥 Total videos: ${result.items.length}`);
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

  console.log(`\n🎯 Sample Videos (showing first 5):`);
  result.items.slice(0, 5).forEach((video, index) => {
    console.log(`\n📹 Video ${index + 1}:`);
    console.log(`   title: ${video.title.substring(0, 60)}...`);
    console.log(`   channel: ${video.channel}`);
    console.log(`   views: ${video.views}`);
    console.log(`   duration: ${video.duration}`);
    console.log(`   uploaded: ${video.uploadTime}`);
    if (video.description) {
      console.log(`   description: ${video.description.substring(0, 80)}...`);
    }
  });

  // Summary statistics
  console.log(`\n📈 Summary Statistics:`);
  console.log(
    `   Videos with views: ${result.items.filter((v) => v.views && v.views !== '').length}`,
  );
  console.log(
    `   Videos with descriptions: ${result.items.filter((v) => v.description).length}`,
  );
  console.log(
    `   Unique channels: ${new Set(result.items.map((v) => v.channel)).size}`,
  );

  const durations = result.items.filter(
    (v) => v.duration && v.duration.includes(':'),
  );
  console.log(`   Videos with duration: ${durations.length}`);

  const averageTitleLength =
    result.items.reduce((sum, v) => sum + v.title.length, 0) /
    result.items.length;
  console.log(
    `   Average title length: ${averageTitleLength.toFixed(0)} characters`,
  );
}

// Export the demo function
export { demonstrateYouTubePagination };

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateYouTubePagination().catch((error) =>
    console.error('\n💥 Demo failed:', (error as Error).message),
  );
}
