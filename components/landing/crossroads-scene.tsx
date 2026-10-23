"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * The hero: a person at a crossroads in a city at sunrise, deciding which road
 * to take. Each road leads to a future role. The person keeps looking from one
 * to the next, a thought bubble shows what they're weighing up, and the radar
 * on the rooftop sends its signal to the road in view. Hover or tap a road to
 * look down it — a showcase only, nothing navigates. SVG and CSS only — light, and still for anyone
 * who asks for reduced motion.
 */

interface Road {
  id: string;
  label: string;
  note: string;
  color: string;
  /** Centre line of the road, from the junction outwards. */
  path: string;
  sign: { x: number; y: number };
  look: -1 | 0 | 1;
}

const ROADS: Road[] = [
  {
    id: "data",
    label: "Data Analyst",
    note: "Growing to 2030",
    color: "#2F6BFF",
    path: "M592 302 C 520 292, 420 290, 318 288",
    sign: { x: 318, y: 288 },
    look: -1,
  },
  {
    id: "esg",
    label: "ESG Specialist",
    note: "Emerging in Malaysia",
    color: "#0E7A4B",
    path: "M600 300 L 600 238",
    sign: { x: 600, y: 238 },
    look: 0,
  },
  {
    id: "ux",
    label: "UX Designer",
    note: "Growing to 2030",
    color: "#DD1367",
    path: "M608 302 C 680 292, 780 290, 882 288",
    sign: { x: 882, y: 288 },
    look: 1,
  },
];

const BUILDINGS: { x: number; w: number; h: number; color: string; roof?: "flat" | "spire" | "dish" }[] = [
  { x: 20, w: 58, h: 118, color: "#1D4A61" },
  { x: 84, w: 44, h: 86, color: "#D2453B" },
  { x: 134, w: 70, h: 150, color: "#111110", roof: "dish" },
  { x: 212, w: 46, h: 96, color: "#FFB000" },
  { x: 264, w: 60, h: 128, color: "#1F7A4D" },
  { x: 380, w: 52, h: 104, color: "#5B7083" },
  { x: 438, w: 40, h: 72, color: "#D2453B" },
  { x: 700, w: 46, h: 88, color: "#1F7A4D" },
  { x: 752, w: 64, h: 140, color: "#1D4A61", roof: "spire" },
  { x: 822, w: 44, h: 92, color: "#FFB000" },
  { x: 940, w: 58, h: 112, color: "#D2453B" },
  { x: 1004, w: 72, h: 156, color: "#111110" },
  { x: 1082, w: 50, h: 96, color: "#1F7A4D" },
  { x: 1138, w: 56, h: 122, color: "#5B7083" },
];

const GROUND = 300;

