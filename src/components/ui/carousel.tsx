"use client";

import * as React from "react";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
};

type CarouselViewportContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  scrollPrev: () => void;
  scrollNext: () => void;
  prevButtonRef: React.RefObject<HTMLButtonElement | null>;
  nextButtonRef: React.RefObject<HTMLButtonElement | null>;
  canScrollPrev: boolean;
  canScrollNext: boolean;
};

const CarouselViewportContext = React.createContext<CarouselViewportContextProps | null>(null);

function useCarouselViewport() {
  const context = React.useContext(CarouselViewportContext);
  if (!context) {
    throw new Error("useCarouselViewport must be used within a <Carousel />");
  }
  return context;
}

/** @deprecated Prefer useCarouselViewport for narrower subscriptions. */
function useCarouselControls() {
  return useCarouselViewport();
}

/** @deprecated Prefer useCarouselViewport for narrower subscriptions. */
function useCarousel() {
  return useCarouselViewport();
}

function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === "horizontal" ? "x" : "y",
    },
    plugins,
  );
  const prevButtonRef = React.useRef<HTMLButtonElement>(null);
  const nextButtonRef = React.useRef<HTMLButtonElement>(null);
  const isDraggingRef = React.useRef(false);
  const pendingSyncRef = React.useRef(false);
  const setApiRef = React.useRef(setApi);
  setApiRef.current = setApi;
  const apiRef = React.useRef(api);
  apiRef.current = api;

  // Use React state so disabled is driven by React, not direct DOM mutation.
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const applyScrollButtons = React.useCallback((emblaApi: CarouselApi) => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, []);

  const syncScrollButtons = React.useCallback(
    (emblaApi: CarouselApi) => {
      if (!emblaApi) return;
      if (isDraggingRef.current) {
        pendingSyncRef.current = true;
        return;
      }
      pendingSyncRef.current = false;
      applyScrollButtons(emblaApi);
    },
    [applyScrollButtons],
  );

  const scrollPrev = React.useCallback(() => apiRef.current?.scrollPrev(), []);
  const scrollNext = React.useCallback(() => apiRef.current?.scrollNext(), []);

  React.useEffect(() => {
    if (!api) return;
    setApiRef.current?.(api);
  }, [api]);

  React.useEffect(() => {
    if (!api) return;
    syncScrollButtons(api);

    const onPointerDown = () => {
      isDraggingRef.current = true;
    };
    const onPointerUp = () => {
      isDraggingRef.current = false;
      if (pendingSyncRef.current) {
        applyScrollButtons(api);
        pendingSyncRef.current = false;
      }
    };

    api.on("reInit", syncScrollButtons);
    // Use settle (not select) so arrow state updates after drag ends — select during
    // touch drag races React reconciliation and causes insertBefore NotFoundError.
    api.on("settle", syncScrollButtons);
    api.on("select", syncScrollButtons);
    api.on("pointerDown", onPointerDown);
    api.on("pointerUp", onPointerUp);
    return () => {
      api.off("reInit", syncScrollButtons);
      api.off("settle", syncScrollButtons);
      api.off("select", syncScrollButtons);
      api.off("pointerDown", onPointerDown);
      api.off("pointerUp", onPointerUp);
    };
  }, [api, applyScrollButtons, syncScrollButtons]);

  const viewportContextValue = React.useMemo(
    () => ({
      carouselRef,
      scrollPrev,
      scrollNext,
      prevButtonRef,
      nextButtonRef,
      canScrollPrev,
      canScrollNext,
    }),
    [carouselRef, scrollNext, scrollPrev, canScrollPrev, canScrollNext],
  );

  return (
    <CarouselViewportContext.Provider value={viewportContextValue}>
      <div className={cn("relative", className)} {...props}>
        {children}
      </div>
    </CarouselViewportContext.Provider>
  );
}

const CarouselContent = React.memo(function CarouselContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { carouselRef } = useCarouselViewport();
  return (
    <div ref={carouselRef} className="overflow-hidden">
      <div className={cn("flex", className)} {...props} />
    </div>
  );
});

const CarouselItem = React.memo(function CarouselItem({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      role="group"
      aria-roledescription="slide"
      className={cn("min-w-0 shrink-0 grow-0 basis-full", className)}
      {...props}
    />
  );
});

function CarouselPrevious({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { scrollPrev, prevButtonRef, canScrollPrev } = useCarouselViewport();
  return (
    <Button
      ref={prevButtonRef}
      type="button"
      variant="outline"
      size="icon"
      className={cn("absolute start-0 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full", className)}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      <span className="sr-only">Previous slide</span>
    </Button>
  );
}

function CarouselNext({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { scrollNext, nextButtonRef, canScrollNext } = useCarouselViewport();
  return (
    <Button
      ref={nextButtonRef}
      type="button"
      variant="outline"
      size="icon"
      className={cn("absolute end-0 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full", className)}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ChevronRight className="h-4 w-4" />
      <span className="sr-only">Next slide</span>
    </Button>
  );
}

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  useCarousel,
  useCarouselViewport,
  useCarouselControls,
};
