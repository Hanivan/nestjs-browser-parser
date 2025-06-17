import { BrowserContext, Page } from 'playwright-core';
import { JSParserService } from '../js-parser.service';
import { ExtractionSchema } from '../types';

// Define typed interfaces based on actual Amazon HTML structure
interface AmazonProductReal {
  name: string;
  price: string;
  desc?: string;
  originalPrice?: string;
  discount?: string;
  rating?: string;
  reviewCount?: string;
  imageUrl: string;
  productUrl: string;
  prime?: boolean;
  brand?: string;
}

interface AmazonSearchResultsReal {
  searchQuery: string;
  products: AmazonProductReal[];
  totalFound: number;
}

async function demonstrateAmazonRealSearch() {
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
    console.log('🛒 NestJS JS Parser - Real Amazon Search Demo\n');

    // Test with different search keywords
    const searchQueries = ['laptop', 'smartphone samsung', 'nike shoes'];

    for (const query of searchQueries.slice(0, 1)) {
      // Test with first query - try page control method first
      try {
        await performAmazonSearchWithPageControl(parser, query);
      } catch (error) {
        console.log('🔄 Page control method failed, trying direct search...');
        await performDirectAmazonSearch(parser, query);
      }

      // Wait between searches to be respectful
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log('\n🎉 Real Amazon search demo completed!');
  } catch (error) {
    console.error('❌ Error demonstrating real Amazon search:', error.message);
  } finally {
    await parser.cleanup();
  }
}

async function performAmazonSearchWithPageControl(
  parser: JSParserService,
  searchQuery: string,
) {
  console.log(
    `\n🔍 Performing Amazon search with page control for: "${searchQuery}"`,
  );
  console.log('='.repeat(50));

  let page: Page | null = null;
  let context: BrowserContext | null = null;

  try {
    // Step 1: Open Amazon and get page control
    console.log('📱 Step 1: Opening Amazon homepage...');
    const { page: amazonPage, context: amazonContext } = await parser.getPage(
      'https://amazon.com/',
      {
        timeout: 30000,
        waitForTimeout: 3000,
        waitUntil: 'load',
      },
    );

    page = amazonPage;
    context = amazonContext;

    console.log(`✅ Amazon page opened - you now have control!`);
    console.log(`📄 Current URL: ${page?.url()}`);
    console.log(`📋 Page Title: ${await page?.title()}`);

    // Step 2: Perform search and extract results
    if (page) {
      await performSearchOnOpenPage(page, searchQuery);
    }

    // Extract and display results
    console.log('\n📦 Extracting product data...');
    const html = await page?.content();
    if (html) {
      await extractProductsFromCurrentPage(parser, html, searchQuery);
    }

    // Page remains open for user interaction
    console.log('\n🎯 Page is still open for your interaction!');
    console.log('💡 You can:');
    console.log('   - Scroll through results');
    console.log('   - Click on products');
    console.log('   - Refine search filters');
    console.log(
      '   - Manually close when done with: await parser.closePage(page, context)',
    );

    // Simulate keeping page open (in real usage, user controls this)
    console.log('\n⏳ Keeping page open for 10 seconds...');
    await new Promise((resolve) => setTimeout(resolve, 10000));
  } catch (error) {
    console.error(`❌ Error in search with page control:`, error.message);
  } finally {
    // Clean up when done
    if (page && context) {
      console.log('\n🧹 Closing page and context...');
      await parser.closePage(page, context);
      console.log('✅ Page closed successfully');
    }
  }
}

