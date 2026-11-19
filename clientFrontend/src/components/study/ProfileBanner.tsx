const RINGS_FAINT = [40, 80, 120, 160, 200, 240, 280, 320];
const RINGS_BOLD = [28, 70, 112, 154, 196];

/** Concentric rings: faint grey on the left, bold ink with RAP-blue segments on the right. Decorative only. */
export const BannerArt = () => (
  <svg aria-hidden viewBox="0 0 1000 180" preserveAspectRatio="xMaxYMid slice" className="absolute inset-0 h-full w-full">
    <g fill="none" stroke="hsl(var(--line))" strokeWidth="14" opacity="0.7">
      {RINGS_FAINT.map((r) => <circle key={r} cx="720" cy="90" r={r} />)}
    </g>
    <g fill="none" strokeWidth="20">
      {RINGS_BOLD.map((r) => <circle key={r} cx="880" cy="90" r={r} stroke="hsl(var(--ink))" />)}
      {RINGS_BOLD.map((r, i) => (
        <circle key={`b${r}`} cx="880" cy="90" r={r} stroke="hsl(var(--brand-light))" strokeDasharray={`${34 + i * 6} ${2 * Math.PI * r}`} strokeDashoffset={-i * 70} />
      ))}
    </g>
  </svg>
);