export function CrossroadsScene({ className }: { className?: string }) {
  const [auto, setAuto] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? auto;
  const road = ROADS[active]!;

  // The person keeps weighing the options until someone picks one.
  useEffect(() => {
    if (hover !== null) return;
    const timer = setInterval(() => setAuto((value) => (value + 1) % ROADS.length), 2600);
    return () => clearInterval(timer);
  }, [hover]);

  return (
    <div className={cn("relative w-full overflow-hidden bg-paper", className)}>
      <svg viewBox="0 0 1200 470" className="block h-full w-full" preserveAspectRatio="xMidYMax slice" role="img" aria-label="A person at a crossroads deciding between three future roles">
        <defs>
          <linearGradient id="cx-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FBFAF6" />
            <stop offset="55%" stopColor="#FDF1D6" />
            <stop offset="100%" stopColor="#FFE3A0" />
          </linearGradient>
          <radialGradient id="cx-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFC300" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FFC300" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="cx-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EDE6D2" />
            <stop offset="100%" stopColor="#DCD3BB" />
          </linearGradient>
          <linearGradient id="cx-road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2E2E2B" />
            <stop offset="100%" stopColor="#111110" />
          </linearGradient>
          <filter id="cx-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* Sky, sun, clouds, birds */}
        <rect width="1200" height={GROUND} fill="url(#cx-sky)" />
        <circle cx="1010" cy="92" r="150" fill="url(#cx-glow)" />
        <circle cx="1010" cy="92" r="42" fill="#FFC300" />
        <g className="nx-drift-slow" opacity="0.9">
          <Cloud x={120} y={60} s={0.8} />
          <Cloud x={560} y={38} s={0.55} />
          <Cloud x={1320} y={60} s={0.8} />
          <Cloud x={1760} y={38} s={0.55} />
        </g>
        <g className="nx-drift-mid" fill="none" stroke="#111110" strokeWidth="2" strokeLinecap="round" opacity="0.55">
          {[
            [700, 70],
            [724, 82],
            [1900, 60],
            [1926, 74],
          ].map(([x, y]) => (
            <path key={`${x}-${y}`} className="nx-flap" d={`M${x} ${y} q6 -6 12 0 q6 -6 12 0`} />
          ))}
        </g>

        {/* Far skyline */}
        <g fill="#0B1B28" opacity="0.1">
          {[[0, 210], [70, 180], [180, 230], [320, 196], [460, 224], [560, 186], [660, 220], [800, 190], [900, 230], [1040, 200], [1150, 220]].map(([x, top]) => (
            <rect key={x} x={x} y={top} width="96" height={GROUND - (top ?? 0)} />
          ))}
        </g>

        {/* Near skyline: colourful blocks, windows that switch on and off */}
        {BUILDINGS.map((building, index) => {
          const top = GROUND - building.h;
          return (
            <g key={building.x}>
              <rect x={building.x} y={top} width={building.w} height={building.h} fill={building.color} opacity="0.92" />
              <rect x={building.x} y={top} width={building.w} height="5" fill="#000" opacity="0.15" />
              {Array.from({ length: Math.floor((building.h - 18) / 18) }).map((_, row) =>
                Array.from({ length: Math.max(1, Math.floor((building.w - 10) / 14)) }).map((__, col) => (
                  <rect
                    key={`${row}-${col}`}
                    x={building.x + 7 + col * 14}
                    y={top + 12 + row * 18}
                    width="7"
                    height="8"
                    fill="#FFF3C4"
                    opacity={(row + col + index) % 3 === 0 ? 0.85 : 0.22}
                    className={(row * 7 + col * 3 + index) % 9 === 0 ? "nx-blink" : undefined}
                    style={{ animationDelay: `${((row + col + index) % 5) * 0.6}s` }}
                  />
                )),
              )}
              {building.roof === "spire" ? <rect x={building.x + building.w / 2 - 1.5} y={top - 26} width="3" height="26" fill={building.color} /> : null}
            </g>
          );
        })}

        {/* Radar on the rooftop, sending its signal to the road in view */}
        <g transform="translate(169 138)">
          <rect x="-3" y="10" width="6" height="22" fill="#111110" />
          <path d="M-24 12 A24 24 0 0 1 24 12 Z" fill="#2E2E2B" />
          <g className="nx-sweep" style={{ transformOrigin: "0px 12px" }}>
            <path d="M0 12 L0 -22" stroke="#FFC300" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <circle cx="0" cy="12" r="3" fill="#FFC300" />
        </g>
        <path
          pointerEvents="none"
          d={`M169 126 Q ${(169 + road.sign.x) / 2} ${road.look === 0 ? 40 : 70} ${road.sign.x} ${road.sign.y - 78}`}
          fill="none"
          stroke={road.color}
          strokeWidth="2"
          strokeDasharray="4 8"
          className="nx-road"
          opacity="0.7"
          style={{ transition: "d 600ms ease" }}
        />
        <circle cx={road.sign.x} cy={road.sign.y - 78} r="5" fill={road.color} className="nx-live" pointerEvents="none" />

        {/* Ground */}
        <rect y={GROUND - 2} width="1200" height={470 - GROUND + 2} fill="url(#cx-ground)" />
        {[60, 170, 1010, 1120, 470, 760].map((x) => (
          <path key={x} d={`M${x} ${GROUND + 34} q4 -12 8 0 q4 -10 8 0`} fill="none" stroke="#B9B5AA" strokeWidth="2" />
        ))}

        {/* The three roads */}
        {ROADS.map((item, index) => {
          const on = index === active;
          return (
            <g
              key={item.id}
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(index)}
              onBlur={() => setHover(null)}
              className="cursor-default"
            >
              <path d={item.path} fill="none" stroke="transparent" strokeWidth="44" />
              <path d={item.path} fill="none" stroke="url(#cx-road)" strokeWidth={item.look === 0 ? 20 : 13} strokeLinecap="round" />
              <path
                d={item.path}
                fill="none"
                stroke={item.color}
                strokeWidth={item.look === 0 ? 20 : 13}
                strokeLinecap="round"
                style={{ opacity: on ? 0.95 : 0, transition: "opacity 450ms ease" }}
              />
              {on ? <path d={item.path} fill="none" stroke={item.color} strokeWidth="26" strokeLinecap="round" opacity="0.35" filter="url(#cx-soft)" pointerEvents="none" /> : null}
              <path d={item.path} fill="none" stroke="#FFC300" strokeWidth="1.8" strokeDasharray="7 9" className="nx-road" opacity={on ? 0 : 0.9} />
            </g>
          );
        })}

        {/* Main road toward us */}
        <path d={`M450 470 L 750 470 L 612 ${GROUND} L 588 ${GROUND} Z`} fill="url(#cx-road)" pointerEvents="none" />
        <path d={`M600 470 L 600 ${GROUND + 4}`} stroke="#FFC300" strokeWidth="3" strokeDasharray="14 16" className="nx-road" pointerEvents="none" />

        {/* Signposts: hover to look down a road (display only) */}
        {ROADS.map((item, index) => (
          <Signpost key={item.id} road={item} on={index === active} onEnter={() => setHover(index)} onLeave={() => setHover(null)} />
        ))}

        {/* The person, deciding */}
        <Person look={road.look} color={road.color} label={road.label} />
      </svg>

      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-4">
        <p className="nx-micro rounded-full border border-line bg-paper/85 px-3 py-1 text-[11px] text-ink-2 backdrop-blur">Three roads. One decision. Hover a road to look down it.</p>
      </div>
    </div>
  );
}

