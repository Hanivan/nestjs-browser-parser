import { JSParserService } from '../js-parser.service';

async function demonstrateJavaScriptEvaluation() {
  const parser = new JSParserService({
    loggerLevel: ['log', 'error', 'debug'],
    headless: true,
    browserConnection: { 
      type: 'builtin',
      executablePath: '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  });

  try {
    console.log('🚀 NestJS JS Parser - JavaScript Evaluation Demo\n');

    // Example 1: Basic JavaScript evaluation
    console.log('1. Basic JavaScript Evaluation');
    console.log('===============================');

    const basicResult = await parser.evaluateOnPage(
      'https://example.com',
      '() => ({ title: document.title, url: window.location.href })'
    );

    console.log('📊 Basic evaluation result:');
    console.log(`   Title: ${basicResult?.title}`);
    console.log(`   URL: ${basicResult?.url}`);

    // Example 2: DOM analysis
    console.log('\n2. DOM Analysis');
    console.log('===============');

    const domAnalysis = await parser.evaluateOnPage(
      'https://httpbin.org/html',
      '() => ({ elementCount: document.querySelectorAll("*").length, bodyText: document.body.innerText.substring(0, 100), hasImages: document.querySelectorAll("img").length > 0 })'
    );

    console.log('🔍 DOM analysis:');
    console.log(`   Total elements: ${domAnalysis?.elementCount}`);
    console.log(`   Body text preview: ${domAnalysis?.bodyText}...`);
    console.log(`   Has images: ${domAnalysis?.hasImages ? 'Yes' : 'No'}`);

    // Example 3: Complex function evaluation
    console.log('\n3. Complex Function Evaluation');
    console.log('===============================');

    const complexResult = await parser.evaluateOnPage(
      'https://httpbin.org/html',
      async (page) => {
        return await page.evaluate(() => {
          // Complex analysis function
          const links = document.querySelectorAll('a');
          const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
          const forms = document.querySelectorAll('form');
          
          return {
            linkCount: links.length,
            headingCount: headings.length,
            formCount: forms.length,
            firstLinkText: links.length > 0 ? links[0].textContent : null,
            pageHeight: document.body.scrollHeight,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            userAgent: navigator.userAgent,
          };
        });
      }
    );

    console.log('🧮 Complex evaluation result:');
    console.log(`   Links: ${complexResult?.linkCount}`);
    console.log(`   Headings: ${complexResult?.headingCount}`);
    console.log(`   Forms: ${complexResult?.formCount}`);
    console.log(`   First link: ${complexResult?.firstLinkText || 'None'}`);
    console.log(`   Page height: ${complexResult?.pageHeight}px`);
    console.log(`   Viewport: ${complexResult?.viewportWidth}x${complexResult?.viewportHeight}`);

    // Example 4: Wait for dynamic content
    console.log('\n4. Wait for Dynamic Content');
    console.log('============================');

    const dynamicResult = await parser.evaluateOnPage(
      'https://httpbin.org/html',
      async (page) => {
        // Wait for page to be fully loaded
        await page.waitForLoadState('networkidle');
        
        return await page.evaluate(() => {
          return {
            readyState: document.readyState,
            timestamp: new Date().toISOString(),
            loadedImages: Array.from(document.images).filter(img => img.complete).length,
            totalImages: document.images.length,
          };
        });
      }
    );

    console.log('⏱️ Dynamic content analysis:');
    console.log(`   Ready state: ${dynamicResult?.readyState}`);
    console.log(`   Timestamp: ${dynamicResult?.timestamp}`);
    console.log(`   Loaded images: ${dynamicResult?.loadedImages}/${dynamicResult?.totalImages}`);

    // Example 5: CSS and styling analysis
    console.log('\n5. CSS and Styling Analysis');
    console.log('============================');

    const stylingResult = await parser.evaluateOnPage(
      'https://httpbin.org/html',
      '() => ({ backgroundColor: getComputedStyle(document.body).backgroundColor, fontSize: getComputedStyle(document.body).fontSize, fontFamily: getComputedStyle(document.body).fontFamily })'
    );

    console.log('🎨 Styling analysis:');
    console.log(`   Background color: ${stylingResult?.backgroundColor}`);
    console.log(`   Font size: ${stylingResult?.fontSize}`);
    console.log(`   Font family: ${stylingResult?.fontFamily}`);

    // Example 6: Local storage and session data
    console.log('\n6. Local Storage and Session Data');
    console.log('==================================');

    const storageResult = await parser.evaluateOnPage(
      'https://httpbin.org/html',
      '() => ({ localStorageLength: localStorage.length, sessionStorageLength: sessionStorage.length, cookieCount: document.cookie.split(";").filter(c => c.trim()).length })'
    );

    console.log('💾 Storage analysis:');
    console.log(`   Local storage items: ${storageResult?.localStorageLength}`);
    console.log(`   Session storage items: ${storageResult?.sessionStorageLength}`);
    console.log(`   Cookies: ${storageResult?.cookieCount}`);

    // Example 7: Performance metrics
    console.log('\n7. Performance Metrics');
    console.log('======================');

    const performanceResult = await parser.evaluateOnPage(
      'https://httpbin.org/html',
      async (page) => {
        await page.waitForLoadState('load');
        
        return await page.evaluate(() => {
          const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          
          return {
            loadTime: perf ? perf.loadEventEnd - perf.loadEventStart : 0,
            domContentLoaded: perf ? perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart : 0,
            firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
            timeOrigin: performance.timeOrigin,
          };
        });
      }
    );

    console.log('⚡ Performance metrics:');
    console.log(`   Load time: ${performanceResult?.loadTime || 0}ms`);
    console.log(`   DOM content loaded: ${performanceResult?.domContentLoaded || 0}ms`);
    console.log(`   First paint: ${performanceResult?.firstPaint || 0}ms`);

    // Example 8: Form interaction
    console.log('\n8. Form Interaction and Analysis');
    console.log('=================================');

    const formResult = await parser.evaluateOnPage(
      'https://httpbin.org/forms/post',
      async (page) => {
        const forms = await page.$$('form');
        const inputs = await page.$$('input');
        const textareas = await page.$$('textarea');
        const selects = await page.$$('select');
        
        return {
          formCount: forms.length,
          inputCount: inputs.length,
          textareaCount: textareas.length,
          selectCount: selects.length,
        };
      }
    );

    console.log('📝 Form analysis:');
    console.log(`   Forms: ${formResult?.formCount || 0}`);
    console.log(`   Input fields: ${formResult?.inputCount || 0}`);
    console.log(`   Text areas: ${formResult?.textareaCount || 0}`);
    console.log(`   Select dropdowns: ${formResult?.selectCount || 0}`);

    // Example 9: Custom data extraction
    console.log('\n9. Custom Data Extraction');
    console.log('==========================');

    const customResult = await parser.evaluateOnPage(
      'https://httpbin.org/html',
      async (page) => {
        return await page.evaluate(() => {
          // Custom extraction logic
          const extractTextFromElements = (selector: string) => {
            return Array.from(document.querySelectorAll(selector))
              .map(el => el.textContent?.trim())
              .filter(text => text && text.length > 0);
          };

          return {
            allHeadings: extractTextFromElements('h1, h2, h3, h4, h5, h6'),
            allParagraphs: extractTextFromElements('p').slice(0, 3), // First 3 paragraphs
            allLinkTexts: extractTextFromElements('a').slice(0, 5), // First 5 links
            wordCount: document.body.innerText.split(/\s+/).length,
          };
        });
      }
    );

    console.log('🎯 Custom extraction:');
    console.log(`   Headings found: ${customResult?.allHeadings?.length || 0}`);
    console.log(`   Paragraphs analyzed: ${customResult?.allParagraphs?.length || 0}`);
    console.log(`   Link texts: ${customResult?.allLinkTexts?.length || 0}`);
    console.log(`   Total word count: ${customResult?.wordCount || 0}`);

    if (customResult?.allHeadings?.length) {
      console.log(`   First heading: ${customResult.allHeadings[0]}`);
    }

    // Example 10: Error handling in evaluation
    console.log('\n10. Error Handling in Evaluation');
    console.log('=================================');

    try {
      await parser.evaluateOnPage(
        'https://httpbin.org/html',
        '() => { throw new Error("Intentional error for demo"); }'
      );
    } catch (error) {
      console.log('🚨 Caught evaluation error (expected):');
      console.log(`   Error message: ${error.message}`);
      console.log('   ✅ Error handling working correctly');
    }

    console.log('\n✅ JavaScript evaluation demonstration completed!');

  } catch (error) {
    console.error('❌ Error demonstrating JavaScript evaluation:', error.message);
  } finally {
    await parser.cleanup();
  }
}

// Export the demo function
export { demonstrateJavaScriptEvaluation };

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateJavaScriptEvaluation()
    .then(() => console.log('\n🎉 Demo completed!'))
    .catch((error) => console.error('\n💥 Demo failed:', error.message));
}