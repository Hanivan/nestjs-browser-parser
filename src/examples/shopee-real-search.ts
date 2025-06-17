import { BrowserParserService } from '../browser-parser.service';
import { ExtractionSchema } from '../types';

// Define typed interfaces based on actual Shopee HTML structure
interface ShopeeProductReal {
  name: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  rating?: string;
  location: string;
  imageUrl: string;
  productUrl: string;
  voucher?: string;
}

interface ShopeeSearchResultsReal {
  searchQuery: string;
  products: ShopeeProductReal[];
  totalFound: number;
}

async function demonstrateShopeeRealSearch() {
  const parser = new BrowserParserService({
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
    console.log('🛒 NestJS Browser Parser - Real Shopee Search Demo\n');

    // Test with different search keywords
    const searchQueries = ['laptop', 'smartphone samsung', 'sepatu nike'];

    for (const query of searchQueries.slice(0, 1)) {
      // Test with first query
      await performShopeeSearch(parser, query);

      // Wait between searches to be respectful
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log('\n🎉 Real Shopee search demo completed!');
  } catch (error) {
    console.error('❌ Error demonstrating real Shopee search:', error.message);
  } finally {
    await parser.cleanup();
  }
}

async function performShopeeSearch(
  parser: JSParserService,
  searchQuery: string,
) {
  console.log(`\n🔍 Performing real search for: "${searchQuery}"`);
  console.log('='.repeat(50));

  try {
    // Step 1: Navigate to Shopee homepage
    console.log('📱 Step 1: Opening Shopee homepage...');
    const homepageResponse = await parser.fetchHtml('https://shopee.co.id/', {
      timeout: 30000,
      waitForTimeout: 3000,
      waitUntil: 'load',
    });

    console.log(
      `✅ Homepage loaded: ${homepageResponse.status} ${homepageResponse.statusText}`,
    );

    // Check if we're redirected to login page
    const isLoginPage = await checkForLoginRedirect(
      parser,
      homepageResponse.html,
    );

    if (isLoginPage) {
      console.log(
        '🔒 Detected login page redirect, using alternative search URL...',
      );
      await performDirectSearch(parser, searchQuery);
      return;
    }

    // Step 2: Use JavaScript evaluation to perform search
    console.log(`🔍 Step 2: Searching for "${searchQuery}"...`);

    const searchResult = await parser.evaluateOnPage(
      'https://shopee.co.id/',
      async (page) => {
        // Wait for page to load
        await page.waitForLoadState('networkidle');

        console.log('Page loaded, looking for search input...');

        // Check if we're on login page after page load
        const pageContent = await page.content();
        if (
          pageContent.includes('Log in') &&
          pageContent.includes('Password') &&
          pageContent.includes('Lupa Password')
        ) {
          console.log('Detected login page after page load');
          return {
            url: page.url(),
            title: await page.title(),
            success: false,
            redirectedToLogin: true,
          };
        }

        // Check if shopee-searchbar form is present using XPath
        try {
          const searchbarForm = await page
            .locator("//form[contains(@class, 'shopee-searchbar')]")
            .first();
          const formExists = (await searchbarForm.count()) > 0;

          if (!formExists) {
            console.log(
              'Shopee searchbar form not found, likely redirected to login',
            );
            return {
              url: page.url(),
              title: await page.title(),
              success: false,
              redirectedToLogin: true,
            };
          }
        } catch (formCheckError) {
          console.log('Could not check for searchbar form, continuing...');
        }

        // Wait for search input to be available
        await page.waitForSelector('.shopee-searchbar-input__input', {
          timeout: 10000,
        });

        // Clear and type in the search input
        const searchInput = await page
          .locator('.shopee-searchbar-input__input')
          .first();
        await searchInput.clear();
        await searchInput.fill(searchQuery);

        console.log(`Filled search input with: ${searchQuery}`);

        // Wait a moment for any autocomplete
        await page.waitForTimeout(1000);

        // Click the search button or press Enter
        try {
          // Try clicking the search button first
          const searchButton = await page
            .locator('.shopee-searchbar__search-button')
            .first();
          await searchButton.click();
          console.log('Clicked search button');
        } catch (buttonError) {
          // Fallback to pressing Enter
          await searchInput.press('Enter');
          console.log('Pressed Enter on search input');
        }

        // Wait for search results to load
        console.log('Waiting for search results...');
        await page.waitForTimeout(5000);

        // Check if redirected to login after search
        const currentContent = await page.content();
        if (
          currentContent.includes('Log in') &&
          currentContent.includes('Password') &&
          currentContent.includes('Lupa Password')
        ) {
          console.log('Redirected to login page after search attempt');
          return {
            url: page.url(),
            title: await page.title(),
            success: false,
            redirectedToLogin: true,
          };
        }

        // Wait for product items to appear
        try {
          await page.waitForSelector('.shopee-search-item-result__items', {
            timeout: 15000,
          });
          console.log('Search results container found');
        } catch (waitError) {
          console.log('Search results container not found, continuing...');
        }

        // Get the current URL and page content
        const currentUrl = page.url();
        const pageTitle = await page.title();

        return {
          url: currentUrl,
          title: pageTitle,
          success: true,
          redirectedToLogin: false,
        };
      },
      { timeout: 60000 },
    );

    if (searchResult && searchResult.redirectedToLogin) {
      console.log(
        '🔒 Search was redirected to login page, using alternative method...',
      );
      await performDirectSearch(parser, searchQuery);
      return;
    }

    if (searchResult && searchResult.success) {
      console.log(`✅ Search completed successfully`);
      console.log(`📄 Current URL: ${searchResult.url}`);
      console.log(`📋 Page Title: ${searchResult.title}`);

      // Step 3: Extract product data from search results
      console.log('\n📦 Step 3: Extracting product data...');
      await extractProductsFromSearchResults(
        parser,
        searchResult.url,
        searchQuery,
      );
    } else {
      console.log('❌ Search may not have completed successfully');
    }
  } catch (error) {
    console.error(
      `❌ Error performing search for "${searchQuery}":`,
      error.message,
    );

    // Check if error might be due to login redirect
    if (
      error.message.includes('timeout') ||
      error.message.includes('navigation')
    ) {
      console.log(
        '🔄 Error might be due to login redirect, trying alternative method...',
      );
      await performDirectSearch(parser, searchQuery);
      return;
    }

    // Try to extract any available information
    try {
      console.log('\n🔄 Attempting to get current page information...');
      const fallbackResult = await parser.evaluateOnPage(
        'https://shopee.co.id/',
        async (page) => {
          return {
            url: page.url(),
            title: await page.title(),
            content: (await page.content()).substring(0, 500) + '...',
          };
        },
      );

      console.log('📋 Current page info:');
      console.log(`   URL: ${fallbackResult?.url}`);
      console.log(`   Title: ${fallbackResult?.title}`);
    } catch (fallbackError) {
      console.log('❌ Could not get fallback information');
    }
  }
}

async function checkForLoginRedirect(
  parser: JSParserService,
  html: string,
): Promise<boolean> {
  // Check for login page indicators in HTML
  const loginIndicators = [
    'Log in',
    'Password',
    'Lupa Password',
    'class="EbRIaX">Log in</div>',
    'placeholder="No. Handphone/Username/Email"',
    'placeholder="Password"',
  ];

  // Check if shopee-searchbar form is not present (indicating login redirect)
  const hasSearchbarForm =
    html.includes('shopee-searchbar') ||
    html.includes('class="shopee-searchbar"');

  const hasLoginIndicators = loginIndicators.some((indicator) =>
    html.includes(indicator),
  );

  // Return true if we have login indicators OR if searchbar form is missing
  return hasLoginIndicators || !hasSearchbarForm;
}

async function performDirectSearch(
  parser: JSParserService,
  searchQuery: string,
) {
  console.log(`\n🎯 Using direct search URL method for: "${searchQuery}"`);

  try {
    // Construct direct search URL
    const encodedQuery = encodeURIComponent(searchQuery);
    const directSearchUrl = `https://shopee.co.id/search?keyword=${encodedQuery}`;

    console.log(`🔗 Direct search URL: ${directSearchUrl}`);

    // Fetch the search results directly
    const searchResponse = await parser.fetchHtml(directSearchUrl, {
      timeout: 30000,
      waitForTimeout: 5000,
    });

    console.log(
      `✅ Direct search loaded: ${searchResponse.status} ${searchResponse.statusText}`,
    );

    // Check if still redirected to login
    if (await checkForLoginRedirect(parser, searchResponse.html)) {
      console.log('❌ Still redirected to login page with direct URL method');
      console.log(
        '💡 Suggestion: The website may require authentication or may be blocking automated access',
      );
      return;
    }

    // Extract products from the direct search results
    console.log('\n📦 Extracting products from direct search...');
    await extractProductsFromSearchResults(
      parser,
      directSearchUrl,
      searchQuery,
    );
  } catch (error) {
    console.error(`❌ Error with direct search method:`, error.message);
  }
}

async function extractProductsFromSearchResults(
  parser: JSParserService,
  searchUrl: string,
  searchQuery: string,
) {
  try {
    // Fetch the current search results page
    const response = await parser.fetchHtml(searchUrl, {
      timeout: 30000,
      waitForTimeout: 3000,
    });

    console.log(
      `📄 Search results page loaded: ${response.html.length} characters`,
    );

    // Extract products using the actual HTML structure from your examples
    const productSchema: ExtractionSchema<{
      products: unknown[];
      productNames: string[];
      productPrices: string[];
      productImages: string[];
      productUrls: string[];
      productLocations: string[];
      productRatings: string[];
      productDiscounts: string[];
      productVouchers: string[];
    }> = {
      products: {
        selector: 'li.shopee-search-item-result__item[data-sqe="item"]',
        type: 'css',
        multiple: true,
        transform: (items: string[]) => items,
      },
      productNames: {
        selector:
          'li.shopee-search-item-result__item[data-sqe="item"] .line-clamp-2',
        type: 'css',
        multiple: true,
        transform: (names: string[]) =>
          names
            .map((name) => name.replace(/^.*?(?=[A-Z])/g, '').trim())
            .filter((name) => name.length > 0),
      },
      productPrices: {
        selector:
          'li.shopee-search-item-result__item[data-sqe="item"] .text-shopee-primary .truncate span',
        type: 'css',
        multiple: true,
        transform: (prices: string[]) =>
          prices.filter((price) => price.includes('Rp') || /^\d/.test(price)),
      },
      productImages: {
        selector:
          'li.shopee-search-item-result__item[data-sqe="item"] img[alt]:first-of-type',
        type: 'css',
        attribute: 'src',
        multiple: true,
        transform: (images: string[]) =>
          images.filter((img) => img.includes('http')),
      },
      productUrls: {
        selector:
          'li.shopee-search-item-result__item[data-sqe="item"] > div > div > a.contents',
        type: 'css',
        attribute: 'href',
        multiple: true,
        transform: (urls: string[]) =>
          urls.map((url) =>
            url.startsWith('/') ? `https://shopee.co.id${url}` : url,
          ),
      },
      productLocations: {
        selector:
          'li.shopee-search-item-result__item[data-sqe="item"] [aria-label*="location-"]',
        type: 'css',
        attribute: 'aria-label',
        multiple: true,
        transform: (locations: string[]) =>
          locations
            .map((loc) => loc.replace('location-', ''))
            .filter((loc) => loc.length > 0),
      },
      productRatings: {
        selector:
          'li.shopee-search-item-result__item[data-sqe="item"] .text-shopee-black87',
        type: 'css',
        multiple: true,
        transform: (ratings: string[]) =>
          ratings.filter((rating) => /^\d+\.?\d*$/.test(rating.trim())),
      },
      productDiscounts: {
        selector:
          'li.shopee-search-item-result__item[data-sqe="item"] .bg-shopee-pink',
        type: 'css',
        multiple: true,
        transform: (discounts: string[]) =>
          discounts.filter((discount) => discount.includes('%')),
      },
      productVouchers: {
        selector:
          'li.shopee-search-item-result__item[data-sqe="item"] .bg-shopee-voucher-yellow',
        type: 'css',
        multiple: true,
      },
    };

    const extractedData = parser.extractStructuredFromHtml(
      response.html,
      productSchema,
    );

    console.log(`📊 Extraction results:`);
    console.log(
      `   Product containers found: ${extractedData.products.length}`,
    );
    console.log(`   Product names found: ${extractedData.productNames.length}`);
    console.log(
      `   Product prices found: ${extractedData.productPrices.length}`,
    );
    console.log(
      `   Product images found: ${extractedData.productImages.length}`,
    );
    console.log(`   Product URLs found: ${extractedData.productUrls.length}`);
    console.log(
      `   Product locations found: ${extractedData.productLocations.length}`,
    );
    console.log(
      `   Product ratings found: ${extractedData.productRatings.length}`,
    );
    console.log(
      `   Product discounts found: ${extractedData.productDiscounts.length}`,
    );
    console.log(
      `   Product vouchers found: ${extractedData.productVouchers.length}`,
    );

    // Combine data into structured products
    const products = combineProductData(extractedData);

    if (products.length > 0) {
      displayRealProductResults(products, searchQuery);
    } else {
      console.log('\n⚠️ No products found. Trying alternative extraction...');
      await alternativeRealExtraction(parser, response.html);
    }
  } catch (error) {
    console.error('❌ Error extracting products:', error.message);
  }
}

function combineProductData(extractedData: {
  productNames: string[];
  productPrices: string[];
  productImages: string[];
  productUrls: string[];
  productLocations: string[];
  productRatings: string[];
  productDiscounts: string[];
  productVouchers: string[];
}): ShopeeProductReal[] {
  const products: ShopeeProductReal[] = [];
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
      // Build price string
      let priceText = '';
      if (extractedData.productPrices[i * 2]) {
        // Rp symbol
        priceText += extractedData.productPrices[i * 2];
      }
      if (extractedData.productPrices[i * 2 + 1]) {
        // Price amount
        priceText += extractedData.productPrices[i * 2 + 1];
      }

      products.push({
        name: extractedData.productNames[i]?.trim() || 'Unknown Product',
        price: priceText || 'Price not available',
        discount: extractedData.productDiscounts[i]?.trim() || undefined,
        rating: extractedData.productRatings[i]?.trim() || undefined,
        location:
          extractedData.productLocations[i]?.trim() || 'Location not specified',
        imageUrl: extractedData.productImages[i] || '',
        productUrl: extractedData.productUrls[i] || '',
        voucher: extractedData.productVouchers[i]?.trim() || undefined,
      });
    }
  }

  return products;
}

