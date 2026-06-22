export function DigitalIndiaLogo({ className = "h-12 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 230 92" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Digital India — Power To Empower">
      {/* orange swoosh (outer) */}
      <path d="M60 9 A 39 39 0 1 0 19 71" fill="none" stroke="#f1592a" strokeWidth="13" strokeLinecap="round" />
      {/* green swoosh (inner) */}
      <path d="M51 19 A 28 28 0 1 0 24 60" fill="none" stroke="#159a4b" strokeWidth="11" strokeLinecap="round" />
      {/* blue "i" / mouse */}
      <rect x="16.5" y="47" width="12" height="31" rx="6" fill="#2b7cd3" />
      <circle cx="22.5" cy="40.5" r="4.6" fill="#2b7cd3" />
      {/* wifi arcs */}
      <path d="M14 37 a 10.5 10.5 0 0 1 17 0" fill="none" stroke="#2b7cd3" strokeWidth="3" strokeLinecap="round" />
      <path d="M10.5 32 a 16 16 0 0 1 24 0" fill="none" stroke="#2b7cd3" strokeWidth="3" strokeLinecap="round" />
      {/* text */}
      <text x="92" y="50" fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fontWeight="700" fontSize="27" fill="#58595b">Digital India</text>
      <line x1="92" y1="57" x2="224" y2="57" stroke="#58595b" strokeWidth="1.6" />
      <text x="99" y="76" fontFamily="Arial, Helvetica, sans-serif" fontSize="14.5" fill="#6d6e71" letterSpacing="0.5">Power To Empower</text>
    </svg>
  );
}