function Signpost({ road, on, onEnter, onLeave }: { road: Road; on: boolean; onEnter: () => void; onLeave: () => void }) {
  const width = road.label.length * 8.6 + 34;
  const flip = road.look === 1;
  const top = road.sign.y - 70;
  const board = flip
    ? `M0 0 h${width - 12} l12 13 l-12 13 h-${width - 12} z`
    : road.look === -1
      ? `M12 0 h${width - 12} v26 h-${width - 12} l-12 -13 z`
      : `M0 0 h${width} v26 h-${width} z`;
  return (
    <g
        transform={`translate(${road.sign.x - width / 2} ${top})`}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className="cursor-default"
        style={{ transition: "transform 400ms cubic-bezier(0.22,1,0.36,1)" }}
      >
        {/* Fixed hover area covering board, post and note, so lifting the board never flickers. */}
        <rect x="-14" y="-40" width={width + 28} height="114" fill="transparent" />
        <rect x={width / 2 - 2.5} y="26" width="5" height="44" fill="#111110" pointerEvents="none" />
        <g pointerEvents="none" style={{ transform: on ? "translateY(-4px)" : "none", transition: "transform 400ms cubic-bezier(0.22,1,0.36,1)" }}>
          <path d={board} fill={on ? road.color : "#111110"} style={{ transition: "fill 400ms ease" }} />
          <text x={width / 2} y="17.5" textAnchor="middle" fontFamily="var(--font-narrow), sans-serif" fontSize="12.5" letterSpacing="1.1" fill={on ? "#FFFFFF" : "#FFC300"}>
            {road.label.toUpperCase()}
          </text>
          {on ? (
            <g className="nx-rise">
              <rect x={width / 2 - 66} y="-30" width="132" height="22" rx="11" fill="#FFFFFF" stroke={road.color} />
              <text x={width / 2} y="-15" textAnchor="middle" fontSize="11.5" fill="#111110" fontFamily="var(--font-sans), sans-serif">
                {road.note}
              </text>
            </g>
          ) : null}
        </g>
    </g>
  );
}