function displayRealProductResults(
  products: ShopeeProductReal[],
  searchQuery: string,
) {
  console.log(`\n🎯 Found ${products.length} products for "${searchQuery}":`);
  console.log('='.repeat(60));

  products.forEach((product, index) => {
    console.log(`\n📦 Product ${index + 1}:`);
    console.log(`   📋 Name: ${product.name}`);
    console.log(`   💰 Price: ${product.price}`);
    if (product.discount) {
      console.log(`   🏷️ Discount: ${product.discount}`);
    }
    if (product.rating) {
      console.log(`   ⭐ Rating: ${product.rating}`);
    }
    console.log(`   📍 Location: ${product.location}`);
    if (product.voucher) {
      console.log(`   🎫 Voucher: ${product.voucher}`);
    }
    if (product.imageUrl) {
      console.log(`   🖼️ Image: ${product.imageUrl.substring(0, 60)}...`);
    }
    if (product.productUrl) {
      console.log(`   🔗 URL: ${product.productUrl.substring(0, 60)}...`);
    }
  });

  // Summary statistics
  console.log(`\n📊 Search Summary for "${searchQuery}":`);
  console.log(`   Total products extracted: ${products.length}`);
  console.log(
    `   Products with prices: ${products.filter((p) => p.price && p.price !== 'Price not available').length}`,
  );
  console.log(
    `   Products with discounts: ${products.filter((p) => p.discount).length}`,
  );
  console.log(
    `   Products with ratings: ${products.filter((p) => p.rating).length}`,
  );
  console.log(
    `   Products with vouchers: ${products.filter((p) => p.voucher).length}`,
  );
  console.log(
    `   Products with images: ${products.filter((p) => p.imageUrl).length}`,
  );
}

