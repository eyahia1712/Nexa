"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The problem in four numbers. Each box draws its own small picture when it
 * scrolls into view; the source sits underneath, in small print.
 */

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => entry?.isIntersecting && setSeen(true), { threshold: 0.35 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, seen };
}

function useCount(target: number, run: boolean, ms = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, run, ms]);
  return value;
}

/** Official UN SDG colours, mixed with ink, for the 600k dots. */
const DOT_COLORS = ["#E5243B", "#DDA63A", "#4C9F38", "#C5192D", "#FF3A21", "#26BDE2", "#FCC30B", "#A21942", "#FD6925", "#DD1367", "#FD9D24", "#BF8B2E", "#3F7E44", "#0A97D9", "#56C02B", "#00689D", "#19486A", "#111110"];

export function ProblemStats({ csrExposure }: { csrExposure: number }) {
  const { ref, seen } = useInView<HTMLDivElement>();
  const used = useCount(56, seen);
  const trained = useCount(26, seen);
  const workers = useCount(600, seen);
  const skills = useCount(39, seen);
  const exposed = useCount(Math.round(csrExposure * 100), seen);

  return (
    <div ref={ref} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Box source="Hays Asia Salary Guide 2025">
        <p className="font-mono text-[40px] leading-none font-semibold">
          <span className="text-[#2F6BFF]">{used}%</span>
          <span className="text-[22px] text-ink-3"> vs </span>
          <span className="text-auto">{trained}%</span>
        </p>
        <p className="mt-3 text-[14px] leading-snug text-ink-2">use AI at work vs. trained for it</p>
        <div className="mt-5 space-y-3">
          <Bar value={seen ? 56 : 0} gradient="linear-gradient(90deg,#26BDE2,#2F6BFF)" label="Use AI" />
          <Bar value={seen ? 26 : 0} gradient="linear-gradient(90deg,#FD9D24,#E5243B)" label="Trained" />
        </div>
        <p className="mt-3 text-[12px] text-ink-3">
          a gap of <b className="font-mono text-ink">30</b> points
        </p>
      </Box>

      <Box source="MOSTI, cited in the SDC brief">
        <p className="font-mono text-[40px] leading-none font-semibold">{workers}k+</p>
        <p className="mt-3 text-[14px] leading-snug text-ink-2">Malaysian workers to reskill in 3–5 years</p>
        <div className="mt-5 grid grid-cols-12 gap-1" aria-hidden>
          {Array.from({ length: 60 }).map((_, index) => (
            <span
              key={index}
              className="aspect-square rounded-full transition-all duration-500"
              style={{
                background: seen ? DOT_COLORS[(index * 7) % DOT_COLORS.length] : "var(--stone)",
                transform: seen ? "scale(1)" : "scale(0.4)",
                transitionDelay: `${index * 18}ms`,
              }}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-ink-3">each dot = 10,000 people</p>
      </Box>

      <Box source="WEF Future of Jobs Report 2025">
        <div className="flex items-center gap-4">
          <Ring value={seen ? 0.39 : 0} />
          <div>
            <p className="font-mono text-[40px] leading-none font-semibold">{skills}%</p>
            <p className="mt-2 text-[14px] leading-snug text-ink-2">of core skills change by 2030</p>
          </div>
        </div>
      </Box>

      <Box source="Anthropic Economic Index, Mar 2026">
        <p className="font-mono text-[40px] leading-none font-semibold">
          <span className="text-auto">{exposed}%</span>
        </p>
        <p className="mt-3 text-[14px] leading-snug text-ink-2">of a call-centre agent&apos;s task time already shows AI use</p>
        <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--human)_18%,white)]">
          <span
            className="h-full rounded-full transition-[width] duration-1000 ease-out"
            style={{ width: seen ? `${csrExposure * 100}%` : "0%", background: "linear-gradient(90deg,#FCC30B,#FD6925,#E5243B)" }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-auto" /> with AI
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-human" /> human-only
          </span>
        </div>
      </Box>
    </div>
  );
}

function Box({ children, source }: { children: React.ReactNode; source: string }) {
  return (
    <article className="group flex flex-col rounded-2xl border border-line-strong/60 bg-card p-6 text-ink shadow-[0_14px_34px_-24px_rgb(0_0_0/45%)] transition-transform duration-300 hover:-translate-y-1">
      <div className="flex-1">{children}</div>
      <p className="mt-5 text-[11px] text-ink-3">{source}</p>
    </article>
  );
}

function Bar({ value, gradient, label }: { value: number; gradient: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-[11.5px] text-ink-2">{label}</span>
      <span className="h-3 flex-1 overflow-hidden rounded-full bg-stone">
        <span className="block h-full rounded-full transition-[width] duration-1000 ease-out" style={{ width: `${value}%`, background: gradient }} />
      </span>
      <span className="w-9 text-right font-mono text-[12px]">{value}%</span>
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="size-20 shrink-0 -rotate-90" aria-hidden>
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--stone)" strokeWidth="10" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke="var(--auto)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }}
      />
    </svg>
  );
}
