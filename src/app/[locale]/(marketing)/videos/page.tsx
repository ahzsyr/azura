import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHero, Section } from "@/components/marketing/section";
import { seoService } from "@/features/seo/seo.service";
import { videoService } from "@/features/videos/video.service";
import type { Locale } from "@/i18n/routing";

export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: "/videos",
    pageKey: "videos",
    fallback: { title: "Videos", description: "Watch our latest videos." },
  });
}

export default async function VideosIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  let videos: Awaited<ReturnType<typeof videoService.listPublished>> = [];
  try {
    videos = await videoService.listPublished();
  } catch {
    videos = [];
  }

  return (
    <>
      <PageHero title="Videos" subtitle="Watch product demos and showcases." />
      <Section>
        {videos.length === 0 ? (
          <p className="text-muted-foreground">No published videos yet.</p>
        ) : (
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <li key={video.id}>
                <Link href={`/videos/${video.slug}`} className="group block space-y-3">
                  <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    />
                  </div>
                  <div>
                    <h2 className="font-medium group-hover:underline">{video.title}</h2>
                    {video.duration ? (
                      <p className="mt-1 text-sm text-muted-foreground">{video.duration}</p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