function Person({ look, color, label }: { look: -1 | 0 | 1; color: string; label: string }) {
  return (
    <g transform="translate(600 450) scale(0.95)" pointerEvents="none">
      <ellipse cx="0" cy="2" rx="26" ry="6" fill="#000" opacity="0.18" />
      {/* Legs and shoes */}
      <path d="M-8 -38 L-10 -2 M8 -38 L10 -2" stroke="#1D2A36" strokeWidth="9" strokeLinecap="round" />
      <path d="M-16 0 h10 M6 0 h10" stroke="#111110" strokeWidth="5" strokeLinecap="round" />
      {/* Body: a saffron hoodie */}
      <path d="M-19 -84 Q0 -94 19 -84 L22 -36 L-22 -36 Z" fill="#FFC300" />
      <path d="M-6 -88 Q0 -82 6 -88" fill="none" stroke="#C99700" strokeWidth="2" />
      {/* Right arm hangs, holding a phone */}
      <path d="M18 -80 Q27 -62 22 -44" fill="none" stroke="#FFC300" strokeWidth="9" strokeLinecap="round" />
      <rect x="17" y="-46" width="9" height="14" rx="2" fill="#111110" />
      {/* Left arm bent, hand at the chin: thinking */}
      <path d="M-18 -80 Q-30 -62 -14 -58 L-5 -92" fill="none" stroke="#FFC300" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="-4" cy="-94" r="5.5" fill="#E2A57A" />
      {/* Head turns toward the road in view */}
      <g style={{ transform: `rotate(${look * 9}deg)`, transformOrigin: "0px -96px", transformBox: "view-box", transition: "transform 600ms cubic-bezier(0.22,1,0.36,1)" }}>
        <rect x="-4" y="-100" width="8" height="8" fill="#E2A57A" />
        <circle cx="0" cy="-112" r="14" fill="#E2A57A" />
        <path d="M-14 -114 Q-12 -130 2 -129 Q15 -128 14 -113 Q8 -121 -2 -120 Q-9 -119 -14 -114 Z" fill="#1D2A36" />
        <g style={{ transform: `translateX(${look * 3}px)`, transition: "transform 600ms ease" }}>
          <circle cx="-5" cy="-111" r="1.8" fill="#111110" />
          <circle cx="5" cy="-111" r="1.8" fill="#111110" />
        </g>
        <path d="M-4 -104 Q0 -102 4 -104" fill="none" stroke="#8A4B2F" strokeWidth="1.6" strokeLinecap="round" />
      </g>
      {/* Thought bubble, to the side so it never hides the roads */}
      <g className="nx-float">
        <circle cx="22" cy="-122" r="3.5" fill="#FFFFFF" stroke="#CFCABE" />
        <circle cx="36" cy="-134" r="5.5" fill="#FFFFFF" stroke="#CFCABE" />
        <g transform="translate(52 -178)">
          <rect x="0" y="0" width="176" height="50" rx="25" fill="#FFFFFF" stroke="#CFCABE" />
          <circle cx="25" cy="25" r="9" fill={color} style={{ transition: "fill 400ms ease" }} />
          <text x="42" y="22" fontSize="13" fill="#111110" fontFamily="var(--font-sans), sans-serif" fontWeight="600">
            {label}?
          </text>
          <text x="42" y="38" fontSize="11" fill="#5C5A54" fontFamily="var(--font-sans), sans-serif">
            Is this my road?
          </text>
        </g>
      </g>
    </g>
  );
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#FFFFFF">
      <ellipse cx="60" cy="30" rx="60" ry="22" />
      <ellipse cx="100" cy="18" rx="40" ry="22" />
      <ellipse cx="30" cy="22" rx="30" ry="16" />
    </g>
  );
}
