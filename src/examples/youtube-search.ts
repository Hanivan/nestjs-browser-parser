import { BrowserContext, Page } from 'playwright-core';
import { JSParserService } from '../js-parser.service';
import { ExtractionSchema } from '../types';

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
  isLive?: boolean;
  isShort?: boolean;
}

async function demonstrateYouTubeSearch() {
  console.log('🎥 NestJS JS Parser - YouTube Search Demo\n');

  // Test with 3 different search keywords
  const searchKeywords = [
    'javascript tutorial',
    'nestjs guide',
    'typescript basics',
  ];

  for (let i = 0; i < searchKeywords.length; i++) {
    const keyword = searchKeywords[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(
      `🔍 Processing keyword ${i + 1}/${searchKeywords.length}: "${keyword}"`,
    );
    console.log(`${'='.repeat(60)}`);

    // Create new parser instance for each search
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
      await performYouTubeSearchWithPageControl(parser, keyword);
    } catch (error) {
      console.error(
        `❌ Error processing keyword "${keyword}":`,
        (error as Error).message,
      );
    } finally {
      // Always close the parser after each search
      console.log(`\n🧹 Closing browser for keyword "${keyword}"...`);
      await parser.cleanup();
      console.log(`✅ Browser closed for keyword "${keyword}"`);

      // Wait between searches to be respectful
      if (i < searchKeywords.length - 1) {
        console.log('\n⏳ Waiting 3 seconds before next search...');
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  console.log('\n🎉 YouTube search demo completed for all keywords!');
}

async function performYouTubeSearchWithPageControl(
  parser: JSParserService,
  searchQuery: string,
) {
  console.log(`\n🔍 Performing YouTube search for: "${searchQuery}"`);
  console.log('='.repeat(50));

  let page: Page | null = null;
  let context: BrowserContext | null = null;

  try {
    // Step 1: Open YouTube and get page control
    console.log('📱 Step 1: Opening YouTube homepage...');
    const { page: youtubePage, context: youtubeContext } = await parser.getPage(
      'https://youtube.com/',
      {
        timeout: 30000,
        waitForTimeout: 3000,
        waitUntil: 'load',
      },
    );

    page = youtubePage;
    context = youtubeContext;

    console.log(`✅ YouTube page opened - you now have control!`);
    console.log(`📄 Current URL: ${page?.url()}`);
    console.log(`📋 Page Title: ${await page?.title()}`);

    // Step 2: Perform search and extract results
    if (page) {
      await performSearchOnYouTubePage(page, searchQuery);
    }

    // Extract and display results
    console.log('\n📦 Extracting video data...');
    const html = await page?.content();
    if (html) {
      await extractVideosFromCurrentPage(parser, html, searchQuery);
    }

    // Page remains open for a moment to see results
    console.log('\n🎯 Keeping page open for 5 seconds to see results...');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  } catch (error) {
    console.error(
      `❌ Error in search with page control:`,
      (error as Error).message,
    );
  } finally {
    // Clean up when done
    if (page && context) {
      console.log('\n🧹 Closing page and context...');
      await parser.closePage(page, context);
      console.log('✅ Page closed successfully');
    }
  }
}

async function performSearchOnYouTubePage(page: Page, searchQuery: string) {
  try {
    console.log(`🔍 Searching for "${searchQuery}" on YouTube...`);

    // Wait for search input to be available - using the actual YouTube structure
    await page.waitForSelector(
      'input[name="search_query"], .ytSearchboxComponentInput',
      {
        timeout: 10000,
      },
    );

    // Clear and type in the search input using the correct selector
    const searchInput = page
      .locator('input[name="search_query"], .ytSearchboxComponentInput')
      .first();
    await searchInput.clear();
    await searchInput.fill(searchQuery);

    console.log(`Filled search input with: ${searchQuery}`);

    // Wait a moment for any autocomplete
    await page.waitForTimeout(1000);

    // Click the search button using the actual YouTube structure
    try {
      const searchButton = page
        .locator(
          '.ytSearchboxComponentSearchButton, button[aria-label="Search"]',
        )
        .first();
      await searchButton.click();
      console.log('Clicked search button');
    } catch (buttonError) {
      await searchInput.press('Enter');
      console.log('Pressed Enter on search input');
    }

    // Wait for search results to load
    console.log('Waiting for search results...');
    await page.waitForTimeout(5000);

    // Wait for video items to appear
    try {
      await page.waitForSelector('ytd-video-renderer, ytd-rich-item-renderer', {
        timeout: 15000,
      });
      console.log('✅ Search results loaded successfully');
    } catch (waitError) {
      console.log('⚠️ Search results container not found, but continuing...');
    }
  } catch (error) {
    console.error(
      '❌ Error performing search on YouTube:',
      (error as Error).message,
    );
    throw error;
  }
}

async function extractVideosFromCurrentPage(
  parser: JSParserService,
  html: string,
  searchQuery: string,
) {
  try {
    console.log(`📄 Extracting from current page: ${html.length} characters`);

    // Extract videos using YouTube's HTML structure
    const videoSchema: ExtractionSchema<{
      videos: unknown[];
      videoTitles: string[];
      videoChannels: string[];
      videoViews: string[];
      videoDurations: string[];
      videoUploadTimes: string[];
      videoThumbnails: string[];
      videoUrls: string[];
      videoDescriptions: string[];
    }> = {
      videos: {
        selector: 'ytd-video-renderer, ytd-rich-item-renderer',
        type: 'css',
        multiple: true,
        transform: (items: string[]) => items,
      },
      videoTitles: {
        selector:
          'ytd-video-renderer #video-title, ytd-rich-item-renderer #video-title-link',
        type: 'css',
        multiple: true,
        transform: (titles: string[]) =>
          titles
            .map((title) => title.trim())
            .filter(
              (title) =>
                title.length > 3 &&
                title.length < 300 &&
                !title.includes('function') &&
                !title.includes('window.') &&
                !title.includes('return'),
            ),
      },
      videoChannels: {
        selector:
          'ytd-video-renderer #channel-name a, ytd-rich-item-renderer #channel-name a',
        type: 'css',
        multiple: true,
        transform: (channels: string[]) =>
          channels
            .map((channel) => channel.trim())
            .filter((channel) => channel.length > 0),
      },
      videoViews: {
        selector:
          'ytd-video-renderer #metadata-line span:first-child, ytd-rich-item-renderer #metadata-line span:first-child',
        type: 'css',
        multiple: true,
        transform: (views: string[]) =>
          views
            .filter(
              (view) =>
                view.includes('views') ||
                view.includes('watching') ||
                /^\d+[\d,]*\s*(views|watching)/.test(view.trim()),
            )
            .map((view) => view.trim()),
      },
      videoDurations: {
        selector:
          'ytd-video-renderer .ytd-thumbnail-overlay-time-status-renderer, ytd-rich-item-renderer .ytd-thumbnail-overlay-time-status-renderer',
        type: 'css',
        multiple: true,
        transform: (durations: string[]) =>
          durations
            .filter(
              (duration) =>
                /^\d+:\d+/.test(duration.trim()) || duration.includes('LIVE'),
            )
            .map((duration) => duration.trim()),
      },
      videoUploadTimes: {
        selector:
          'ytd-video-renderer #metadata-line span:last-child, ytd-rich-item-renderer #metadata-line span:last-child',
        type: 'css',
        multiple: true,
        transform: (times: string[]) =>
          times
            .filter(
              (time) =>
                time.includes('ago') ||
                time.includes('hour') ||
                time.includes('day') ||
                time.includes('week') ||
                time.includes('month') ||
                time.includes('year'),
            )
            .map((time) => time.trim()),
      },
      videoThumbnails: {
        selector: 'ytd-video-renderer img, ytd-rich-item-renderer img',
        type: 'css',
        attribute: 'src',
        multiple: true,
        transform: (thumbnails: string[]) =>
          thumbnails.filter(
            (thumb) =>
              thumb.includes('ytimg.com') || thumb.includes('youtube.com'),
          ),
      },
      videoUrls: {
        selector:
          'ytd-video-renderer #video-title, ytd-rich-item-renderer #video-title-link',
        type: 'css',
        attribute: 'href',
        multiple: true,
        transform: (urls: string[]) =>
          urls
            .filter((url) => url && url.length > 5)
            .map((url) =>
              url.startsWith('/') ? `https://youtube.com${url}` : url,
            ),
      },
      videoDescriptions: {
        selector:
          'ytd-video-renderer #description-text, ytd-rich-item-renderer #description-text',
        type: 'css',
        multiple: true,
        transform: (descriptions: string[]) =>
          descriptions
            .map((desc) => desc.trim())
            .filter((desc) => desc.length > 10 && desc.length < 500)
            .slice(0, 20),
      },
    };

    const extractedData = parser.extractStructuredFromHtml(html, videoSchema);

    console.log(`📊 Extraction results:`);
    console.log(`   Video containers found: ${extractedData.videos.length}`);
    console.log(`   Video titles found: ${extractedData.videoTitles.length}`);
    console.log(
      `   Video channels found: ${extractedData.videoChannels.length}`,
    );
    console.log(`   Video views found: ${extractedData.videoViews.length}`);
    console.log(
      `   Video durations found: ${extractedData.videoDurations.length}`,
    );
    console.log(
      `   Video upload times found: ${extractedData.videoUploadTimes.length}`,
    );
    console.log(
      `   Video thumbnails found: ${extractedData.videoThumbnails.length}`,
    );
    console.log(`   Video URLs found: ${extractedData.videoUrls.length}`);
    console.log(
      `   Video descriptions found: ${extractedData.videoDescriptions.length}`,
    );

    // Combine data into structured videos
    const videos = combineYouTubeVideoData(extractedData);

    if (videos.length > 0) {
      displayYouTubeVideoResults(videos, searchQuery);
    } else {
      console.log('\n⚠️ No videos found. Trying alternative extraction...');
      await alternativeYouTubeExtraction(parser, html);
    }
  } catch (error) {
    console.error('❌ Error extracting videos:', (error as Error).message);
  }
}

function combineYouTubeVideoData(extractedData: {
  videoTitles: string[];
  videoChannels: string[];
  videoViews: string[];
  videoDurations: string[];
  videoUploadTimes: string[];
  videoThumbnails: string[];
  videoUrls: string[];
  videoDescriptions: string[];
}): YouTubeVideo[] {
  const videos: YouTubeVideo[] = [];
  const maxLength = Math.max(
    extractedData.videoTitles.length,
    extractedData.videoChannels.length,
    extractedData.videoThumbnails.length,
    extractedData.videoUrls.length,
  );

  for (let i = 0; i < Math.min(maxLength, 15); i++) {
    if (
      extractedData.videoTitles[i] &&
      (extractedData.videoChannels[i] || extractedData.videoThumbnails[i])
    ) {
      videos.push({
        title: extractedData.videoTitles[i]?.trim() || 'Unknown Title',
        channel: extractedData.videoChannels[i]?.trim() || 'Unknown Channel',
        views: extractedData.videoViews[i]?.trim() || 'Views not available',
        duration:
          extractedData.videoDurations[i]?.trim() || 'Duration not available',
        uploadTime:
          extractedData.videoUploadTimes[i]?.trim() ||
          'Upload time not available',
        thumbnail: extractedData.videoThumbnails[i] || '',
        videoUrl: extractedData.videoUrls[i] || '',
        description: extractedData.videoDescriptions[i]?.trim() || undefined,
        isLive: extractedData.videoDurations[i]?.includes('LIVE') || false,
        isShort:
          extractedData.videoDurations[i]?.includes(':') &&
          parseInt(extractedData.videoDurations[i]?.split(':')[0] || '0') ===
            0 &&
          parseInt(extractedData.videoDurations[i]?.split(':')[1] || '0') <= 60,
      });
    }
  }

  return videos;
}

function displayYouTubeVideoResults(
  videos: YouTubeVideo[],
  searchQuery: string,
) {
  console.log(`\n🎯 Found ${videos.length} videos for "${searchQuery}":`);
  console.log('='.repeat(60));

  videos.forEach((video, index) => {
    console.log(`\n📹 Video ${index + 1}:`);
    console.log(`title: ${video.title}`);
    console.log(`channel: ${video.channel}`);
    console.log(`views: ${video.views}`);
    console.log(`duration: ${video.duration}`);
    console.log(`uploaded: ${video.uploadTime}`);
    if (video.description) {
      console.log(`description: ${video.description.substring(0, 100)}...`);
    }
    if (video.isLive) {
      console.log(`status: 🔴 LIVE`);
    }
    if (video.isShort) {
      console.log(`type: 🩳 Short`);
    }
    if (video.thumbnail) {
      console.log(`thumbnail: ${video.thumbnail.substring(0, 60)}...`);
    }
    if (video.videoUrl) {
      console.log(`url: ${video.videoUrl.substring(0, 60)}...`);
    }
  });

  // Summary statistics
  console.log(`\n📊 Search Summary for "${searchQuery}":`);
  console.log(`   Total videos extracted: ${videos.length}`);
  console.log(
    `   Videos with views: ${videos.filter((v) => v.views && v.views !== 'Views not available').length}`,
  );
  console.log(
    `   Videos with descriptions: ${videos.filter((v) => v.description).length}`,
  );
  console.log(`   Live videos: ${videos.filter((v) => v.isLive).length}`);
  console.log(`   Short videos: ${videos.filter((v) => v.isShort).length}`);
  console.log(
    `   Videos with thumbnails: ${videos.filter((v) => v.thumbnail).length}`,
  );
}

async function alternativeYouTubeExtraction(
  parser: JSParserService,
  html: string,
) {
  console.log('\n🔄 Attempting alternative extraction methods...');

  // Try to extract any YouTube-related content
  const alternativeSchema: ExtractionSchema<{
    allYouTubeItems: string[];
    allVideoLinks: string[];
    allChannelLinks: string[];
    pageInfo: string;
  }> = {
    allYouTubeItems: {
      selector:
        '[class*="video"], [class*="ytd-"], [data-testid*="video"], [class*="item"]',
      type: 'css',
      multiple: true,
      transform: (items: string[]) =>
        items.filter((item) => item.trim().length > 0).slice(0, 10),
    },
    allVideoLinks: {
      selector: 'a[href*="/watch"], a[href*="youtube.com/watch"]',
      type: 'css',
      attribute: 'href',
      multiple: true,
      transform: (links: string[]) => links.slice(0, 10),
    },
    allChannelLinks: {
      selector: 'a[href*="/channel/"], a[href*="/@"]',
      type: 'css',
      attribute: 'href',
      multiple: true,
      transform: (links: string[]) => links.slice(0, 10),
    },
    pageInfo: {
      selector: 'title',
      type: 'css',
    },
  };

  const altData = parser.extractStructuredFromHtml(html, alternativeSchema);

  console.log('🔍 Alternative extraction results:');
  console.log(`   YouTube-related items: ${altData.allYouTubeItems.length}`);
  console.log(`   Video links: ${altData.allVideoLinks.length}`);
  console.log(`   Channel links: ${altData.allChannelLinks.length}`);
  console.log(`   Page title: ${altData.pageInfo}`);

  if (altData.allYouTubeItems.length > 0) {
    console.log('\n📝 Sample YouTube items found:');
    altData.allYouTubeItems.slice(0, 3).forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.substring(0, 80)}...`);
    });
  }

  if (altData.allVideoLinks.length > 0) {
    console.log('\n🎥 Sample video links found:');
    altData.allVideoLinks.slice(0, 5).forEach((link, index) => {
      console.log(`   ${index + 1}. ${link}`);
    });
  }
}

// Export the demo function
export { demonstrateYouTubeSearch };

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateYouTubeSearch().catch((error) =>
    console.error('\n💥 Demo failed:', (error as Error).message),
  );
}
