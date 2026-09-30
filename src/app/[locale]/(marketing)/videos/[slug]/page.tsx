import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Section } from "@/components/marketing/section";
import { seoService } from "@/features/seo/seo.service";
import { videoService } from "@/features/videos/video.service";
import type { Locale } from "@/i18n/routing";

export const revalidate = 60;

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  let video = null;
  try {
    video = await videoService.getBySlug(slug);
  } catch {
    video = null;
  }

  if (!video) {
    return seoService.resolveMetadata({
      locale: locale as Locale,
      path: `/videos/${slug}`,
      pageKey: "videos",
      status: 404,
      fallback: { title: "Video", description: "" },
    });
  }

  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: `/videos/${slug}`,
    pageKey: "videos",
    fallback: {
      title: video.title,
      description: video.description,
    },
    ogImage: video.thumbnailUrl,
  });
}

function formatPublishedDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export default async function VideoWatchPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  let video = null;
  try {
    video = await videoService.getBySlug(slug);
  } catch {
    video = null;
  }
  if (!video) notFound();

  const uploadDateIso = video.uploadDate.toISOString();

  const videoObject = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description,
    thumbnailUrl: [video.thumbnailUrl],
    uploadDate: uploadDateIso,
    contentUrl: video.contentUrl,
    ...(video.duration ? { duration: video.duration } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(videoObject).replace(/</g, "\\u003c"),
        }}
      />

      <div className="bg-black">
        <div className="mx-auto max-w-5xl">
          <video
            className="aspect-video w-full bg-black"
            controls
            playsInline
            poster={video.thumbnailUrl}
            preload="metadata"
          >
            <source src={video.contentUrl} type={video.contentMimeType || "video/mp4"} />
          </video>
        </div>
      </div>

      <Section className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{video.title}</h1>
          <p className="text-sm text-muted-foreground">
            Published {formatPublishedDate(video.uploadDate)}
            {video.duration ? ` · ${video.duration}` : ""}
          </p>
        </div>
        <p className="max-w-3xl whitespace-pre-wrap text-muted-foreground">{video.description}</p>

        <div className="border-t pt-6">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Related
          </h2>
          <ul className="flex flex-wrap gap-4 text-sm">
            <li>
              <Link href="/solutions" className="underline-offset-4 hover:underline">
                Solutions
              </Link>
            </li>
            <li>
              <Link href="/products" className="underline-offset-4 hover:underline">
                Products
              </Link>
            </li>
            <li>
              <Link href="/videos" className="underline-offset-4 hover:underline">
                All videos
              </Link>
            </li>
          </ul>
        </div>
      </Section>
    </>
  );
}
