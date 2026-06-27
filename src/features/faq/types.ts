export type FaqSetAdmin = {
  id: string;
  slug: string;
  displayTitle: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string | null;
  excerptAr: string | null;
  descriptionEn: string;
  descriptionAr: string;
  sortOrder: number;
  isPublished: boolean;
  itemCount: number;
};

export type FaqItemAdmin = {
  id: string;
  faqSetId: string;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
  sortOrder: number;
  isPublished: boolean;
};

export type FaqSetPublic = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string | null;
  excerptAr: string | null;
  descriptionEn: string;
  descriptionAr: string;
  itemCount: number;
};

export type FaqItemPublic = {
  id: string;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
};

export type FaqSetDetailPublic = FaqSetPublic & {
  items: FaqItemPublic[];
};

export type FaqSetBuilderOption = {
  slug: string;
  titleEn: string;
  titleAr: string;
  isPublished: boolean;
  itemCount: number;
};
