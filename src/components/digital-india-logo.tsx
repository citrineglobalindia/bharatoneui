export function DigitalIndiaLogo({ className = "h-12 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 236 96" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Digital India — Power To Empower">
      {/* orange swoosh (outer crescent) */}
      <path d="M64 9 A 41 41 0 1 0 20 73" fill="none" stroke="#f1592a" strokeWidth="15" strokeLinecap="round" />
      {/* green swoosh (nested crescent) */}
      <path d="M53 19 A 29 29 0 1 0 25 61" fill="none" stroke="#159a4b" strokeWidth="13" strokeLinecap="round" />
      {/* blue "i" / mouse body */}
      <rect x="15.5" y="48" width="13" height="33" rx="6.5" fill="#2b7cd3" />
      <circle cx="22" cy="40.5" r="4.8" fill="#2b7cd3" />
      {/* wifi arcs */}
      <path d="M13 37 a 11 11 0 0 1 18 0" fill="none" stroke="#2b7cd3" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M9.5 31.5 a 17 17 0 0 1 25 0" fill="none" stroke="#2b7cd3" strokeWidth="3.2" strokeLinecap="round" />
      {/* text */}
      <text x="94" y="51" fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fontWeight="700" fontSize="28" fill="#58595b">Digital India</text>
      <line x1="94" y1="58" x2="230" y2="58" stroke="#58595b" strokeWidth="1.8" />
      <text x="101" y="78" fontFamily="Arial, Helvetica, sans-serif" fontSize="15" fill="#6d6e71" letterSpacing="0.4">Power To Empower</text>
    </svg>
  );
}
