import {
  DynamicModule,
  Module,
  ModuleMetadata,
  Provider,
  Type,
} from '@nestjs/common';
import { JSParserService } from './js-parser.service';
import {
  JS_PARSER_CONFIG,
  JSParserModuleConfig,
  defaultJSParserConfig,
} from './js-parser.config';

export interface JSParserModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<JSParserConfigFactory>;
  useClass?: Type<JSParserConfigFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<JSParserModuleConfig> | JSParserModuleConfig;
  inject?: any[];
}

export interface JSParserConfigFactory {
  createJSParserConfig(): Promise<JSParserModuleConfig> | JSParserModuleConfig;
}

@Module({
  providers: [
    {
      provide: JS_PARSER_CONFIG,
      useValue: defaultJSParserConfig,
    },
    JSParserService,
  ],
  exports: [JSParserService],
})
export class JSParserModule {
  static forRoot(config: JSParserModuleConfig = {}): DynamicModule {
    const configProvider: Provider = {
      provide: JS_PARSER_CONFIG,
      useValue: { ...defaultJSParserConfig, ...config },
    };

    return {
      module: JSParserModule,
      providers: [JSParserService, configProvider],
      exports: [JSParserService],
    };
  }

  static forRootAsync(options: JSParserModuleAsyncOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);
    return {
      module: JSParserModule,
      imports: options.imports || [],
      providers: [JSParserService, ...asyncProviders],
      exports: [JSParserService],
    };
  }

  private static createAsyncProviders(
    options: JSParserModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: JS_PARSER_CONFIG,
          useFactory: async (...args: any[]) => {
            const config = await options.useFactory!(...args);
            return { ...defaultJSParserConfig, ...config };
          },
          inject: options.inject || [],
        },
      ];
    }

    const inject = [
      (options.useExisting || options.useClass) as Type<JSParserConfigFactory>,
    ];

    return [
      {
        provide: JS_PARSER_CONFIG,
        useFactory: async (factory: JSParserConfigFactory) => {
          const config = await factory.createJSParserConfig();
          return { ...defaultJSParserConfig, ...config };
        },
        inject,
      },
      ...(options.useClass
        ? [{ provide: options.useClass, useClass: options.useClass }]
        : []),
    ];
  }
}
