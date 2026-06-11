export type TestimonialCollectionAdmin = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string | null;
  excerptAr: string | null;
  sortOrder: number;
  isPublished: boolean;
  itemCount: number;
};

export type TestimonialAdmin = {
  id: string;
  name: string;
  location: string;
  rating: number;
  contentEn: string;
  contentAr: string;
  videoUrl: string | null;
  imageUrl: string | null;
  isPublished: boolean;
  sortOrder: number;
};

export type TestimonialPublic = {
  id: string;
  name: string;
  location: string;
  rating: number;
  contentEn: string;
  contentAr: string;
  imageUrl: string | null;
  videoUrl: string | null;
};

export type TestimonialCollectionBuilderOption = {
  slug: string;
  titleEn: string;
  titleAr: string;
  isPublished: boolean;
  itemCount: number;
};

export type TestimonialBuilderOption = {
  id: string;
  name: string;
  location: string;
  rating: number;
  isPublished: boolean;
};

export type TestimonialsBlockSource = "all" | "collection" | "manual";

export type TestimonialsBlockLayoutMode = "grid" | "slider";

export type TestimonialCardVariant = "default" | "compact" | "minimal" | "featured";