async function performSearchOnOpenPage(page: Page, searchQuery: string) {
  try {
    console.log(`🔍 Searching for "${searchQuery}" on open page...`);

    // Wait for search input to be available
    await page.waitForSelector('#twotabsearchtextbox, input[type="text"]', {
      timeout: 10000,
    });

    // Clear and type in the search input
    const searchInput = page.locator('#twotabsearchtextbox').first();
    await searchInput.clear();
    await searchInput.fill(searchQuery);

    console.log(`Filled search input with: ${searchQuery}`);

    // Wait a moment for any autocomplete
    await page.waitForTimeout(1000);

    // Click the search button or press Enter
    try {
      const searchButton = page
        .locator('#nav-search-submit-button, input[type="submit"]')
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

    // Wait for product items to appear
    try {
      await page.waitForSelector('div[data-component-type="s-search-result"]', {
        timeout: 15000,
      });
      console.log('✅ Search results loaded successfully');
    } catch (waitError) {
      console.log('⚠️ Search results container not found, but continuing...');
    }
  } catch (error) {
    console.error('❌ Error performing search on open page:', error.message);
    throw error;
  }
}

async function checkForAmazonBlocking(html: string): Promise<boolean> {
  // Check for Amazon blocking/captcha page indicators in HTML
  const blockingIndicators = [
    'Enter the characters you see below',
    "Sorry, we just need to make sure you're not a robot",
    'To continue shopping, please type the characters',
    'api-services-support@amazon.com',
    'Something went wrong on our end',
  ];

  // Check if Amazon search form is not present (indicating blocking)
  const hasSearchForm =
    html.includes('twotabsearchtextbox') ||
    html.includes('nav-search-bar-form') ||
    html.includes('role="search"');

  const hasBlockingIndicators = blockingIndicators.some((indicator) =>
    html.includes(indicator),
  );

  // Return true if we have blocking indicators OR if search form is missing
  return hasBlockingIndicators || !hasSearchForm;
}

async function performDirectAmazonSearch(
  parser: JSParserService,
  searchQuery: string,
) {
  console.log(`\n🎯 Using direct search URL method for: "${searchQuery}"`);

  try {
    // Construct direct search URL
    const encodedQuery = encodeURIComponent(searchQuery);
    const directSearchUrl = `https://amazon.com/s?k=${encodedQuery}`;

    console.log(`🔗 Direct search URL: ${directSearchUrl}`);

    // Fetch the search results directly
    const searchResponse = await parser.fetchHtml(directSearchUrl, {
      timeout: 30000,
      waitForTimeout: 5000,
      waitUntil: 'load',
    });

    console.log(
      `✅ Direct search loaded: ${searchResponse.status} ${searchResponse.statusText}`,
    );

    // Check if still blocked
    if (await checkForAmazonBlocking(searchResponse.html)) {
      console.log('❌ Still blocked with direct URL method');
      console.log(
        '💡 Suggestion: Amazon may be blocking automated access or requiring captcha verification',
      );
      return;
    }

    // Extract products from the direct search results
    console.log('\n📦 Extracting products from direct search...');
    await extractProductsFromCurrentPage(
      parser,
      searchResponse.html,
      searchQuery,
    );
  } catch (error) {
    console.error(`❌ Error with direct search method:`, error.message);
  }
}

async function extractProductsFromCurrentPage(
  parser: JSParserService,
  html: string,
  searchQuery: string,
) {
  try {
    console.log(`📄 Extracting from current page: ${html.length} characters`);

    // Extract products using Amazon's HTML structure
    const productSchema: ExtractionSchema<{
      products: unknown[];
      productNames: string[];
      productPrices: string[];
      productDescriptions: string[];
      productImages: string[];
      productUrls: string[];
      productRatings: string[];
      productReviews: string[];
      productPrimes: string[];
    }> = {
      products: {
        selector: 'div[data-component-type="s-search-result"]',
        type: 'css',
        multiple: true,
        transform: (items: string[]) => items,
      },
      productNames: {
        selector: 'div[data-component-type="s-search-result"] h2 span',
        type: 'css',
        multiple: true,
        transform: (names: string[]) =>
          names
            .map((name) => name.trim())
            .filter(
              (name) =>
                name.length > 5 &&
                name.length < 300 &&
                !name.includes('Sponsored') &&
                !name.includes('function') &&
                !name.includes('window.') &&
                !name.includes('P.now') &&
                !name.includes('JavaScript') &&
                !name.includes('AmazonUIPageJS'),
            ),
      },
      productPrices: {
        selector:
          'div[data-component-type="s-search-result"] .a-price .a-offscreen',
        type: 'css',
        multiple: true,
        transform: (prices: string[]) =>
          prices
            .filter(
              (price) =>
                price.trim().length > 0 &&
                price.includes('$') &&
                /^\$[\d,]+\.?\d*$/.test(price.trim()),
            )
            .map((price) => price.replace('$', '')),
      },
      productDescriptions: {
        selector: 'div[data-component-type="s-search-result"] h2 span',
        type: 'css',
        multiple: true,
        transform: (descriptions: string[]) =>
          descriptions
            .map((desc) => desc.trim())
            .filter(
              (desc) =>
                desc.length > 20 &&
                desc.length < 500 &&
                !desc.match(/^\d+$/) &&
                !desc.includes('JavaScript') &&
                !desc.includes('window.') &&
                !desc.includes('function') &&
                !desc.includes('P.now') &&
                !desc.includes('Sponsored') &&
                desc.includes(' '), // Must contain spaces (indicating it's a description)
            )
            .slice(0, 20),
      },
      productImages: {
        selector: 'div[data-component-type="s-search-result"] img.s-image',
        type: 'css',
        attribute: 'src',
        multiple: true,
        transform: (images: string[]) =>
          images.filter((img) => img.includes('media-amazon.com')),
      },
      productUrls: {
        selector: 'div[data-component-type="s-search-result"] h2 a',
        type: 'css',
        attribute: 'href',
        multiple: true,
        transform: (urls: string[]) =>
          urls
            .filter((url) => url && url.length > 5)
            .map((url) =>
              url.startsWith('/') ? `https://amazon.com${url}` : url,
            ),
      },
      productRatings: {
        selector: 'div[data-component-type="s-search-result"] .a-icon-alt',
        type: 'css',
        multiple: true,
        transform: (ratings: string[]) =>
          ratings
            .map((rating) => rating.match(/(\d+\.?\d*) out of/)?.[1])
            .filter((rating) => rating !== undefined),
      },
      productReviews: {
        selector:
          'div[data-component-type="s-search-result"] a[aria-label*="ratings"]',
        type: 'css',
        attribute: 'aria-label',
        multiple: true,
        transform: (reviews: string[]) =>
          reviews
            .map((review) => review.match(/(\d+(?:,\d+)*)\s+ratings?/)?.[1])
            .filter((review) => review !== undefined),
      },
      productPrimes: {
        selector: 'div[data-component-type="s-search-result"] .a-icon-prime',
        type: 'css',
        multiple: true,
        transform: (primes: string[]) => primes.map(() => 'Prime'),
      },
    };

    const extractedData = parser.extractStructuredFromHtml(html, productSchema);

    console.log(`📊 Extraction results:`);
    console.log(
      `   Product containers found: ${extractedData.products.length}`,
    );
    console.log(`   Product names found: ${extractedData.productNames.length}`);
    console.log(
      `   Product prices found: ${extractedData.productPrices.length}`,
    );
    console.log(
      `   Product descriptions found: ${extractedData.productDescriptions.length}`,
    );
    console.log(
      `   Product images found: ${extractedData.productImages.length}`,
    );
    console.log(`   Product URLs found: ${extractedData.productUrls.length}`);
    console.log(
      `   Product ratings found: ${extractedData.productRatings.length}`,
    );
    console.log(
      `   Product reviews found: ${extractedData.productReviews.length}`,
    );
    console.log(
      `   Products with Prime found: ${extractedData.productPrimes.length}`,
    );

    // Combine data into structured products
    const products = combineAmazonProductData(extractedData);

    if (products.length > 0) {
      displayAmazonProductResults(products, searchQuery);
    } else {
      console.log('\n⚠️ No products found. Trying alternative extraction...');
      await alternativeAmazonExtraction(parser, html);
    }
  } catch (error) {
    console.error('❌ Error extracting products:', error.message);
  }
}

function combineAmazonProductData(extractedData: {
  productNames: string[];
  productPrices: string[];
  productImages: string[];
  productUrls: string[];
  productDescriptions: string[];
  productRatings: string[];
  productReviews: string[];
  productPrimes: string[];
}): AmazonProductReal[] {
  const products: AmazonProductReal[] = [];
  const maxLength = Math.max(
    extractedData.productNames.length,
    extractedData.productPrices.length,
    extractedData.productImages.length,
    extractedData.productUrls.length,
  );

  for (let i = 0; i < Math.min(maxLength, 20); i++) {
    if (
      extractedData.productNames[i] &&
      (extractedData.productPrices[i] || extractedData.productImages[i])
    ) {
      products.push({
        name: extractedData.productNames[i]?.trim() || 'Unknown Product',
        price: extractedData.productPrices[i]
          ? `$${extractedData.productPrices[i]}`
          : 'Price not available',
        desc: extractedData.productDescriptions[i]?.trim() || undefined,
        rating: extractedData.productRatings[i]?.trim() || undefined,
        reviewCount: extractedData.productReviews[i]?.trim() || undefined,
        imageUrl: extractedData.productImages[i] || '',
        productUrl: extractedData.productUrls[i] || '',
        prime: extractedData.productPrimes[i] ? true : false,
      });
    }
  }

  return products;
}

function displayAmazonProductResults(
  products: AmazonProductReal[],
  searchQuery: string,
) {
  console.log(`\n🎯 Found ${products.length} products for "${searchQuery}":`);
  console.log('='.repeat(60));

  products.forEach((product, index) => {
    console.log(`\n📦 Product ${index + 1}:`);
    console.log(`name: ${product.name}`);
    console.log(`price: ${product.price}`);
    if (product.desc) {
      console.log(`desc: ${product.desc}`);
    }
    if (product.rating) {
      console.log(`rating: ${product.rating}/5`);
    }
    if (product.reviewCount) {
      console.log(`reviews: ${product.reviewCount}`);
    }
    if (product.prime) {
      console.log(`prime: Available`);
    }
    if (product.imageUrl) {
      console.log(`image: ${product.imageUrl}`);
    }
    if (product.productUrl) {
      console.log(`url: ${product.productUrl}`);
    }
  });

  // Summary statistics
  console.log(`\n📊 Search Summary for "${searchQuery}":`);
  console.log(`   Total products extracted: ${products.length}`);
  console.log(
    `   Products with prices: ${products.filter((p) => p.price && p.price !== 'Price not available').length}`,
  );
  console.log(
    `   Products with descriptions: ${products.filter((p) => p.desc).length}`,
  );
  console.log(
    `   Products with ratings: ${products.filter((p) => p.rating).length}`,
  );
  console.log(
    `   Products with Prime: ${products.filter((p) => p.prime).length}`,
  );
  console.log(
    `   Products with images: ${products.filter((p) => p.imageUrl).length}`,
  );
}

async function alternativeAmazonExtraction(
  parser: JSParserService,
  html: string,
) {
  console.log('\n🔄 Attempting alternative extraction methods...');

  // Try to extract any Amazon-related content
  const alternativeSchema: ExtractionSchema<{
    allAmazonItems: string[];
    allPriceElements: string[];
    allProductLinks: string[];
    pageInfo: string;
  }> = {
    allAmazonItems: {
      selector:
        '[class*="s-result"], [data-testid*="product"], [class*="product"], [class*="item"]',
      type: 'css',
      multiple: true,
      transform: (items: string[]) =>
        items.filter((item) => item.trim().length > 0).slice(0, 10),
    },
    allPriceElements: {
      selector:
        '.a-price .a-offscreen, .a-price-whole, [class*="a-price"]:not(script)',
      type: 'css',
      multiple: true,
      transform: (prices: string[]) =>
        prices
          .filter(
            (price) =>
              price.includes('$') &&
              price.length < 20 &&
              !price.includes('function') &&
              !price.includes('window') &&
              /^\$[\d,]+\.?\d*$/.test(price.trim()),
          )
          .slice(0, 10),
    },
    allProductLinks: {
      selector: 'a[href*="/dp/"], a[href*="/gp/product/"]',
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
  console.log(`   Amazon-related items: ${altData.allAmazonItems.length}`);
  console.log(`   Price elements: ${altData.allPriceElements.length}`);
  console.log(`   Product links: ${altData.allProductLinks.length}`);
  console.log(`   Page title: ${altData.pageInfo}`);

  if (altData.allAmazonItems.length > 0) {
    console.log('\n📝 Sample Amazon items found:');
    altData.allAmazonItems.slice(0, 3).forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.substring(0, 80)}...`);
    });
  }

  if (altData.allPriceElements.length > 0) {
    console.log('\n💰 Sample prices found:');
    altData.allPriceElements.slice(0, 5).forEach((price, index) => {
      console.log(`   ${index + 1}. ${price}`);
    });
  }
}

// Export the demo function
export { demonstrateAmazonRealSearch };

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateAmazonRealSearch().catch((error) =>
    console.error('\n💥 Demo failed:', error.message),
  );
}
