// A "P" drawn as contribution-graph cells. Keep in sync with app/icon.svg.
const CELLS: [number, number, number][] = [
  // col, row, intensity
  [0, 0, 1], [1, 0, 0.85],
  [0, 1, 0.95], [2, 1, 0.7],
  [0, 2, 0.85], [1, 2, 0.65],
  [0, 3, 0.6],
];

export default function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0e1a1c" />
      <rect x=".5" y=".5" width="31" height="31" rx="7.5" fill="none" stroke="#83ebf1" strokeOpacity=".35" />
      {CELLS.map(([c, r, o]) => (
        <rect key={`${c}${r}`} x={7 + c * 6.5} y={4 + r * 6.5} width="5.5" height="5.5" rx="1.4" fill="#83ebf1" fillOpacity={o} />
      ))}
    </svg>
  );
}
