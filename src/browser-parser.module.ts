import {
  DynamicModule,
  InjectionToken,
  Module,
  ModuleMetadata,
  OptionalFactoryDependency,
  Provider,
  Type,
} from '@nestjs/common';
import {
  BROWSER_PARSER_CONFIG,
  BrowserParserModuleConfig,
  defaultBrowserParserConfig,
} from './browser-parser.config';
import { BrowserParserService } from './browser-parser.service';

export interface BrowserParserModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<BrowserParserConfigFactory>;
  useClass?: Type<BrowserParserConfigFactory>;
  useFactory?: (
    ...args: unknown[]
  ) => Promise<BrowserParserModuleConfig> | BrowserParserModuleConfig;
  inject?: (InjectionToken | OptionalFactoryDependency)[];
}

export interface BrowserParserConfigFactory {
  createBrowserParserConfig():
    | Promise<BrowserParserModuleConfig>
    | BrowserParserModuleConfig;
}

@Module({
  providers: [
    {
      provide: BROWSER_PARSER_CONFIG,
      useValue: defaultBrowserParserConfig,
    },
    BrowserParserService,
  ],
  exports: [BrowserParserService],
})
export class BrowserParserModule {
  static forRoot(config: BrowserParserModuleConfig = {}): DynamicModule {
    const configProvider: Provider = {
      provide: BROWSER_PARSER_CONFIG,
      useValue: { ...defaultBrowserParserConfig, ...config },
    };

    return {
      module: BrowserParserModule,
      providers: [BrowserParserService, configProvider],
      exports: [BrowserParserService],
    };
  }

  static forRootAsync(options: BrowserParserModuleAsyncOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);
    return {
      module: BrowserParserModule,
      imports: options.imports || [],
      providers: [BrowserParserService, ...asyncProviders],
      exports: [BrowserParserService],
    };
  }

  private static createAsyncProviders(
    options: BrowserParserModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: BROWSER_PARSER_CONFIG,
          useFactory: async (...args: unknown[]) => {
            const config = await options.useFactory!(...args);
            return { ...defaultBrowserParserConfig, ...config };
          },
          inject: options.inject || [],
        },
      ];
    }

    const inject = [
      (options.useExisting ||
        options.useClass) as Type<BrowserParserConfigFactory>,
    ];

    return [
      {
        provide: BROWSER_PARSER_CONFIG,
        useFactory: async (factory: BrowserParserConfigFactory) => {
          const config = await factory.createBrowserParserConfig();
          return { ...defaultBrowserParserConfig, ...config };
        },
        inject,
      },
      ...(options.useClass
        ? [{ provide: options.useClass, useClass: options.useClass }]
        : []),
    ];
  }
}
