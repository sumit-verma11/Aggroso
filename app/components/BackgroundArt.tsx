// Decorative, non-interactive background: real line/circle shapes (not a
// blurred color wash) — concentric rings, a molecule-style node network,
// and a few architectural guide-lines. Fixed behind all content.
//
// Each cluster is its OWN small, self-contained SVG anchored to a screen
// corner via CSS offsets, rather than one big shared-viewBox SVG. A shared
// viewBox scaled with preserveAspectRatio="slice" crops to the center on
// aspect ratios far from the one it was designed for — on a narrow mobile
// portrait screen it cropped every shape (all positioned near the edges of
// a 1440-wide canvas) clean out of view. Independent corner-anchored
// clusters show up regardless of viewport shape.
export function BackgroundArt() {
  return (
    <div className="app-backdrop" aria-hidden="true">
      {/* Top-right: concentric rings + guide-lines */}
      <svg
        className="absolute -top-16 -right-16 h-[26rem] w-[26rem] sm:h-[34rem] sm:w-[34rem]"
        viewBox="0 0 400 400"
        fill="none"
      >
        <circle cx="260" cy="120" r="150" stroke="var(--brand)" strokeWidth="1.5" opacity="0.35" />
        <circle cx="260" cy="120" r="100" stroke="var(--brand)" strokeWidth="1.5" opacity="0.3" />
        <circle cx="260" cy="120" r="55" stroke="var(--accent)" strokeWidth="1.5" opacity="0.35" />
        <line x1="120" y1="0" x2="400" y2="220" stroke="var(--brand)" strokeWidth="1" opacity="0.2" />
        <line x1="200" y1="0" x2="400" y2="150" stroke="var(--brand)" strokeWidth="1" opacity="0.2" />
      </svg>

      {/* Bottom-left: large ring + molecule-style node network */}
      <svg
        className="absolute -bottom-16 -left-16 h-[24rem] w-[24rem] sm:h-[30rem] sm:w-[30rem]"
        viewBox="0 0 380 380"
        fill="none"
      >
        <circle cx="90" cy="290" r="130" stroke="var(--accent)" strokeWidth="1.5" opacity="0.3" />
        <circle cx="90" cy="290" r="80" stroke="var(--brand)" strokeWidth="1.5" opacity="0.25" />
        <g opacity="0.45">
          <line x1="60" y1="150" x2="150" y2="110" stroke="var(--brand)" strokeWidth="1.2" />
          <line x1="150" y1="110" x2="130" y2="220" stroke="var(--brand)" strokeWidth="1.2" />
          <line x1="150" y1="110" x2="250" y2="140" stroke="var(--brand)" strokeWidth="1.2" />
          <line x1="130" y1="220" x2="240" y2="250" stroke="var(--brand)" strokeWidth="1.2" />
          <circle cx="60" cy="150" r="6" fill="var(--brand)" />
          <circle cx="150" cy="110" r="8" fill="var(--brand)" />
          <circle cx="130" cy="220" r="6" fill="var(--accent)" />
          <circle cx="250" cy="140" r="5" fill="var(--brand)" />
          <circle cx="240" cy="250" r="5" fill="var(--accent)" />
        </g>
      </svg>

      {/* Small accent ring, mid-right (desktop only — keeps mobile uncluttered) */}
      <svg
        className="absolute right-0 top-1/2 hidden h-40 w-40 -translate-y-1/2 sm:block"
        viewBox="0 0 160 160"
        fill="none"
      >
        <circle cx="80" cy="80" r="70" stroke="var(--brand)" strokeWidth="1.2" opacity="0.25" />
      </svg>

      <div className="app-backdrop-grid" />
    </div>
  );
}
