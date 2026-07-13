export type TranslationItem = {
  sourceText: string;
  sourceLocale: string;
  targetLocale: string;
};

export interface TranslationProvider {
  readonly name: string;
  isAvailable(): boolean;
  translateBatch(items: TranslationItem[]): Promise<string[]>;
}
