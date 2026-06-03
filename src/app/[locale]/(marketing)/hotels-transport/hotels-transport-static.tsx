import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { PageHero, Section, SectionHeader } from "@/components/marketing/section";
import { ServiceCard } from "@/components/marketing/service-card";
import { getHotels, getServices } from "@/lib/data";
import { getLocalizedField } from "@/lib/utils";

type Props = { locale: string };

export async function HotelsTransportStatic({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "hotels" });

  const [hotels, services] = await Promise.all([getHotels(), getServices()]);
  const transportServices = services.filter((s) => s.type !== "HOTEL");
  const makkahHotels = hotels.filter((h) => h.city === "MAKKAH");
  const madinahHotels = hotels.filter((h) => h.city === "MADINAH");

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />

      <Section>
        <SectionHeader title={t("hotels")} />
        <div className="mb-12">
          <h3 className="mb-6 font-heading text-xl font-semibold">{t("makkah")}</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {makkahHotels.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} locale={locale} />
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-6 font-heading text-xl font-semibold">{t("madinah")}</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {madinahHotels.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} locale={locale} />
            ))}
          </div>
        </div>
      </Section>

      <Section variant="muted">
        <SectionHeader title={t("transport")} />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {transportServices.map((service) => (
            <ServiceCard key={service.id} service={service} locale={locale} />
          ))}
        </div>
      </Section>
    </>
  );
}

function HotelCard({
  hotel,
  locale,
}: {
  hotel: Awaited<ReturnType<typeof getHotels>>[number];
  locale: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {hotel.imageUrl && (
        <div className="relative aspect-[16/10]">
          <Image
            src={hotel.imageUrl}
            alt={getLocalizedField(hotel, "name", locale)}
            fill
            className="object-cover"
          />
        </div>
      )}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h4 className="font-heading font-semibold">{getLocalizedField(hotel, "name", locale)}</h4>
          <span className="text-sm text-accent">{hotel.stars} ★</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {getLocalizedField(hotel, "description", locale)}
        </p>
      </div>
    </div>
  );
}
