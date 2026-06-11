import "@/styles/routes/marketing.css";

/** ISR: marketing pages revalidate every 5 minutes */
export const revalidate = 300;

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
