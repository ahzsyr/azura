import type { DemoPageDefinition } from "@/features/setup/demo-import/types";
import {
  hero,
  featureGrid,
  catalog,
  statsCounter,
  testimonialsBlock,
  cta,
  advancedRichText,
  benefitsGrid,
  trustBadges,
  faqBlock,
  masonryGallery,
  inquiryForm,
  richText,
} from "@/features/setup/demo-import/block-factory";

export const safarPages: DemoPageDefinition[] = [
  {
    slug: "home",
    templateKey: "home",
    title: "Home",
    buildBlocks: (ctx) => [
      hero({
        title: "Your Trusted Partner for Memorable Travel Experiences",
        subtitle: "Travel • Explore • Discover",
        badge: "Licensed Travel Agency",
        imageUrl: ctx.media.hero?.url,
        mediaAssetId: ctx.media.hero?.id,
        ctaLabel: "Plan Your Trip",
        ctaHref: "/contact",
        secondaryCtaLabel: "View Packages",
        secondaryCtaHref: "/packages",
        layout: "fullBleed",
      }),
      featureGrid({
        title: "Our Services",
        subtitle: "Complete travel solutions under one roof",
        columns: 3,
        items: [
          { title: "Travel Planning", description: "Personalized itineraries tailored to your preferences.", icon: "fa-map", href: "/services" },
          { title: "Tour Packages", description: "Curated packages for every type of traveler.", icon: "fa-suitcase", href: "/packages" },
          { title: "Flight Booking", description: "Domestic and international flight reservations.", icon: "fa-plane", href: "/services" },
          { title: "Tourism Experiences", description: "Guided tours and cultural immersion.", icon: "fa-compass", href: "/packages" },
        ],
      }),
      catalog({
        source: "packages",
        title: "Featured Tour Packages",
        subtitle: "Handpicked experiences for unforgettable journeys",
        limit: 6,
        featuredOnly: true,
        viewAllHref: "/packages",
      }),
      statsCounter({
        title: "Why Travelers Choose Us",
        items: [
          { value: 15, suffix: "+", label: "Years of Expertise"},
          { value: 50, suffix: "+", label: "Destinations"},
          { value: 5000, suffix: "+", label: "Happy Travelers"},
        ],
      }),
      testimonialsBlock({
        title: "Traveler Reviews",
        subtitle: "Real stories from our valued clients",
        collectionSlug: "safar-travelers",
      }),
      cta({
        title: "Ready for Your Next Adventure?",
        subtitle: "Let our travel specialists create the perfect journey for you.",
        button: "Plan Your Trip",
        href: "/contact",
      }),
    ],
  },
  {
    slug: "about",
    templateKey: "about",
    title: "About Us",
    buildBlocks: () => [
      hero({
        title: "About Safar Al-Madina",
        subtitle: "Creating unforgettable memories through carefully planned travel",
        ctaLabel: "Contact Us",
        ctaHref: "/contact",
      }),
      advancedRichText({
        html:
          "<p>At Safar Al-Madina Travel Agency, we believe that travel is more than reaching a destination—it is about creating unforgettable memories, discovering new cultures, and experiencing the world in meaningful ways.</p><h3>Our Vision</h3><p>To become one of the region's most trusted travel and tourism companies by delivering exceptional travel experiences, innovative solutions, and outstanding customer service.</p><h3>Our Mission</h3><p>To simplify travel planning and provide reliable, high-quality tourism services that help travelers discover new destinations, create unforgettable memories, and travel with confidence.</p>",
      }),
      benefitsGrid({
        title: "Core Values",
        layout: "cards",
        items: [
          { title: "Trust", description: "Building lasting relationships through honesty and dependable service.", icon: "fa-handshake" },
          { title: "Excellence", description: "Maintaining the highest standards across every aspect of travel.", icon: "fa-star" },
          { title: "Customer Commitment", description: "Putting customer needs and satisfaction at the center.", icon: "fa-heart" },
          { title: "Innovation", description: "Continuously improving services for modern travelers.", icon: "fa-lightbulb" },
          { title: "Passion for Travel", description: "Sharing enthusiasm for exploration and discovery.", icon: "fa-globe" },
        ],
      }),
      richText({
        content:
          "<h3>Brand Philosophy</h3><p><strong>Warm &amp; Welcoming</strong> — Every interaction makes travelers feel valued and supported.</p><p><strong>Authentic Experiences</strong> — Genuine travel that creates lasting memories.</p><p><strong>Excellence in Service</strong> — Professionalism and attention to detail guide everything we do.</p>",
      }),
    ],
  },
  {
    slug: "packages",
    templateKey: "packages",
    title: "Tour Packages",
    buildBlocks: () => [
      hero({
        title: "Tour Packages",
        subtitle: "Carefully curated travel packages for every type of journey",
        ctaLabel: "Custom Package",
        ctaHref: "/contact",
      }),
      catalog({ source: "packages", title: "All Packages", limit: 12, viewAllHref: "/packages" }),
      faqBlock({ title: "Package FAQ", faqSetSlug: "packages" }),
    ],
  },
  {
    slug: "services",
    templateKey: "services",
    title: "Services",
    buildBlocks: () => [
      hero({
        title: "Our Travel Services",
        subtitle: "End-to-end travel management from planning to support during travel",
      }),
      featureGrid({
        title: "What We Offer",
        columns: 2,
        items: [
          { title: "Travel Planning & Consultation", description: "Personalized itinerary development, destination recommendations, and visa guidance.", icon: "fa-map-marked-alt", href: "/contact" },
          { title: "Flight & Ticket Booking", description: "International and domestic flights, multi-city planning, and group reservations.", icon: "fa-plane-departure", href: "/contact" },
          { title: "Tourism Experiences", description: "Guided tours, cultural experiences, adventure activities, and luxury tourism.", icon: "fa-camera", href: "/packages" },
          { title: "Corporate Travel", description: "Business travel bookings, group arrangements, and schedule management.", icon: "fa-briefcase", href: "/contact" },
        ],
      }),
      catalog({ source: "services", title: "Service Offerings", limit: 6 }),
    ],
  },
  {
    slug: "hotels-transport",
    templateKey: "hotels-transport",
    title: "Hotels & Transport",
    buildBlocks: () => [
      hero({
        title: "Hotels & Transport",
        subtitle: "Premium accommodations and reliable transport arrangements",
      }),
      catalog({ source: "hotels", title: "Partner Hotels", limit: 6 }),
    ],
  },
  {
    slug: "gallery",
    templateKey: "gallery",
    title: "Gallery",
    buildBlocks: () => [
      hero({
        title: "Destinations Gallery",
        subtitle: "Explore the world's most inspiring destinations",
      }),
      masonryGallery({
        title: "Our Destinations",
        subtitle: "From spiritual journeys to luxury escapes",
        gallerySlug: "safar-destinations",
      }),
    ],
  },
  {
    slug: "testimonials",
    templateKey: "testimonials",
    title: "Testimonials",
    buildBlocks: () => [
      hero({
        title: "Traveler Testimonials",
        subtitle: "Stories from travelers who trusted Safar Al-Madina",
      }),
      testimonialsBlock({
        title: "What Our Travelers Say",
        collectionSlug: "safar-travelers",
        limit: 12,
      }),
    ],
  },
  {
    slug: "why-choose-us",
    templateKey: "landing",
    title: "Why Choose Us",
    buildBlocks: () => [
      hero({
        title: "Why Choose Safar Al-Madina?",
        subtitle: "We don't simply book trips—we create journeys worth remembering",
        ctaLabel: "Start Planning",
        ctaHref: "/contact",
      }),
      benefitsGrid({
        title: "Our Advantages",
        layout: "twoColumn",
        items: [
          { title: "Professional Expertise", description: "Extensive knowledge of global destinations and travel logistics.", icon: "fa-graduation-cap" },
          { title: "Personalized Service", description: "Every traveler is unique — we tailor experiences to your expectations.", icon: "fa-user-check" },
          { title: "Trusted Partner", description: "Transparency, reliability, and consistent service quality.", icon: "fa-shield-alt" },
          { title: "Complete Solutions", description: "From planning to support during travel — all under one roof.", icon: "fa-check-circle" },
        ],
      }),
      trustBadges({
        title: "Our Commitment",
        items: [
          { label: "Licensed Agency", icon: "fa-certificate" },
          { label: "Personalized Itineraries", icon: "fa-route" },
          { label: "24/7 Support", icon: "fa-headset" },
          { label: "Best Value", icon: "fa-tag" },
        ],
      }),
      faqBlock({ title: "Booking Questions", faqSetSlug: "booking" }),
    ],
  },
  {
    slug: "contact",
    templateKey: "contact",
    title: "Contact",
    buildBlocks: () => [
      hero({
        title: "Contact Us",
        subtitle: "Your gateway to exceptional travel experiences",
      }),
      inquiryForm({
        title: "Plan Your Journey",
        type: "CONTACT",
      }),
      richText({
        content:
          "<p><strong>Safar Al-Madina Travel Agency</strong></p><p>Travel • Explore • Discover</p><p>📧 info@safaralmadina.com</p><p>📞 +971 50 123 4567</p><p><em>Your gateway to exceptional travel experiences, trusted service, and unforgettable destinations.</em></p>",
      }),
    ],
  },
];
