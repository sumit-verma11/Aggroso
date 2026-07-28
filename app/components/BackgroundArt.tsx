// Decorative, non-interactive background: real line/circle shapes (not a
// blurred color wash) — concentric rings, a molecule-style node network,
// and a few architectural guide-lines. Fixed behind all content.
export function BackgroundArt() {
  return (
    <div className="app-backdrop" aria-hidden="true">
      <svg
        className="h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {/* Concentric rings, top-right */}
        <circle cx="1280" cy="120" r="260" stroke="var(--brand)" strokeWidth="1.5" opacity="0.35" />
        <circle cx="1280" cy="120" r="180" stroke="var(--brand)" strokeWidth="1.5" opacity="0.3" />
        <circle cx="1280" cy="120" r="100" stroke="var(--accent)" strokeWidth="1.5" opacity="0.35" />

        {/* Architectural guide-lines, top-right */}
        <line x1="900" y1="0" x2="1440" y2="380" stroke="var(--brand)" strokeWidth="1" opacity="0.18" />
        <line x1="1050" y1="0" x2="1440" y2="260" stroke="var(--brand)" strokeWidth="1" opacity="0.18" />
        <line x1="960" y1="260" x2="1440" y2="260" stroke="var(--brand)" strokeWidth="1" opacity="0.15" />

        {/* Large single ring, bottom-left */}
        <circle cx="80" cy="820" r="220" stroke="var(--accent)" strokeWidth="1.5" opacity="0.3" />
        <circle cx="80" cy="820" r="140" stroke="var(--brand)" strokeWidth="1.5" opacity="0.25" />

        {/* Molecule-style node network, lower-left */}
        <g opacity="0.4">
          <line x1="120" y1="620" x2="260" y2="560" stroke="var(--brand)" strokeWidth="1.2" />
          <line x1="260" y1="560" x2="230" y2="700" stroke="var(--brand)" strokeWidth="1.2" />
          <line x1="260" y1="560" x2="400" y2="600" stroke="var(--brand)" strokeWidth="1.2" />
          <line x1="230" y1="700" x2="380" y2="740" stroke="var(--brand)" strokeWidth="1.2" />
          <circle cx="120" cy="620" r="6" fill="var(--brand)" />
          <circle cx="260" cy="560" r="8" fill="var(--brand)" />
          <circle cx="230" cy="700" r="6" fill="var(--accent)" />
          <circle cx="400" cy="600" r="5" fill="var(--brand)" />
          <circle cx="380" cy="740" r="5" fill="var(--accent)" />
        </g>

        {/* Small accent ring, mid-right */}
        <circle cx="1360" cy="620" r="70" stroke="var(--brand)" strokeWidth="1.2" opacity="0.25" />
      </svg>
      <div className="app-backdrop-grid" />
    </div>
  );
}
