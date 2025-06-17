import { BrowserParserService } from '../browser-parser.service';
import { ExtractionSchema } from '../types';

// Define typed interfaces for structured extraction
interface ProductData {
  name: string;
  price: number;
  inStock: boolean;
  tags: string[];
  rating: number;
  description: string;
  imageUrls: string[];
  specifications: Record<string, string>;
}

interface BlogPost {
  title: string;
  author: string;
  publishDate: Date;
  content: string;
  wordCount: number;
  tags: string[];
  readingTime: number;
}

interface SEOMetrics {
  titleLength: number;
  hasH1: boolean;
  h1Count: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  internalLinksCount: number;
  externalLinksCount: number;
  imagesWithoutAlt: number;
}

async function demonstrateEnhancedTyping() {
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
    console.log('🚀 NestJS Browser Parser - Enhanced TypeScript Typing Demo\n');

    // Example 1: Type-safe product extraction
    console.log('1. Type-Safe Product Data Extraction');
    console.log('====================================');

    const productSchema: ExtractionSchema<ProductData> = {
      name: {
        selector: 'h1',
        type: 'css',
      },
      price: {
        selector: '.price',
        type: 'css',
        transform: (value: string) => {
          const match = value.match(/[\d.,]+/);
          return match ? parseFloat(match[0].replace(',', '')) : 0;
        },
      },
      inStock: {
        selector: '.stock-status',
        type: 'css',
        transform: (value: string) => value.toLowerCase().includes('in stock'),
      },
      tags: {
        selector: '.tags .tag',
        type: 'css',
        multiple: true,
      },
      rating: {
        selector: '.rating',
        type: 'css',
        attribute: 'data-rating',
        transform: (value: string) => parseFloat(value) || 0,
      },
      description: {
        selector: '.description',
        type: 'css',
      },
      imageUrls: {
        selector: '.product-images img',
        type: 'css',
        attribute: 'src',
        multiple: true,
      },
      specifications: {
        selector: '.specs dt, .specs dd',
        type: 'css',
        multiple: true,
        transform: (values: string[]) => {
          const specs: Record<string, string> = {};
          for (let i = 0; i < values.length; i += 2) {
            if (values[i] && values[i + 1]) {
              specs[values[i]] = values[i + 1];
            }
          }
          return specs;
        },
      },
    };

    // The result is fully typed as ProductData
    try {
      const productData = await parser.extractStructured(
        'https://example.com',
        productSchema,
      );

      console.log('📦 Product extraction results:');
      console.log(`   Name: ${productData.name}`);
      console.log(`   Price: $${productData.price.toFixed(2)}`); // TypeScript knows price is number
      console.log(`   In Stock: ${productData.inStock ? 'Yes' : 'No'}`); // TypeScript knows inStock is boolean
      console.log(`   Tags: ${productData.tags.join(', ')}`); // TypeScript knows tags is string[]
      console.log(`   Rating: ${productData.rating}/5`);
      console.log(`   Images: ${productData.imageUrls.length} found`);
      console.log(
        `   Specs: ${Object.keys(productData.specifications).length} specifications`,
      );
    } catch (error) {
      console.log(`⚠️ Could not extract product data: ${error.message}`);
    }

    // Example 2: Blog post extraction with date transforms
    console.log('\n2. Blog Post Data with Date Transforms');
    console.log('======================================');

    const blogSchema: ExtractionSchema<BlogPost> = {
      title: {
        selector: 'h1',
        type: 'css',
      },
      author: {
        selector: '.author',
        type: 'css',
      },
      publishDate: {
        selector: '.publish-date',
        type: 'css',
        attribute: 'datetime',
        transform: (value: string) => new Date(value),
      },
      content: {
        selector: '.content',
        type: 'css',
      },
      wordCount: {
        selector: '.content',
        type: 'css',
        transform: (content: string) => content.split(/\s+/).length,
      },
      tags: {
        selector: '.post-tags .tag',
        type: 'css',
        multiple: true,
      },
      readingTime: {
        selector: '.content',
        type: 'css',
        transform: (content: string) =>
          Math.ceil(content.split(/\s+/).length / 200), // Assume 200 words per minute
      },
    };

    try {
      const response = await parser.fetchHtml('https://example.com');
      const blogPost = parser.extractStructuredFromHtml(
        response.html,
        blogSchema,
      );

      console.log('📝 Blog post extraction results:');
      console.log(`   Title: ${blogPost.title}`);
      console.log(`   Author: ${blogPost.author}`);
      console.log(`   Published: ${blogPost.publishDate.toDateString()}`); // TypeScript knows publishDate is Date
      console.log(`   Word count: ${blogPost.wordCount} words`); // TypeScript knows wordCount is number
      console.log(`   Reading time: ${blogPost.readingTime} minutes`);
      console.log(`   Tags: ${blogPost.tags.join(', ')}`);
    } catch (error) {
      console.log(`⚠️ Could not extract blog data: ${error.message}`);
    }

    // Example 3: SEO metrics with complex transformations
    console.log('\n3. SEO Metrics with Complex Transformations');
    console.log('==========================================');

    const seoSchema: ExtractionSchema<SEOMetrics> = {
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
        selector: 'meta[name=\"description\"]',
        type: 'css',
        attribute: 'content',
      },
      metaDescriptionLength: {
        selector: 'meta[name=\"description\"]',
        type: 'css',
        attribute: 'content',
        transform: (desc: string) => desc?.length || 0,
      },
      internalLinksCount: {
        selector: 'a[href^=\"/\"], a[href^=\"./\"], a[href^=\"../\"]',
        type: 'css',
        multiple: true,
        transform: (links: string[]) => links.length,
      },
      externalLinksCount: {
        selector: 'a[href^=\"http\"]',
        type: 'css',
        multiple: true,
        transform: (links: string[]) => links.length,
      },
      imagesWithoutAlt: {
        selector: 'img:not([alt]), img[alt=\"\"]',
        type: 'css',
        multiple: true,
        transform: (images: string[]) => images.length,
      },
    };

    try {
      const response = await parser.fetchHtml('https://httpbin.org/html');
      const seoMetrics = parser.extractStructuredFromHtml(
        response.html,
        seoSchema,
        { verbose: true },
      );

      console.log('🔍 SEO metrics extraction results:');
      console.log(`   Title length: ${seoMetrics.titleLength} chars`);
      console.log(`   Has H1: ${seoMetrics.hasH1 ? 'Yes' : 'No'}`); // TypeScript knows hasH1 is boolean
      console.log(`   H1 count: ${seoMetrics.h1Count}`); // TypeScript knows h1Count is number
      console.log(
        `   Meta description: ${seoMetrics.metaDescription ? 'Present' : 'Missing'}`,
      );
      console.log(
        `   Meta desc length: ${seoMetrics.metaDescriptionLength} chars`,
      );
      console.log(`   Internal links: ${seoMetrics.internalLinksCount}`);
      console.log(`   External links: ${seoMetrics.externalLinksCount}`);
      console.log(`   Images without alt: ${seoMetrics.imagesWithoutAlt}`);
    } catch (error) {
      console.log(`⚠️ Could not extract SEO metrics: ${error.message}`);
    }

    // Example 4: Multiple transform functions in sequence
    console.log('\n4. Multiple Transform Functions');
    console.log('===============================');

    interface ProcessedText {
      originalLength: number;
      cleanedText: string;
      wordCount: number;
      sentences: string[];
    }

    const textProcessingSchema: ExtractionSchema<ProcessedText> = {
      originalLength: {
        selector: 'body',
        type: 'css',
        transform: (text: string) => text.length,
      },
      cleanedText: {
        selector: 'body',
        type: 'css',
        transform: [
          // First transform: clean whitespace
          (text: string) => text.replace(/\s+/g, ' ').trim(),
          // Second transform: remove special characters
          (text: string) => text.replace(/[^\w\s.,!?]/g, ''),
          // Third transform: limit length
          (text: string) => text.substring(0, 500),
        ],
      },
      wordCount: {
        selector: 'body',
        type: 'css',
        transform: (text: string) =>
          text.split(/\s+/).filter((word) => word.length > 0).length,
      },
      sentences: {
        selector: 'body',
        type: 'css',
        transform: (text: string) => {
          return text
            .split(/[.!?]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .slice(0, 5); // First 5 sentences
        },
      },
    };

    try {
      const response = await parser.fetchHtml('https://httpbin.org/html');
      const processedText = parser.extractStructuredFromHtml(
        response.html,
        textProcessingSchema,
      );

      console.log('📝 Text processing results:');
      console.log(`   Original length: ${processedText.originalLength} chars`);
      console.log(
        `   Cleaned text preview: ${processedText.cleanedText.substring(0, 100)}...`,
      );
      console.log(`   Word count: ${processedText.wordCount} words`);
      console.log(`   Sentences extracted: ${processedText.sentences.length}`);
      if (processedText.sentences.length > 0) {
        console.log(`   First sentence: ${processedText.sentences[0]}`);
      }
    } catch (error) {
      console.log(`⚠️ Could not process text: ${error.message}`);
    }

    // Example 5: Transform objects and classes
    console.log('\n5. Transform Objects and Classes');
    console.log('================================');

    // Transform object example
    const priceTransform = {
      transform: (value: string) => {
        const cleaned = value.replace(/[^0-9.,]/g, '');
        return parseFloat(cleaned.replace(',', '')) || 0;
      },
    };

    // Transform class example
    class DateTransform {
      transform(value: string): Date {
        // Handle various date formats
        const dateValue = new Date(value);
        return isNaN(dateValue.getTime()) ? new Date() : dateValue;
      }
    }

    interface ShopItem {
      itemName: string;
      cost: number;
      availableDate: Date;
    }

    const shopSchema: ExtractionSchema<ShopItem> = {
      itemName: {
        selector: 'h1',
        type: 'css',
      },
      cost: {
        selector: '.price',
        type: 'css',
        transform: priceTransform, // Using transform object
      },
      availableDate: {
        selector: '.available-date',
        type: 'css',
        attribute: 'datetime',
        transform: DateTransform, // Using transform class
      },
    };

    try {
      const response = await parser.fetchHtml('https://example.com');
      const shopItem = parser.extractStructuredFromHtml(
        response.html,
        shopSchema,
      );

      console.log('🛍️ Shop item extraction:');
      console.log(`   Item: ${shopItem.itemName}`);
      console.log(`   Cost: $${shopItem.cost.toFixed(2)}`); // TypeScript knows cost is number
      console.log(`   Available: ${shopItem.availableDate.toDateString()}`); // TypeScript knows availableDate is Date
    } catch (error) {
      console.log(`⚠️ Could not extract shop item: ${error.message}`);
    }

    console.log('\n🎉 Enhanced TypeScript typing demonstration completed!');
    console.log('\n🎯 Key Benefits Demonstrated:');
    console.log('   • Full type safety with generic interfaces');
    console.log('   • Transform function type checking');
    console.log('   • Multiple transform functions in sequence');
    console.log('   • Transform objects and classes');
    console.log('   • Compile-time error detection');
    console.log('   • IntelliSense autocomplete for extracted properties');
  } catch (error) {
    console.error('❌ Error demonstrating enhanced typing:', error.message);
  } finally {
    await parser.cleanup();
  }
}

// Export the demo function
export { demonstrateEnhancedTyping };

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateEnhancedTyping().catch((error) =>
    console.error('\n💥 Demo failed:', error.message),
  );
}
