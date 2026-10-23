import Link from "next/link";

import { NexaLogo } from "@/components/brand/logo";
import { CrossroadsScene } from "@/components/landing/crossroads-scene";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PersonaCards, type PersonaCard } from "@/components/landing/persona-cards";
import { ProblemStats } from "@/components/landing/problem-stats";
import { SiteFooter } from "@/components/landing/site-footer";
import { BTN_SAFFRON, Legend, SdgTile, TASK_LEGEND } from "@/components/ui/bits";
import { OCCUPATIONS, ROLES, ROLE_BY_ID, TASK_UNIVERSE } from "@/lib/catalog";
import { momentumFor } from "@/lib/engine/changes";
import { matchRoles } from "@/lib/engine/match";
import { EMPLOYEES, analyseEmployees, cohorts, type Employee } from "@/lib/engine/org";
import { SCENARIOS, SCENARIO_ORDER, taskShift } from "@/lib/engine/scenarios";
import { PERSONAS, profileFromPersona } from "@/lib/profile";
import { LATEST_BUNDLED } from "@/lib/signals/bundled";
import { cn } from "@/lib/utils";

const SHELL = "mx-auto w-full max-w-[1120px] px-5 md:px-8";
const INK_OUTLINE =
  "nx-micro nx-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-ink px-5 text-ink transition-colors hover:bg-ink hover:text-paper";
const H2 = "mt-3 max-w-3xl text-[clamp(1.7rem,3.4vw,2.6rem)] leading-tight font-medium tracking-[-0.02em]";

const CSR = OCCUPATIONS["43-4051.00"]!;

const SCENARIO_SHIFTS = SCENARIO_ORDER.map((id) => ({ id, label: SCENARIOS[id].short, ...taskShift(CSR, SCENARIOS[id]) }));

/** The demo bank as a tiny org tree: each leader and the people in their area, coloured by task shift. */
const shiftOf = (employee: Employee) => taskShift(OCCUPATIONS[employee.soc]!, SCENARIOS.moderate).value;
const CEO = EMPLOYEES.find((employee) => employee.managerId === null)!;
const below = (id: string): Employee[] => EMPLOYEES.filter((employee) => employee.managerId === id).flatMap((employee) => [employee, ...below(employee.id)]);
const ORG_BRANCHES = EMPLOYEES.filter((employee) => employee.managerId === CEO.id).map((leader) => ({
  leader,
  people: below(leader.id),
}));
const ORG_AVG = EMPLOYEES.reduce((sum, employee) => sum + shiftOf(employee), 0) / EMPLOYEES.length;
const band = (value: number) => (value >= 0.4 ? "bg-auto" : value >= 0.2 ? "bg-assist" : "bg-human");