async function alternativeRealExtraction(
  parser: JSParserService,
  html: string,
) {
  console.log('\n🔄 Attempting alternative extraction methods...');

  // Try to extract any Shopee-related content
  const alternativeSchema: ExtractionSchema<{
    allShopeeItems: string[];
    allPriceElements: string[];
    allProductLinks: string[];
    pageInfo: string;
  }> = {
    allShopeeItems: {
      selector:
        '[class*="shopee"], [data-testid*="item"], [class*="item"], [class*="product"]',
      type: 'css',
      multiple: true,
      transform: (items: string[]) =>
        items.filter((item) => item.trim().length > 0).slice(0, 10),
    },
    allPriceElements: {
      selector: '[class*="price"], [class*="amount"], span:contains("Rp")',
      type: 'css',
      multiple: true,
      transform: (prices: string[]) =>
        prices
          .filter((price) => price.includes('Rp') || /\d+[.,]\d+/.test(price))
          .slice(0, 10),
    },
    allProductLinks: {
      selector: 'a[href*="/product"], a[href*="-i."]',
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
  console.log(`   Shopee-related items: ${altData.allShopeeItems.length}`);
  console.log(`   Price elements: ${altData.allPriceElements.length}`);
  console.log(`   Product links: ${altData.allProductLinks.length}`);
  console.log(`   Page title: ${altData.pageInfo}`);

  if (altData.allShopeeItems.length > 0) {
    console.log('\n📝 Sample Shopee items found:');
    altData.allShopeeItems.slice(0, 3).forEach((item, index) => {
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
export { demonstrateShopeeRealSearch };

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateShopeeRealSearch().catch((error) =>
    console.error('\n💥 Demo failed:', error.message),
  );
}
