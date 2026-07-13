/** Decorative floating orbs + glow — sample FeaturesBlock / catalog hero parity */
export function HeroAtmosphere({ showGlow = true }: { showGlow?: boolean }) {
  return (
    <>
      <div className="az-hero-atmosphere" aria-hidden>
        <span className="az-hero-orb az-hero-orb--1" />
        <span className="az-hero-orb az-hero-orb--2" />
        <span className="az-hero-orb az-hero-orb--3" />
      </div>
      {showGlow ? <div className="az-hero-glow" aria-hidden /> : null}
    </>
  );
}

export function SectionAtmosphere() {
  return (
    <div className="az-section-atmosphere" aria-hidden>
      <span className="az-section-orb az-section-orb--primary" />
      <span className="az-section-orb az-section-orb--accent" />
    </div>
  );
}
