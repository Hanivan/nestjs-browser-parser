import { BrowserParserService } from '../browser-parser.service';

async function demonstrateBasicParsing() {
  const parser = new BrowserParserService({
    loggerLevel: ['log', 'error', 'debug'],
    headless: false,
    browserConnection: {
      type: 'builtin',
      executablePath: '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  });

  try {
    console.log('🚀 NestJS Browser Parser - Basic Parsing Demo\n');

    // Example 1: Basic HTML fetching with JavaScript
    console.log('1. Basic HTML Fetching with JavaScript');
    console.log('======================================');

    const response = await parser.fetchHtml('https://example.com', {
      verbose: true,
      timeout: 15000,
    });

    console.log(`✅ Successfully fetched: ${response.url}`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📄 Content length: ${response.html.length} characters`);
    console.log(`🍪 Cookies: ${response.cookies.length} found`);

    // Example 2: Extract basic information using structured extraction
    console.log('\n2. Basic Information Extraction');
    console.log('===============================');

    interface BasicInfo {
      title: string;
      metaDescription: string | null;
      allLinks: string[];
      headings: string[];
      paragraphs: string[];
      hasNavigation: boolean;
      hasFooter: boolean;
      hasImages: boolean;
    }

    const basicInfo = parser.extractStructuredFromHtml<BasicInfo>(
      response.html,
      {
        title: {
          selector: 'title',
          type: 'css',
        },
        metaDescription: {
          selector: 'meta[name="description"]',
          type: 'css',
          attribute: 'content',
        },
        allLinks: {
          selector: 'a',
          type: 'css',
          attribute: 'href',
          multiple: true,
        },
        headings: {
          selector: 'h1, h2, h3',
          type: 'css',
          multiple: true,
        },
        paragraphs: {
          selector: 'p',
          type: 'css',
          multiple: true,
        },
        hasNavigation: {
          selector: 'nav',
          type: 'css',
          multiple: true,
          transform: (navs: string[]) => navs.length > 0,
        },
        hasFooter: {
          selector: 'footer',
          type: 'css',
          multiple: true,
          transform: (footers: string[]) => footers.length > 0,
        },
        hasImages: {
          selector: 'img',
          type: 'css',
          multiple: true,
          transform: (images: string[]) => images.length > 0,
        },
      },
    );

    console.log(`📋 Page Title: ${basicInfo.title}`);
    console.log(
      `📝 Meta Description: ${basicInfo.metaDescription || 'Not found'}`,
    );
    console.log(`🔗 Links found: ${basicInfo.allLinks.length}`);
    if (basicInfo.allLinks.length > 0) {
      console.log(
        `   First 3 links: ${basicInfo.allLinks.slice(0, 3).join(', ')}`,
      );
    }

    // Example 3: CSS Selector Results
    console.log('\n3. CSS Selector Results');
    console.log('=======================');

    console.log(`📑 Headings found (CSS): ${basicInfo.headings.length}`);
    basicInfo.headings.forEach((heading, index) => {
      console.log(`   ${index + 1}. ${heading}`);
    });

    console.log(`📄 Paragraphs found: ${basicInfo.paragraphs.length}`);
    if (basicInfo.paragraphs.length > 0) {
      console.log(
        `   First paragraph: ${basicInfo.paragraphs[0].substring(0, 100)}...`,
      );
    }

    // Example 4: Element Existence Checks
    console.log('\n4. Element Existence Checks');
    console.log('============================');

    console.log(`🧭 Has navigation: ${basicInfo.hasNavigation ? 'Yes' : 'No'}`);
    console.log(`👟 Has footer: ${basicInfo.hasFooter ? 'Yes' : 'No'}`);
    console.log(`🖼️ Has images: ${basicInfo.hasImages ? 'Yes' : 'No'}`);

    // Example 5: Response headers analysis
    console.log('\n5. Response Headers Analysis');
    console.log('============================');

    console.log('📨 Key Headers:');
    const importantHeaders = [
      'server',
      'content-type',
      'content-length',
      'date',
    ];
    importantHeaders.forEach((header) => {
      const value = response.headers[header];
      console.log(`   ${header}: ${value || 'Not set'}`);
    });

    // Example 6: Structured data extraction
    console.log('\n6. Structured Data Extraction');
    console.log('==============================');

    interface PageData {
      title: string;
      description: string | null;
      links: string[];
      headings: string[];
    }

    const pageData = parser.extractStructuredFromHtml<PageData>(response.html, {
      title: {
        selector: 'title',
        type: 'css',
      },
      description: {
        selector: 'meta[name="description"]',
        type: 'css',
        attribute: 'content',
      },
      links: {
        selector: 'a',
        type: 'css',
        attribute: 'href',
        multiple: true,
      },
      headings: {
        selector: 'h1, h2, h3, h4, h5, h6',
        type: 'css',
        multiple: true,
      },
    });

    console.log('📊 Extracted structured data:');
    console.log(`   Title: ${pageData.title}`);
    console.log(`   Description: ${pageData.description || 'Not found'}`);
    console.log(`   Total links: ${pageData.links?.length || 0}`);
    console.log(`   Total headings: ${pageData.headings?.length || 0}`);

    console.log('\n🎉 Basic parsing demonstration completed!');
  } catch (error) {
    console.error('❌ Error demonstrating basic parsing:', error.message);
  } finally {
    await parser.cleanup();
  }
}

// Export the demo function
export { demonstrateBasicParsing };

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateBasicParsing().catch((error) =>
    console.error('\n💥 Demo failed:', error.message),
  );
}
