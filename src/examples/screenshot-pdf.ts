import { JSParserService } from '../js-parser.service';

async function demonstrateScreenshotPdf() {
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
    console.log('🚀 NestJS JS Parser - Screenshot & PDF Demo\n');

    // Example 1: Basic screenshot
    console.log('1. Basic Screenshot Capture');
    console.log('===========================');

    const basicScreenshot = await parser.takeScreenshot('https://example.com', {
      type: 'png',
      timeout: 10000,
    });

    console.log(
      `📸 Basic screenshot captured: ${basicScreenshot.length} bytes`,
    );

    // Example 2: Full page screenshot
    console.log('\n2. Full Page Screenshot');
    console.log('=======================');

    const fullPageScreenshot = await parser.takeScreenshot(
      'https://example.com',
      {
        type: 'png',
        fullPage: true,
        timeout: 10000,
      },
    );

    console.log(`📸 Full page screenshot: ${fullPageScreenshot.length} bytes`);

    // Example 3: Custom viewport screenshot
    console.log('\n3. Custom Viewport Screenshot');
    console.log('==============================');

    const customViewportScreenshot = await parser.takeScreenshot(
      'https://example.com',
      {
        type: 'png',
        viewport: { width: 1024, height: 768 },
        timeout: 10000,
      },
    );

    console.log(
      `📸 Custom viewport (1024x768): ${customViewportScreenshot.length} bytes`,
    );

    // Example 4: Mobile viewport screenshot
    console.log('\n4. Mobile Viewport Screenshot');
    console.log('==============================');

    const mobileScreenshot = await parser.takeScreenshot(
      'https://example.com',
      {
        type: 'png',
        viewport: { width: 375, height: 812 }, // iPhone X dimensions
        fullPage: true,
        timeout: 10000,
      },
    );

    console.log(
      `📱 Mobile viewport (375x812): ${mobileScreenshot.length} bytes`,
    );

    // Example 5: JPEG screenshot with quality
    console.log('\n5. JPEG Screenshot with Quality');
    console.log('===============================');

    const jpegScreenshot = await parser.takeScreenshot('https://example.com', {
      type: 'jpeg',
      quality: 80,
      timeout: 10000,
    });

    console.log(
      `📸 JPEG screenshot (quality 80): ${jpegScreenshot.length} bytes`,
    );

    // Example 6: Clipped screenshot
    console.log('\n6. Clipped Screenshot');
    console.log('=====================');

    const clippedScreenshot = await parser.takeScreenshot(
      'https://example.com',
      {
        type: 'png',
        clip: {
          x: 0,
          y: 0,
          width: 800,
          height: 600,
        },
        timeout: 10000,
      },
    );

    console.log(
      `✂️ Clipped screenshot (800x600): ${clippedScreenshot.length} bytes`,
    );

    // Example 7: Basic PDF generation
    console.log('\n7. Basic PDF Generation');
    console.log('=======================');

    const basicPdf = await parser.generatePDF('https://example.com', {
      timeout: 15000,
    });

    console.log(`📄 Basic PDF generated: ${basicPdf.length} bytes`);

    // Example 8: Formatted PDF
    console.log('\n8. Formatted PDF (A4)');
    console.log('=====================');

    const formattedPdf = await parser.generatePDF('https://example.com', {
      format: 'A4',
      printBackground: true,
      timeout: 15000,
    });

    console.log(`📄 A4 PDF with background: ${formattedPdf.length} bytes`);

    // Example 9: PDF with margins
    console.log('\n9. PDF with Custom Margins');
    console.log('==========================');

    const pdfWithMargins = await parser.generatePDF('https://example.com', {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm',
      },
      timeout: 15000,
    });

    console.log(`📄 PDF with margins: ${pdfWithMargins.length} bytes`);

    // Example 10: Advanced screenshot with wait
    console.log('\n10. Advanced Screenshot with Wait');
    console.log('=================================');

    const advancedScreenshot = await parser.takeScreenshot(
      'https://httpbin.org/html',
      {
        type: 'png',
        fullPage: true,
        waitForSelector: 'body',
        timeout: 10000,
      },
    );

    console.log(`📸 Advanced screenshot: ${advancedScreenshot.length} bytes`);

    // Example 11: File size comparison
    console.log('\n11. File Size Comparison');
    console.log('========================');

    const pngSize = basicScreenshot.length;
    const jpegSize = jpegScreenshot.length;
    const pdfSize = basicPdf.length;

    console.log('📊 File size comparison:');
    console.log(`   PNG Screenshot: ${(pngSize / 1024).toFixed(2)} KB`);
    console.log(`   JPEG Screenshot: ${(jpegSize / 1024).toFixed(2)} KB`);
    console.log(`   PDF Document: ${(pdfSize / 1024).toFixed(2)} KB`);

    if (jpegSize < pngSize) {
      const savings = (((pngSize - jpegSize) / pngSize) * 100).toFixed(1);
      console.log(`   💾 JPEG saves ${savings}% space vs PNG`);
    }

    // Example 12: Practical use case - Website monitoring
    console.log('\n12. Practical Use Case - Website Monitoring');
    console.log('===========================================');

    try {
      // Take screenshot and analyze content
      const response = await parser.fetchHtml('https://httpbin.org/html');
      const screenshot = await parser.takeScreenshot(
        'https://httpbin.org/html',
        {
          type: 'png',
          fullPage: true,
        },
      );

      interface PageInfo {
        title: string;
        headings: string[];
      }

      const pageInfo = parser.extractStructuredFromHtml<PageInfo>(
        response.html,
        {
          title: { selector: 'title', type: 'css' },
          headings: { selector: 'h1, h2, h3', type: 'css', multiple: true },
        },
      );

      console.log('🔍 Website monitoring results:');
      console.log(`   Page title: ${pageInfo.title}`);
      console.log(`   Headings found: ${pageInfo.headings?.length || 0}`);
      console.log(
        `   Screenshot size: ${(screenshot.length / 1024).toFixed(2)} KB`,
      );
      console.log(`   Status: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.error(`❌ Monitoring error: ${error.message}`);
    }

    console.log('\n🎉 Screenshot and PDF demonstration completed!');
  } catch (error) {
    console.error('❌ Error demonstrating screenshot/PDF:', error.message);
  } finally {
    await parser.cleanup();
  }
}

// Export the demo function
export { demonstrateScreenshotPdf };

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateScreenshotPdf().catch((error) =>
    console.error('\n💥 Demo failed:', error.message),
  );
}
