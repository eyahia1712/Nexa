import Link from "next/link";

/**
 * The close of the landing page: the paper dissolves into a deep ground,
 * dashed guides give it structure, and the wordmark rises into the bottom
 * edge. Same anatomy as the Xveris footer.
 */

/** Fill these in when they exist; empty links are hidden. */
const LINKS = {
  github: "",
  video: "",
};

const NAVIGATION = [
  { href: "/", label: "Home" },
  { href: "/start", label: "Find my next role" },
  { href: "/me", label: "My dashboard" },
  { href: "/org", label: "Organisation view" },
  { href: "/evidence", label: "Evidence" },
];

const RESOURCES = [
  { href: "/evidence", label: "Methodology" },
  { href: LINKS.github, label: "GitHub repository", external: true },
  { href: LINKS.video, label: "Demo video", external: true },
  { href: "https://www.onetcenter.org/database.html", label: "O*NET data", external: true },
  { href: "https://huggingface.co/datasets/Anthropic/EconomicIndex", label: "Anthropic Economic Index", external: true },
  { href: "https://sdgs.un.org/goals", label: "UN SDGs", external: true },
].filter((item) => item.href !== "");

const LINK = "transition-opacity hover:opacity-70";

export function SiteFooter() {
  return (
    <footer className="nx-footer-ground relative isolate overflow-hidden text-[#f3f3f3]">
      <div className="relative z-10 px-5 pt-28 md:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-12 lg:gap-7">
          <div className="relative grid gap-9 lg:col-span-5">
            <span aria-hidden className="absolute -top-5 left-0 block size-1.5 bg-[#f3f3f3]/70" />
            <div>
              <p className="nx-micro text-[#f3f3f3]/50">Built by</p>
              <p className="mt-3 text-[clamp(1.7rem,3vw,2.3rem)] leading-none font-medium tracking-[-0.02em]">EcoByte</p>
            </div>
            <div>
              <p className="nx-micro text-[#f3f3f3]/50">Built for</p>
              <p className="mt-3 text-[clamp(1.7rem,3vw,2.3rem)] leading-none font-medium tracking-[-0.02em]">SDC Hackathon 2026</p>
              <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-[#f3f3f3]/60">
                Domain 1 · Future-Ready Workforce. SDG 4 Quality Education, with SDGs 5, 8, 9 and 10.
              </p>
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:col-span-6 lg:col-start-7 lg:grid-cols-3">
            <FooterColumn heading="Navigation">
              {NAVIGATION.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={LINK}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </FooterColumn>
            <FooterColumn heading="Resources">
              {RESOURCES.map((item) => (
                <li key={item.label}>
                  {item.external ? (
                    <a href={item.href} target="_blank" rel="noreferrer" className={LINK}>
                      {item.label}
                    </a>
                  ) : (
                    <Link href={item.href} className={LINK}>
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </FooterColumn>
            <div className="flex items-start sm:justify-end">
              <a href="#top" className="group flex items-center gap-3" aria-label="Back to top">
                <span className="nx-micro text-[#f3f3f3]/70">Back to top</span>
                <span className="grid size-[34px] place-items-center bg-white/10 transition-colors group-hover:bg-white group-hover:text-[#04122b]">
                  <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M8 13V3M8 3L3.5 7.5M8 3l4.5 4.5" />
                  </svg>
                </span>
              </a>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-16 w-full max-w-7xl border-t border-white/12">
          <div className="flex flex-wrap items-center justify-between gap-4 py-5">
            <p className="nx-micro text-[#f3f3f3]/55">SDC Hackathon 2026 · AI for a future-ready workforce</p>
            <p className="text-[12px] tracking-[0.04em] text-[#f3f3f3]/45">© 2026 EcoByte · Apache-2.0</p>
          </div>
        </div>
      </div>

      <div className="relative mt-2 h-[13vw] min-h-[56px] overflow-hidden">
        <p
          aria-hidden
          className="-mt-[0.05em] text-center text-[19vw] leading-[0.78] font-extrabold tracking-[-0.045em] whitespace-nowrap text-[#f3f3f3] italic"
          style={{ fontFamily: "var(--font-logo), var(--font-sans), sans-serif" }}
        >
          Nexa
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="nx-micro text-[#f3f3f3]/55">{heading}</h2>
      <ul className="mt-4 space-y-2.5 text-[16px] leading-snug font-medium">{children}</ul>
    </div>
  );
}
