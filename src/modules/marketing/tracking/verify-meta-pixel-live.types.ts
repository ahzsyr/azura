export type MetaPixelLiveVerifyResult = {
  found: boolean;
  signals: {
    fbq: boolean;
    fbeventsJs: boolean;
    pixelIdInHtml: boolean;
  };
  fetchedAt: string;
  url: string;
  error?: string;
};
