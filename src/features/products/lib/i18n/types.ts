export type LocaleConfig = {
  code: string;
  urlPrefix: string;
  label: string;
  /**
   * Optional locale hints for number/currency formatting.
   * Some components (e.g. currency display) expect these fields.
   */
  currencyLocale?: string;
  numberLocale?: string;
};