export function LandingPage() {
  return (
    <div id="top" className="min-h-dvh bg-paper text-ink">
      <Nav />
      <Hero />
      <Problem />
      <People />
      <How />
      <TwoViews />
      <Evidence />
      <Faq />
      <SiteFooter />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className={cn(SHELL, "flex flex-wrap items-center gap-x-6 gap-y-2 py-3")}>
        <Link href="/" className="nx-focus" aria-label="Nexa home">
          <NexaLogo size={26} />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
          {[
            ["#problem", "The problem"],
            ["#how", "How it works"],
            ["#views", "Two views"],
            ["#evidence", "Evidence"],
            ["#faq", "FAQ"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="nx-micro nx-focus inline-flex min-h-9 items-center px-3 text-ink-2 transition-colors hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/start" className={cn(BTN_SAFFRON, "min-h-9")}>
            Find my next role
          </Link>
          <Link href="/org" className="nx-micro nx-focus hidden min-h-9 items-center px-3 text-ink-2 hover:text-ink sm:inline-flex">
            For organisations
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative">
      <div className={cn(SHELL, "pt-12 pb-10 md:pt-16")}>
        <NexaLogo size={64} className="-ml-0.5" />
        <p className="nx-micro mt-7 text-ink-3">AI-era careers &amp; workforce planning · SDG 4 Quality Education · Malaysia</p>
        <h1 className="mt-4 max-w-4xl text-[clamp(2.5rem,6vw,4.6rem)] leading-[1] font-medium tracking-[-0.03em]">AI takes tasks, not people.</h1>
        <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-ink-2">
          Nexa shows which of your tasks AI is already doing — and maps a cited, step-by-step path to your next role.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/start" className={cn(BTN_SAFFRON, "min-h-11 px-5")}>
            Find my next role
          </Link>
          <Link href="/org" className={INK_OUTLINE}>
            Open the organisation view
          </Link>
        </div>
        <p className="mt-5 font-mono text-[12.5px] text-ink-3">{TASK_UNIVERSE.matchedToAiUse.toLocaleString()} O*NET tasks matched to real AI-use data</p>
      </div>
      <CrossroadsScene className="h-[min(39vw,560px)] min-h-[300px] border-y border-line" />
    </section>
  );
}

function Problem() {
  return (
    <section id="problem" className="scroll-mt-20 border-b border-line bg-paper-2 py-16 md:py-24">
      <div className={SHELL}>
        <p className="nx-micro text-ink-3">The problem</p>
        <h2 className={H2}>Everyone can see the storm coming. Nobody has a personal forecast — or a road out.</h2>
        <ProblemStats csrExposure={CSR.exposure} />
      </div>
    </section>
  );
}

/* The "who it's for" answers come from the same engine the dashboards use. */
const MOMENTUM = momentumFor(LATEST_BUNDLED);
const topMatch = (id: string) => matchRoles(profileFromPersona(PERSONAS.find((persona) => persona.id === id)!), MOMENTUM, "moderate", 0)[0]!;
const AISYAH_SHIFT = taskShift(CSR, SCENARIOS.moderate);
const weeks = (n: number) => `~${n} week${n === 1 ? "" : "s"}`;
const AISYAH_TOP = topMatch("aisyah");
const DANIEL_TOP = topMatch("daniel");
const ORG_INSIGHTS = analyseEmployees(EMPLOYEES, MOMENTUM, "moderate");
const READY = ORG_INSIGHTS.filter((insight) => insight.bestMove && insight.bestMove.score >= 45 && insight.bestMove.weeksToReady <= 26).length;
const TOP_COHORT = cohorts(ORG_INSIGHTS)[0]!;

const PERSONA_CARDS: PersonaCard[] = [
  {
    id: "aisyah",
    initial: "A",
    color: "#2F6BFF",
    name: "Aisyah, 38",
    tag: "At-risk worker",
    situation: "AI chatbot at work",
    answer: AISYAH_TOP.role.label,
    chips: [weeks(AISYAH_TOP.weeksToReady), "free courses"],
    score: { value: `${Math.round(AISYAH_SHIFT.value * 100)}%`, label: "Task shift" },
    photo: "/personas/aisyah.jpg",
  },
  {
    id: "daniel",
    initial: "D",
    color: "#0E7A4B",
    name: "Daniel, 23",
    tag: "New graduate",
    situation: "Accounting, worried",
    answer: DANIEL_TOP.role.label,
    chips: [DANIEL_TOP.robust ? "safe in 3 futures" : "top match", weeks(DANIEL_TOP.weeksToReady)],
    score: { value: String(DANIEL_TOP.score), label: "Match" },
    photo: "/personas/daniel.jpg",
  },
  {
    id: "hr",
    initial: "HR",
    color: "#DD1367",
    name: "People team",
    tag: "HR & L&D",
    situation: "Reskill 30 staff",
    answer: ROLE_BY_ID.get(TOP_COHORT.roleId)?.label ?? "Reskilling cohorts",
    chips: ["top cohort", "fairness ✓"],
    score: { value: `${READY}/${ORG_INSIGHTS.length}`, label: "Ready" },
    photo: "/personas/hr-team.jpg",
  },
  {
    id: "counsellor",
    initial: "C",
    color: "#FD6925",
    name: "Counsellor",
    tag: "TVET centre",
    situation: "400 students",
    answer: "Live, cited report",
    chips: ["SDG-linked", "free courses"],
    score: { value: String(ROLES.length), label: "Roles" },
    photo: "/personas/tvet.jpg",
    fit: "contain",
  },
];

function People() {
  return (
    <section className="py-16 md:py-24">
      <div className={SHELL}>
        <p className="nx-micro text-ink-3">Who it&apos;s for</p>
        <h2 className={H2}>
          Built for the moment someone asks: <span className="bg-saffron px-1.5 whitespace-nowrap">“Am I next?”</span>
        </h2>
        <PersonaCards cards={PERSONA_CARDS} />
      </div>
    </section>
  );
}

function How() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-line bg-paper-2 py-16 md:py-24">
      <div className={SHELL}>
        <p className="nx-micro text-ink-3">How it works</p>
        <h2 className={H2}>Six steps. A few minutes. Every number cited.</h2>
        <HowItWorks scenarios={SCENARIO_SHIFTS} />
      </div>
    </section>
  );
}

function TwoViews() {
  const tasks = CSR.tasks.slice(0, 5);
  return (
    <section id="views" className="scroll-mt-20 py-16 md:py-24">
      <div className={SHELL}>
        <p className="nx-micro text-ink-3">Two views, one engine</p>
        <h2 className={H2}>For the person deciding — and for the organisation planning.</h2>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <article className="flex flex-col rounded-2xl border border-line-strong/60 bg-card p-6 shadow-[0_14px_34px_-24px_rgb(0_0_0/45%)]">
            <p className="nx-micro text-ink-3">Individual view</p>
            <h3 className="mt-2 text-[22px] leading-snug font-medium">My Task X-Ray, radar, matches and pathway</h3>
            <div className="mt-5 space-y-2.5 rounded-lg border border-line bg-paper p-4">
              <p className="text-[13px] font-medium">{CSR.title} — top tasks</p>
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3">
                  <span className={cn("size-2.5 shrink-0 rounded-full", task.mode === "automate" ? "bg-auto" : task.mode === "assist" ? "bg-assist" : "bg-human")} />
                  <p className="line-clamp-1 text-[12.5px] text-ink-2">{task.text}</p>
                </div>
              ))}
              <Legend items={TASK_LEGEND} />
            </div>
            <Link href="/start" className={cn(BTN_SAFFRON, "mt-6 self-start")}>
              Start with your profile
            </Link>
          </article>

          <article className="flex flex-col overflow-hidden rounded-2xl border border-line-strong/60 bg-card p-6 text-ink shadow-[0_14px_34px_-24px_rgb(0_0_0/45%)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="nx-micro text-ink-3">Organisation view</p>
                <h3 className="mt-2 text-[22px] leading-snug font-medium">The whole workforce, CEO to front line</h3>
              </div>
              <div className="text-right">
                <p className="font-mono text-[30px] leading-none text-assist">{Math.round(ORG_AVG * 100)}%</p>
                <p className="mt-1 text-[11px] text-ink-3">task time with AI by 2030</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center">
              <span className="rounded-lg bg-saffron px-3 py-1.5 text-[12.5px] font-medium text-saffron-deep">CEO</span>
              <span className="h-4 w-px bg-line-strong" />
              <div className="w-[80%] border-t border-line-strong" />
              <div className="grid w-full grid-cols-5 gap-2">
                {ORG_BRANCHES.map(({ leader, people }) => (
                  <div key={leader.id} className="flex flex-col items-center">
                    <span className="h-3 w-px bg-line-strong" />
                    <span className="w-full truncate rounded-md border border-line-strong/70 bg-paper px-1 py-1 text-center text-[11px] text-ink" title={leader.title}>
                      {leader.dept === "Executive" ? leader.title.replace("Chief ", "").replace(" Officer", "") : leader.dept}
                    </span>
                    <div className="mt-2 flex max-w-[64px] flex-wrap justify-center gap-1">
                      {people.map((person) => (
                        <span key={person.id} title={`${person.title} · ${Math.round(shiftOf(person) * 100)}%`} className={cn("size-2.5 rounded-full", band(shiftOf(person)))} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-ink-2">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-human" /> under 20%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-assist" /> 20–40%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-auto" /> 40%+
              </span>
              <span className="text-ink-3">· fictional 30-person bank</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {["Org tree", "Role outlook", "Skills heatmap", "Reskilling cohorts", "Fairness check", "SDG report"].map((item) => (
                <span key={item} className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-ink-2">
                  {item}
                </span>
              ))}
            </div>
            <Link href="/org" className={cn(BTN_SAFFRON, "mt-6 self-start")}>
              Open the organisation view
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}

const SOURCES = [
  { name: "O*NET 31.0 Database", what: "Tasks, task importance and occupations", by: "U.S. Department of Labor · CC BY 4.0" },
  { name: "Anthropic Economic Index", what: "Observed AI use per task and per occupation; automation vs augmentation", by: "Anthropic · CC BY · Mar 2026 & Mar 2025 releases" },
  { name: "arXiv API (live)", what: "Quarterly research volume per AI capability — refreshable", by: "Cornell University · open API" },
  { name: "OpenDOSM (live)", what: "Malaysia's monthly labour force survey", by: "Department of Statistics Malaysia · open API" },
  { name: "WEF Future of Jobs 2025", what: "Fastest-growing and declining roles and skills to 2030", by: "World Economic Forum · Jan 2025" },
  { name: "TalentCorp Impact Study", what: "Emerging roles in Malaysia's AI, digital and green economy", by: "TalentCorp · 2024" },
];

function Evidence() {
  return (
    <section id="evidence" className="scroll-mt-20 py-16 md:py-24">
      <div className={SHELL}>
        <p className="nx-micro text-ink-3">Evidence, not vibes</p>
        <h2 className="mt-3 max-w-3xl text-[clamp(1.7rem,3.4vw,2.6rem)] leading-tight font-medium tracking-[-0.02em]">
          Every number shows its source and date. Refresh the signals and watch the plan move.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOURCES.map((source) => (
            <article key={source.name} className="rounded-xl border border-line bg-card p-5">
              <p className="text-[16px] font-medium">{source.name}</p>
              <p className="mt-2 text-[14px] leading-snug text-ink-2">{source.what}</p>
              <p className="mt-3 text-[11.5px] text-ink-3">{source.by}</p>
            </article>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/evidence" className={INK_OUTLINE}>
            Read the methodology
          </Link>
          <div className="flex items-center gap-1.5">
            {[4, 8, 9, 10, 5, 7, 13].map((n) => (
              <SdgTile key={n} n={n} size={28} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const FAQ = [
  {
    q: "How is this different from uploading a CV to a chatbot?",
    a: "A chatbot guesses from a job title and can invent jobs, courses and numbers. Nexa forecasts task by task from measured AI use, matches only against a fixed catalogue of roles and link-checked courses, and shows the source and date of every number. The language model, when enabled, only helps read a CV into skills that you then confirm.",
  },
  {
    q: "Is the data Malaysian?",
    a: "Task lists and AI-use data are international (O*NET, Anthropic Economic Index) because tasks such as “answer billing questions” are broadly the same everywhere. Demand and context are Malaysian: OpenDOSM labour data, TalentCorp's emerging roles, HRD Corp routes and local personas. Mapping to MASCO, Malaysia's occupation classification, is on our roadmap.",
  },
  {
    q: "Predictions are uncertain. Why trust them?",
    a: "Nexa never shows one prediction. Every forecast comes in three scenarios with a range, and roles that stay in your top five in all three are marked “robust”. The scenario assumptions are written out on the methodology page.",
  },
  {
    q: "Could HR use this to decide who to let go?",
    a: "The organisation view is built for growth, not replacement: it shows reskilling cohorts and internal moves, never a “replaceable” list. Individual detail is shown only for employees who chose to share it, and every action is a suggestion a person approves.",
  },
  {
    q: "Is the SDG link just decoration?",
    a: "No. Every role is tagged to specific UN targets with a reason, and when you choose the SDGs you care about, the ranking changes — so impact can change your decision.",
  },
  {
    q: "What happens when the AI trend data changes?",
    a: "Press “Refresh signals”: Nexa queries arXiv and OpenDOSM live, recomputes skill momentum and role rankings, and explains what moved and why. Two dated readings ship with the app so you can compare a year of change offline.",
  },
];

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-line bg-paper-2 py-16 md:py-24">
      <div className={SHELL}>
        <p className="nx-micro text-ink-3">FAQ</p>
        <h2 className="mt-3 text-[clamp(1.7rem,3.4vw,2.6rem)] leading-tight font-medium tracking-[-0.02em]">Questions we expect — answered.</h2>
        <div className="mt-8 divide-y divide-line rounded-xl border border-line bg-paper">
          {FAQ.map((item) => (
            <details key={item.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium">
                {item.q}
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line font-mono text-[14px] transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-3xl text-[14.5px] leading-relaxed text-ink-2">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
