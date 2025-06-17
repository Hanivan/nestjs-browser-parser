import { JSParserService } from '../js-parser.service';
import { LogLevel } from '../types';
import { JSParserModuleConfig } from '../js-parser.config';

async function demonstrateBrowserConfiguration() {
  console.log('🚀 NestJS JS Parser - Browser Configuration Demo\n');

  // Example 1: Built-in browser (default)
  console.log('1. Built-in Browser Configuration (Default)');
  console.log('===========================================');

  const builtinParser = new JSParserService({
    loggerLevel: ['log', 'error', 'debug'],
    headless: true,
    defaultTimeout: 30000,
    browserConnection: {
      type: 'builtin', // Use built-in Chromium
      executablePath: '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  });

  try {
    console.log('🚀 Testing built-in browser...');
    const response = await builtinParser.fetchHtml('https://example.com', {
      verbose: true,
      timeout: 15000,
    });

    console.log(`✅ Built-in browser success: ${response.status} ${response.statusText}`);
    console.log(`📄 Content length: ${response.html.length} characters`);
    
    const pageInfo = builtinParser.extractStructuredFromHtml(response.html, {
      title: { selector: 'title', type: 'css' }
    });
    console.log(`📋 Page title: ${pageInfo.title}`);

  } catch (error) {
    console.error(`❌ Built-in browser error: ${error.message}`);
  } finally {
    await builtinParser.cleanup();
  }

  // Example 2: Built-in browser with alternative executable paths
  console.log('\n2. Built-in Browser with Alternative Executable Paths');
  console.log('====================================================');

  console.log('📝 Common Chromium/Chrome executable paths:');
  console.log('   /usr/bin/chromium         (Default - Chromium package)');
  console.log('   /usr/bin/google-chrome    (Google Chrome package)');
  console.log('   /opt/google/chrome/chrome (Manual Chrome installation)');
  console.log('   /snap/bin/chromium        (Snap package)');
  console.log('   /usr/bin/chromium-browser (Some Linux distributions)');

  const customChromeParser = new JSParserService({
    loggerLevel: ['log', 'error', 'debug'],
    headless: true, // Use headless mode for demo
    browserConnection: {
      type: 'builtin',
      executablePath: '/usr/bin/google-chrome', // Alternative Chrome path
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--user-data-dir=/tmp/chrome-user-data',
      ],
    },
  });

  try {
    console.log('🔧 Testing alternative Chrome executable (/usr/bin/google-chrome)...');
    console.log('📝 Note: This may fail if Google Chrome is not installed');
    
    // This will likely fail in most environments, but shows the configuration
    console.log('⚠️ Skipping alternative Chrome test (may not be installed)');
    
  } catch (error) {
    console.error(`❌ Custom Chrome error: ${error.message}`);
  } finally {
    await customChromeParser.cleanup();
  }

  // Example 3: CDP (Chrome DevTools Protocol) configuration
  console.log('\n3. CDP (Chrome DevTools Protocol) Configuration');
  console.log('===============================================');

  console.log('📝 CDP Configuration Info:');
  console.log('   To use CDP, start Chrome with:');
  console.log('   google-chrome --remote-debugging-port=9222 --no-first-run --no-default-browser-check');
  console.log('   Then the parser can connect to: ws://localhost:9222/devtools/browser');

  const cdpParser = new JSParserService({
    loggerLevel: ['log', 'error', 'debug'],
    defaultTimeout: 30000,
    browserConnection: {
      type: 'cdp', // Connect to existing Chrome instance
      cdpUrl: 'ws://localhost:9222/devtools/browser', // CDP endpoint
    },
  });

  try {
    console.log('🔗 Testing CDP connection...');
    console.log('📝 Note: This will fail unless Chrome is running with remote debugging');
    
    // This will likely fail unless Chrome is running with remote debugging
    console.log('⚠️ Skipping CDP test (Chrome likely not running with remote debugging)');
    
  } catch (error) {
    console.error(`❌ CDP connection error: ${error.message}`);
  } finally {
    await cdpParser.cleanup();
  }

  // Example 4: Environment-based configuration
  console.log('\n4. Environment-based Configuration');
  console.log('===================================');

  const envBasedConfig: JSParserModuleConfig = {
    loggerLevel: process.env.NODE_ENV === 'development' ? (['debug', 'log', 'error'] as LogLevel[]) : (['error'] as LogLevel[]),
    headless: process.env.HEADLESS !== 'false',
    browserConnection: process.env.USE_CDP === 'true' 
      ? { 
          type: 'cdp' as const, 
          cdpUrl: process.env.CDP_URL || 'ws://localhost:9222/devtools/browser' 
        }
      : { 
          type: 'builtin' as const,
          executablePath: '/usr/bin/chromium',
          args: ['--no-sandbox', '--disable-dev-shm-usage'],
        },
  };

  console.log('🌍 Environment-based configuration:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`   HEADLESS: ${process.env.HEADLESS || 'not set'}`);
  console.log(`   USE_CDP: ${process.env.USE_CDP || 'not set'}`);
  console.log(`   CDP_URL: ${process.env.CDP_URL || 'not set'}`);
  console.log(`   Config type: ${envBasedConfig.browserConnection?.type || 'builtin'}`);
  console.log(`   Headless: ${envBasedConfig.headless}`);

  const envParser = new JSParserService(envBasedConfig);

  try {
    console.log('🧪 Testing environment-based configuration...');
    const response = await envParser.fetchHtml('https://httpbin.org/html', {
      timeout: 10000,
    });

    console.log(`✅ Environment config success: ${response.status}`);
    
  } catch (error) {
    console.error(`❌ Environment config error: ${error.message}`);
  } finally {
    await envParser.cleanup();
  }

  // Example 5: Performance comparison
  console.log('\n5. Performance Comparison');
  console.log('=========================');

  console.log('🏁 Built-in vs CDP Performance Notes:');
  console.log('');
  console.log('Built-in Browser:');
  console.log('  ✅ Self-contained, no external dependencies');
  console.log('  ✅ Lightweight and portable');
  console.log('  ✅ Perfect for Docker containers and CI/CD');
  console.log('  ✅ Consistent browser version');
  console.log('  ❌ Slower startup time (launches new browser each time)');
  console.log('  ❌ More memory usage for multiple instances');
  console.log('');
  console.log('CDP (Chrome DevTools Protocol):');
  console.log('  ✅ Faster for multiple operations (reuses browser)');
  console.log('  ✅ More resource efficient for batch operations');
  console.log('  ✅ Can access existing browser profiles and extensions');
  console.log('  ✅ Better for development and debugging');
  console.log('  ❌ Requires external Chrome instance to be running');
  console.log('  ❌ More complex setup');
  console.log('  ❌ Browser state shared between operations');

  // Example 6: Browser configuration recommendations
  console.log('\n6. Configuration Recommendations');
  console.log('=================================');

  console.log('📋 Use Cases and Recommendations:');
  console.log('');
  console.log('🐳 Docker/Containers:');
  console.log('  → Use built-in browser with executablePath: "/usr/bin/chromium"');
  console.log('  → Include --no-sandbox and --disable-dev-shm-usage args');
  console.log('  → Set headless: true');
  console.log('  → Use minimal args for better compatibility');
  console.log('');
  console.log('🚀 CI/CD Pipelines:');
  console.log('  → Use built-in browser for consistency');
  console.log('  → Set longer timeouts for slower environments');
  console.log('  → Use headless mode');
  console.log('');
  console.log('🔧 Development:');
  console.log('  → CDP for faster iteration and debugging');
  console.log('  → Built-in for isolated testing');
  console.log('  → headless: false for visual debugging');
  console.log('');
  console.log('⚡ Production High-Performance:');
  console.log('  → CDP with dedicated Chrome instances');
  console.log('  → Connection pooling for multiple operations');
  console.log('  → Monitor browser memory usage');
  console.log('');
  console.log('🧪 Testing:');
  console.log('  → Built-in for test isolation');
  console.log('  → Fresh browser state for each test');
  console.log('  → Deterministic behavior');

  // Example 7: Browser launch options
  console.log('\n7. Advanced Browser Launch Options');
  console.log('===================================');

  const advancedOptions = [
    '--no-sandbox', // Required for Docker
    '--disable-dev-shm-usage', // Required for Docker
    '--disable-extensions', // Faster startup
    '--disable-plugins', // Faster startup
    '--disable-images', // Faster loading (if images not needed)
    '--disable-javascript', // If JS not needed (contradicts our use case)
    '--disable-default-apps',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=TranslateUI',
    '--disable-features=VizDisplayCompositor',
    '--max_old_space_size=4096', // Memory limit
    '--user-data-dir=/tmp/chrome-data', // Custom profile directory
  ];

  console.log('🔧 Advanced Chrome launch options:');
  advancedOptions.forEach(option => {
    console.log(`   ${option}`);
  });

  console.log('\n✅ Browser configuration demonstration completed!');
  console.log('\n📚 Additional Resources:');
  console.log('   Chrome DevTools Protocol: https://chromedevtools.github.io/devtools-protocol/');
  console.log('   Playwright Configuration: https://playwright.dev/docs/test-configuration');
  console.log('   Chrome Flags: https://peter.sh/experiments/chromium-command-line-switches/');
}

// Export the demo function
export { demonstrateBrowserConfiguration };

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateBrowserConfiguration()
    .then(() => console.log('\n🎉 Demo completed!'))
    .catch((error) => console.error('\n💥 Demo failed:', error.message));
}