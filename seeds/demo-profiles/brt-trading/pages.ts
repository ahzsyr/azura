import type { DemoPageDefinition } from "@/features/setup/demo-import/types";
import {
  hero,
  statsCounter,
  featureGrid,
  catalog,
  testimonialsBlock,
  logoCloud,
  cta,
  advancedRichText,
  benefitsGrid,
  timeline,
  trustBadges,
  faqBlock,
  galleryBlock,
  contactFormBuilder,
  richText,
  beforeAfter,
  productShowcase,
  categoryShowcase,
  brandShowcase,
  taxonomyProductTabs,
} from "@/features/setup/demo-import/block-factory";

export const brtPages: DemoPageDefinition[] = [
  {
    slug: "home",
    templateKey: "home",
    title: "Home",
    buildBlocks: (ctx) => [
      hero({
        title: "Innovative Wireless & Smart Technology Solutions",
        subtitle: "Connecting businesses and individuals through advanced technology",
        badge: "10+ Years of Experience",
        imageUrl: ctx.media.hero?.url,
        mediaAssetId: ctx.media.hero?.id,
        ctaLabel: "Get a Quote",
        ctaHref: "/contact",
        secondaryCtaLabel: "Our Services",
        secondaryCtaHref: "/services",
        layout: "fullBleed",
      }),
      statsCounter({
        title: "Proven Track Record",
        items: [
          { value: 10, suffix: "+", label: "Years of Experience"},
          { value: 500, suffix: "+", label: "Projects Delivered"},
          { value: 99, suffix: "%", label: "Client Satisfaction"},
        ],
      }),
      featureGrid({
        title: "Core Expertise",
        subtitle: "End-to-end technology solutions for enterprises and homes",
        columns: 3,
        items: [
          { title: "Enterprise Wireless", description: "Robust Wi-Fi infrastructure and network optimization.", icon: "fa-wifi", href: "/enterprise-wireless" },
          { title: "Indoor Coverage", description: "Building-wide signal enhancement solutions.", icon: "fa-signal", href: "/services" },
          { title: "Smart Home", description: "Intelligent automation for modern living.", icon: "fa-home", href: "/smart-home" },
          { title: "Security Systems", description: "CCTV, access control, and smart locks.", icon: "fa-shield", href: "/security-solutions" },
          { title: "IoT & Connected Tech", description: "Device integration and process automation.", icon: "fa-microchip", href: "/services" },
          { title: "IP PBX & UC", description: "Unified communications for enterprises.", icon: "fa-phone", href: "/services" },
          { title: "Infrastructure", description: "Scalable network infrastructure solutions.", icon: "fa-server", href: "/services" },
        ],
      }),
      catalog({
        source: "services",
        title: "Our Services",
        subtitle: "Comprehensive technology solutions tailored to your needs",
        limit: 6,
        viewAllHref: "/services",
      }),
      categoryShowcase({
        title: "Shop by category",
        subtitle: "Browse our product categories",
        layout: "grid",
        source: "collections",
      }),
      productShowcase({
        title: "Featured products",
        subtitle: "Hand-picked technology for your business",
        source: "featured",
        layout: "carousel",
      }),
      taxonomyProductTabs({
        title: "Explore by category",
        taxonomy: "category",
      }),
      brandShowcase({
        title: "Trusted brands",
        layout: "logoCarousel",
      }),
      testimonialsBlock({
        title: "What Our Clients Say",
        subtitle: "Trusted by enterprises and homeowners across the UAE",
        collectionSlug: "brt-clients",
      }),
      logoCloud({
        title: "Voice Integration Platforms",
        items: [
          { name: "Amazon Alexa"},
          { name: "Google Assistant"},
          { name: "Apple Siri"},
        ],
      }),
      cta({
        title: "Ready to Transform Your Technology?",
        subtitle: "Contact us for a free consultation and customized solution.",
        button: "Contact Us",
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
        title: "About BRT TRADING LLC",
        subtitle: "Designing, implementing, and supporting advanced wireless and communication infrastructures",
        ctaLabel: "Contact Us",
        ctaHref: "/contact",
      }),
      advancedRichText({
        html:
          "<p>BRT TRADING LLC specializes in designing, implementing, and supporting advanced wireless and communication infrastructures for enterprises, commercial facilities, hospitality environments, residential developments, and government sectors.</p><p>Our mission is to deliver reliable, scalable, and future-ready technology solutions that enhance connectivity, improve security, and create smarter living and working environments.</p>",
      }),
      benefitsGrid({
        title: "Our Commitment",
        items: [
          { title: "Quality", description: "Reliable, high-performance solutions built on industry-leading technologies.", icon: "fa-gem" },
          { title: "Innovation", description: "Continuously adopting emerging technologies to keep clients ahead.", icon: "fa-lightbulb" },
          { title: "Customer Satisfaction", description: "Long-term partnerships through exceptional service and measurable results.", icon: "fa-heart" },
        ],
      }),
      timeline({
        title: "Our Process",
        items: [
          { title: "Consultation & Assessment", description: "Evaluate requirements, site conditions, and business objectives."},
          { title: "Design & Planning", description: "Detailed designs for optimal performance and scalability."},
          { title: "Implementation", description: "Professional installation, configuration, and testing."},
          { title: "Training", description: "Comprehensive training for maximum value from investments."},
          { title: "Ongoing Support", description: "Monitoring, support, upgrades, and optimization."},
        ],
      }),
      trustBadges({
        title: "Why Choose BRT TRADING LLC?",
        items: [
          { label: "10+ Years Experience", icon: "fa-award" },
          { label: "500+ Projects", icon: "fa-briefcase" },
          { label: "Enterprise-Grade", icon: "fa-building" },
          { label: "End-to-End Delivery", icon: "fa-truck" },
        ],
      }),
    ],
  },
  {
    slug: "services",
    templateKey: "services",
    title: "Services",
    buildBlocks: () => [
      hero({
        title: "Our Services",
        subtitle: "Comprehensive wireless, security, and smart technology solutions",
        ctaLabel: "Request a Quote",
        ctaHref: "/contact",
      }),
      catalog({ source: "services", title: "All Services", limit: 12, viewAllHref: "/services" }),
      featureGrid({
        title: "Specialized Solutions",
        columns: 3,
        items: [
          { title: "Smart Home", description: "Full home automation and voice integration.", icon: "fa-home", href: "/smart-home" },
          { title: "Security", description: "Intelligent surveillance and access control.", icon: "fa-shield", href: "/security-solutions" },
          { title: "Enterprise Wireless", description: "Wi-Fi design, deployment, and optimization.", icon: "fa-wifi", href: "/enterprise-wireless" },
        ],
      }),
    ],
  },
  {
    slug: "smart-home",
    templateKey: "landing",
    title: "Smart Home Solutions",
    buildBlocks: (ctx) => [
      hero({
        title: "Transforming Homes Through Intelligent Automation",
        subtitle: "Convenience, comfort, security, and energy efficiency",
        imageUrl: ctx.media["service-smarthome"]?.url,
        mediaAssetId: ctx.media["service-smarthome"]?.id,
        ctaLabel: "Get Started",
        ctaHref: "/contact",
      }),
      featureGrid({
        title: "Smart Home Features",
        columns: 3,
        items: [
          { title: "Home Automation", description: "Lighting, climate, curtains, and entertainment.", icon: "fa-magic" },
          { title: "Remote Access", description: "Control from smartphone, tablet, or voice.", icon: "fa-mobile" },
          { title: "Smart Security", description: "Smart locks, cameras, and instant notifications.", icon: "fa-lock" },
          { title: "Energy Management", description: "Up to 30% reduction in energy costs.", icon: "fa-bolt" },
        ],
      }),
      benefitsGrid({
        title: "Key Benefits",
        layout: "numbered",
        items: [
          { title: "Multi-Zone Automation", description: "Control different areas independently.", icon: "fa-th" },
          { title: "24/7 Monitoring", description: "Round-the-clock security and alerts.", icon: "fa-clock" },
          { title: "Voice Assistant Integration", description: "Alexa, Google Assistant, and Siri.", icon: "fa-microphone" },
        ],
      }),
      faqBlock({ title: "Smart Home FAQ", faqSetSlug: "smart-home" }),
    ],
  },
  {
    slug: "security-solutions",
    templateKey: "landing",
    title: "Security Solutions",
    buildBlocks: (ctx) => [
      hero({
        title: "Comprehensive Security Systems",
        subtitle: "Safeguard people, assets, and operations through intelligent monitoring",
        imageUrl: ctx.media["service-security"]?.url,
        mediaAssetId: ctx.media["service-security"]?.id,
        ctaLabel: "Secure Your Property",
        ctaHref: "/contact",
      }),
      featureGrid({
        title: "Security Solutions",
        columns: 3,
        items: [
          { title: "CCTV Surveillance", description: "High-definition cameras with remote viewing.", icon: "fa-video" },
          { title: "Access Control", description: "Smart locks and centralized access management.", icon: "fa-key" },
          { title: "Video Analytics", description: "AI-powered motion detection and alerts.", icon: "fa-brain" },
          { title: "Integrated Platforms", description: "Unified security management dashboard.", icon: "fa-dashboard" },
        ],
      }),
      beforeAfter({
        title: "Before & After Security Upgrade",
        beforeImageUrl: ctx.media["project-3"]?.url ?? "",
        afterImageUrl: ctx.media["project-9"]?.url ?? "",
        beforeMediaAssetId: ctx.media["project-3"]?.id,
        afterMediaAssetId: ctx.media["project-9"]?.id,
      }),
      faqBlock({ title: "Security FAQ", faqSetSlug: "security" }),
    ],
  },
  {
    slug: "enterprise-wireless",
    templateKey: "landing",
    title: "Enterprise Wireless",
    buildBlocks: (ctx) => [
      hero({
        title: "Enterprise Wireless Network Solutions",
        subtitle: "Seamless connectivity, optimal performance, and maximum stability",
        imageUrl: ctx.media["service-wireless"]?.url,
        mediaAssetId: ctx.media["service-wireless"]?.id,
        ctaLabel: "Request Survey",
        ctaHref: "/contact",
      }),
      benefitsGrid({
        title: "Services Include",
        items: [
          { title: "Network Design & Planning", description: "Custom wireless infrastructure blueprints.", icon: "fa-drafting-compass" },
          { title: "Wi-Fi Deployment", description: "Professional installation and configuration.", icon: "fa-wifi" },
          { title: "Site Surveys", description: "Coverage analysis and dead zone elimination.", icon: "fa-map" },
          { title: "Monitoring & Maintenance", description: "24/7 network health monitoring.", icon: "fa-heartbeat" },
        ],
      }),
      statsCounter({
        title: "Network Performance",
        items: [
          { value: 99, suffix: "%", label: "Uptime SLA"},
          { value: 24, suffix: "/7", label: "NOC Monitoring"},
          { value: 100, suffix: "%", label: "Coverage Target"},
        ],
      }),
    ],
  },
  {
    slug: "gallery",
    templateKey: "gallery",
    title: "Gallery",
    buildBlocks: () => [
      hero({
        title: "Project Gallery",
        subtitle: "Explore our completed wireless, security, and smart technology projects",
      }),
      galleryBlock({
        title: "Our Work",
        gallerySlug: "brt-projects",
        columns: 3,
      }),
    ],
  },
  {
    slug: "testimonials",
    templateKey: "testimonials",
    title: "Testimonials",
    buildBlocks: () => [
      hero({
        title: "Client Testimonials",
        subtitle: "Hear from businesses and homeowners who trust BRT TRADING LLC",
      }),
      testimonialsBlock({
        title: "What Our Clients Say",
        collectionSlug: "brt-clients",
        limit: 12,
      }),
    ],
  },
  {
    slug: "contact",
    templateKey: "contact",
    title: "Contact",
    buildBlocks: (ctx) => {
      const formId = ctx.formTemplates["brt-contact"]?.id ?? "";
      return [
        hero({
          title: "Contact Us",
          subtitle: "Get in touch for a free consultation and customized solution",
        }),
        contactFormBuilder({
          title: "Send Us a Message",
          templateId: formId,
        }),
        richText({
          content:
            "<p><strong>BRT TRADING LLC</strong></p><p>📧 info@brt-me.com</p><p>🌐 www.brt-me.com</p><p>📞 +971 55 472 7292</p><p><em>Empowering Connectivity. Enhancing Security. Enabling Smart Living.</em></p>",
        }),
      ];
    },
  },
];
