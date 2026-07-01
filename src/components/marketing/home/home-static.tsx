import { Suspense } from "react";
import { HomeHero } from "./home-hero";
import { HomeSections } from "./home-sections";
import { HomeSectionsSkeleton } from "./home-skeleton";

type Props = { locale: string };

export function HomeStatic({ locale }: Props) {
  return (
    <>
      <HomeHero locale={locale} />
      <Suspense fallback={<HomeSectionsSkeleton />}>
        <HomeSections locale={locale} />
      </Suspense>
    </>
  );
}
