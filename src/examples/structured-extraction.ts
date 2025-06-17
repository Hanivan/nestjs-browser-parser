import { BrowserParserService } from '../browser-parser.service';

async function demonstrateStructuredExtraction() {
  const parser = new BrowserParserService({
    loggerLevel: ['log', 'error', 'debug'],
    headless: true,
    browserConnection: {
      type: 'builtin',
      executablePath: '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  });

  try {
    console.log('🚀 NestJS Browser Parser - Structured Data Extraction Demo\n');

    // Example 1: Basic structured extraction
    console.log('1. Basic Structured Extraction');
    console.log('==============================');

    const response = await parser.fetchHtml('https://httpbin.org/html');

    interface BasicData {
      title: string;
      headings: string[];
      firstParagraph: string;
      allLinks: string[];
    }

    const basicData = parser.extractStructuredFromHtml<BasicData>(
      response.html,
      {
        title: {
          selector: 'title',
          type: 'css',
        },
        headings: {
          selector: 'h1, h2, h3',
          type: 'css',
          multiple: true,
        },
        firstParagraph: {
          selector: 'p',
          type: 'css',
        },
        allLinks: {
          selector: 'a',
          type: 'css',
          attribute: 'href',
          multiple: true,
        },
      },
    );

    console.log('📊 Basic structured data:');
    console.log(`   Title: ${basicData.title}`);
    console.log(`   Headings: ${basicData.headings?.length || 0} found`);
    console.log(
      `   First paragraph: ${basicData.firstParagraph?.substring(0, 100) || 'None'}...`,
    );
    console.log(`   Links: ${basicData.allLinks?.length || 0} found`);

    // Example 2: Transform functions
    console.log('\n2. Using Transform Functions');
    console.log('============================');

    interface TransformedData {
      title: string;
      linkCount: number;
      wordCount: number;
      hasImages: boolean;
    }

    const transformedData = parser.extractStructuredFromHtml<TransformedData>(
      response.html,
      {
        title: {
          selector: 'title',
          type: 'css',
          transform: (value: string) => value.toUpperCase(),
        },
        linkCount: {
          selector: 'a',
          type: 'css',
          multiple: true,
          transform: (links: string[]) => links.length,
        },
        wordCount: {
          selector: 'body',
          type: 'css',
          transform: (text: string) => text.split(/\s+/).length,
        },
        hasImages: {
          selector: 'img',
          type: 'css',
          multiple: true,
          transform: (images: string[]) => images.length > 0,
        },
      },
    );

    console.log('🔄 Transformed data:');
    console.log(`   Title (uppercase): ${transformedData.title}`);
    console.log(`   Link count: ${transformedData.linkCount}`);
    console.log(`   Word count: ${transformedData.wordCount}`);
    console.log(`   Has images: ${transformedData.hasImages}`);

    // Example 3: Raw HTML extraction
    console.log('\n3. Raw HTML Extraction');
    console.log('======================');

    interface RawData {
      firstHeadingHtml: string | null;
      allListItemsHtml: string[];
    }

    const rawData = parser.extractStructuredFromHtml<RawData>(response.html, {
      firstHeadingHtml: {
        selector: 'h1',
        type: 'css',
        raw: true,
      },
      allListItemsHtml: {
        selector: 'li',
        type: 'css',
        raw: true,
        multiple: true,
      },
    });

    console.log('🔧 Raw HTML data:');
    console.log(`   First heading HTML: ${rawData.firstHeadingHtml || 'None'}`);
    console.log(
      `   List items HTML: ${rawData.allListItemsHtml?.length || 0} found`,
    );
    if (rawData.allListItemsHtml?.length) {
      console.log(`   First list item: ${rawData.allListItemsHtml[0]}`);
    }

    // Example 4: Complex news-like site extraction
    console.log('\n4. Complex Website Extraction');
    console.log('==============================');

    try {
      const newsResponse = await parser.fetchHtml('https://example.com');

      interface SiteData {
        siteName: string;
        description: string | null;
        keywords: string | null;
        canonicalUrl: string | null;
        ogTitle: string | null;
        ogImage: string | null;
        allHeadings: string[];
        navigationLinks: string[];
        externalLinks: string[];
        imageCount: number;
      }

      const siteData = parser.extractStructuredFromHtml<SiteData>(
        newsResponse.html,
        {
          siteName: {
            selector: 'title',
            type: 'css',
          },
          description: {
            selector: 'meta[name="description"]',
            type: 'css',
            attribute: 'content',
          },
          keywords: {
            selector: 'meta[name="keywords"]',
            type: 'css',
            attribute: 'content',
          },
          canonicalUrl: {
            selector: 'link[rel="canonical"]',
            type: 'css',
            attribute: 'href',
          },
          ogTitle: {
            selector: 'meta[property="og:title"]',
            type: 'css',
            attribute: 'content',
          },
          ogImage: {
            selector: 'meta[property="og:image"]',
            type: 'css',
            attribute: 'content',
          },
          allHeadings: {
            selector: 'h1, h2, h3, h4, h5, h6',
            type: 'css',
            multiple: true,
          },
          navigationLinks: {
            selector: 'nav a',
            type: 'css',
            attribute: 'href',
            multiple: true,
          },
          externalLinks: {
            selector: 'a[href^="http"]',
            type: 'css',
            attribute: 'href',
            multiple: true,
          },
          imageCount: {
            selector: 'img',
            type: 'css',
            multiple: true,
            transform: (images: string[]) => images.length,
          },
        },
      );

      console.log('🌐 Website analysis:');
      console.log(`   Site name: ${siteData.siteName}`);
      console.log(`   Description: ${siteData.description || 'Not set'}`);
      console.log(`   Keywords: ${siteData.keywords || 'Not set'}`);
      console.log(`   Canonical URL: ${siteData.canonicalUrl || 'Not set'}`);
      console.log(`   OG Title: ${siteData.ogTitle || 'Not set'}`);
      console.log(`   OG Image: ${siteData.ogImage || 'Not set'}`);
      console.log(`   Headings: ${siteData.allHeadings?.length || 0}`);
      console.log(
        `   Navigation links: ${siteData.navigationLinks?.length || 0}`,
      );
      console.log(`   External links: ${siteData.externalLinks?.length || 0}`);
      console.log(`   Images: ${siteData.imageCount}`);
    } catch (error) {
      console.log(`⚠️ Could not analyze complex site: ${error.message}`);
    }

    // Example 5: E-commerce like extraction
    console.log('\n5. E-commerce Style Extraction');
    console.log('===============================');

    interface EcommerceData {
      productTitle: string | null;
      price: number;
      availability: string | null;
      productImages: string[];
      specifications: string[];
      reviews: { count: number; firstReview: string | null };
    }

    const ecommerceData = parser.extractStructuredFromHtml<EcommerceData>(
      response.html,
      {
        productTitle: {
          selector: 'h1',
          type: 'css',
        },
        price: {
          selector: '.price, [class*="price"]',
          type: 'css',
          transform: (value: string) => {
            const match = value?.match(/[\d.,]+/);
            return match ? parseFloat(match[0].replace(',', '')) : 0;
          },
        },
        availability: {
          selector: '.availability, .stock',
          type: 'css',
        },
        productImages: {
          selector: 'img[src*="product"], .product-image img',
          type: 'css',
          attribute: 'src',
          multiple: true,
        },
        specifications: {
          selector: '.specs li, .specifications li',
          type: 'css',
          multiple: true,
        },
        reviews: {
          selector: '.review, .customer-review',
          type: 'css',
          multiple: true,
          transform: (reviews: string[]) => ({
            count: reviews.length,
            firstReview: reviews[0] || null,
          }),
        },
      },
    );

    console.log('🛒 E-commerce style data:');
    console.log(
      `   Product title: ${ecommerceData.productTitle || 'Not found'}`,
    );
    console.log(`   Price: ${ecommerceData.price || 'Not found'}`);
    console.log(
      `   Availability: ${ecommerceData.availability || 'Not found'}`,
    );
    console.log(
      `   Product images: ${ecommerceData.productImages?.length || 0}`,
    );
    console.log(
      `   Specifications: ${ecommerceData.specifications?.length || 0}`,
    );
    console.log(
      `   Reviews: ${JSON.stringify(ecommerceData.reviews) || 'None'}`,
    );

    // Example 6: SEO analysis extraction
    console.log('\n6. SEO Analysis Extraction');
    console.log('===========================');

    const seoData = parser.extractStructuredFromHtml(response.html, {
      titleLength: {
        selector: 'title',
        type: 'css',
        transform: (title: string) => title?.length || 0,
      },
      hasH1: {
        selector: 'h1',
        type: 'css',
        multiple: true,
        transform: (headings: string[]) => headings.length > 0,
      },
      h1Count: {
        selector: 'h1',
        type: 'css',
        multiple: true,
        transform: (headings: string[]) => headings.length,
      },
      metaDescription: {
        selector: 'meta[name="description"]',
        type: 'css',
        attribute: 'content',
      },
      metaDescriptionLength: {
        selector: 'meta[name="description"]',
        type: 'css',
        attribute: 'content',
        transform: (desc: string) => desc?.length || 0,
      },
      altTextMissing: {
        selector: 'img:not([alt]), img[alt=""]',
        type: 'css',
        multiple: true,
        transform: (images: string[]) => images.length,
      },
      internalLinks: {
        selector: 'a[href^="/"], a[href^="./"], a[href^="../"]',
        type: 'css',
        multiple: true,
        transform: (links: string[]) => links.length,
      },
      externalLinksCount: {
        selector: 'a[href^="http"]',
        type: 'css',
        multiple: true,
        transform: (links: string[]) => links.length,
      },
    });

    console.log('🔍 SEO analysis:');
    console.log(`   Title length: ${seoData.titleLength} chars`);
    console.log(`   Has H1: ${seoData.hasH1 ? 'Yes' : 'No'}`);
    console.log(`   H1 count: ${seoData.h1Count}`);
    console.log(
      `   Meta description: ${seoData.metaDescription ? 'Present' : 'Missing'}`,
    );
    console.log(`   Meta desc length: ${seoData.metaDescriptionLength} chars`);
    console.log(`   Images missing alt text: ${seoData.altTextMissing}`);
    console.log(`   Internal links: ${seoData.internalLinks}`);
    console.log(`   External links: ${seoData.externalLinksCount}`);

    // Example 7: Performance metrics via structured extraction
    console.log('\n7. Performance Metrics Extraction');
    console.log('==================================');

    const performanceData = parser.extractStructuredFromHtml(response.html, {
      totalElements: {
        selector: '*',
        type: 'css',
        multiple: true,
        transform: (elements: string[]) => elements.length,
      },
      scriptTags: {
        selector: 'script',
        type: 'css',
        multiple: true,
        transform: (scripts: string[]) => scripts.length,
      },
      stylesheets: {
        selector: 'link[rel="stylesheet"]',
        type: 'css',
        multiple: true,
        transform: (styles: string[]) => styles.length,
      },
      inlineStyles: {
        selector: 'style',
        type: 'css',
        multiple: true,
        transform: (styles: string[]) => styles.length,
      },
      imageElements: {
        selector: 'img',
        type: 'css',
        multiple: true,
        transform: (images: string[]) => images.length,
      },
      totalTextLength: {
        selector: 'body',
        type: 'css',
        transform: (text: string) => text?.length || 0,
      },
    });

    console.log('⚡ Performance metrics:');
    console.log(`   Total DOM elements: ${performanceData.totalElements}`);
    console.log(`   Script tags: ${performanceData.scriptTags}`);
    console.log(`   Stylesheets: ${performanceData.stylesheets}`);
    console.log(`   Inline styles: ${performanceData.inlineStyles}`);
    console.log(`   Images: ${performanceData.imageElements}`);
    console.log(
      `   Total text length: ${performanceData.totalTextLength} chars`,
    );

    console.log('\n🎉 Structured extraction demonstration completed!');
  } catch (error) {
    console.error(
      '❌ Error demonstrating structured extraction:',
      error.message,
    );
  } finally {
    await parser.cleanup();
  }
}

// Export the demo function
export { demonstrateStructuredExtraction };

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateStructuredExtraction().catch((error) =>
    console.error('\n💥 Demo failed:', error.message),
  );
}
