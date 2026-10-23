export function EspressoSketch({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 380 132" role="img" aria-label="Hand-sketched espresso, beans, and coffee leaf" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <g className="sketch-brown" strokeWidth="2.4">
        <path d="M150 24h92M160 24v12h72V24" />
        <path d="M172 36h48l-5 16h-38l-5-16Z" />
        <path d="M215 43h54" />
        <path d="M174 57c2 8-2 10 1 18M196 57c2 8-2 10 1 18M218 57c2 8-2 10 1 18" className="sketch-gold" />
        <path d="M157 82c0 24 15 38 39 38s39-14 39-38h-78Z" />
        <path d="M235 88c17-5 27 5 21 16-5 10-17 10-24 5" />
        <path d="M143 124h106" className="sketch-gold" />
      </g>
      <g className="sketch-gold" strokeWidth="2.2">
        <path d="M58 91c13-15 35-14 43 1-12 15-34 15-43-1Z" />
        <path d="M64 92c10-3 20-11 29-1" />
        <path d="M86 108c12-13 31-12 38 1-11 13-30 13-38-1Z" />
        <path d="M93 108c9-2 17-9 25 0" />
        <path d="M282 100c4-25 21-43 45-51-1 27-16 46-40 54" />
        <path d="M289 99c10-17 22-31 36-43" />
        <path d="M300 72c-14-1-24-9-29-21 14-1 25 7 29 21Z" />
      </g>
      <g className="sketch-brown" strokeWidth="2">
        <path d="M39 50c8-6 14 2 22-3M315 25c7 7 15 2 21 9" className="sketch-gold" />
      </g>
    </svg>
  );
}

export function DoughSketch({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 360 120" role="img" aria-label="Hand-sketched dough rolling and hand-cut donuts" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <g className="sketch-brown" strokeWidth="2.4">
        <path d="M56 78 236 30" />
        <path d="M45 84 30 92M247 24l18-8" className="sketch-gold" />
        <path d="M84 96c35 13 115 10 151-8-8 17-35 28-76 28S94 108 84 96Z" />
        <path d="M117 73c13-10 30-8 38 3M181 58c15-8 31-5 39 5" className="sketch-gold" />
      </g>
      <g className="sketch-brown" strokeWidth="2.3">
        <circle cx="278" cy="76" r="27" />
        <circle cx="278" cy="76" r="8" />
        <circle cx="326" cy="91" r="18" />
        <circle cx="326" cy="91" r="5" />
        <path d="M250 35c8-9 20-11 29-4M64 35c10-8 22-7 30 1" className="sketch-gold" />
      </g>
    </svg>
  );
}

export function BalloonStripe({ className = '' }: { className?: string }) {
  return <div className={`balloon-stripe ${className}`} aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>;
}
