import { TopBar } from "@/components/app/top-bar";
import { Card, Micro, SourceLine } from "@/components/ui/bits";
import { COURSES, DATA_BUILT_ON, LINK_CHECK, OCCUPATIONS, ROLES, SKILLS, TASK_UNIVERSE } from "@/lib/catalog";
import { CLAUDE_MODEL } from "@/lib/cv/claude";
import { SCENARIOS, SCENARIO_ORDER } from "@/lib/engine/scenarios";
import { BUNDLED_SNAPSHOTS } from "@/lib/signals/bundled";
import { formatDate } from "@/lib/utils";


const SOURCES = [
  {
    name: "O*NET 31.0 Database",
    use: "Official task list and task importance for each occupation (Task X-Ray, exposure weighting).",
    by: "U.S. Department of Labor, Employment and Training Administration / National Center for O*NET Development",
    licence: "CC BY 4.0",
    date: "Release 31.0",
    url: "https://www.onetcenter.org/database.html",
  },
  {
    name: "Anthropic Economic Index — labor market impacts",
    use: "Observed AI exposure per occupation and AI coverage per task, from real-world Claude usage.",
    by: "Anthropic (Massenkoff & McCrory)",
    licence: "CC BY",
    date: "Published 5 Mar 2026",
    url: "https://huggingface.co/datasets/Anthropic/EconomicIndex/tree/main/labor_market_impacts",
  },
  {
    name: "Anthropic Economic Index — automation vs augmentation by task",
    use: "Whether AI use on a task is mostly directive (AI takes over) or collaborative (AI assists).",
    by: "Anthropic",
    licence: "CC BY",
    date: "Release 27 Mar 2025",
    url: "https://huggingface.co/datasets/Anthropic/EconomicIndex/tree/main/release_2025_03_27",
  },
  {
    name: "arXiv API (live)",
    use: "Quarterly number of research papers per AI capability, year on year — the AI-advancement signal in Skill Momentum.",
    by: "Cornell University",
    licence: "Open API, metadata CC0",
    date: "Queried live; bundled readings below",
    url: "https://info.arxiv.org/help/api/index.html",
  },
  {
    name: "OpenDOSM Labour Force Survey (live)",
    use: "Malaysia's monthly unemployment, employment and participation rates.",
    by: "Department of Statistics Malaysia, via api.data.gov.my",
    licence: "Open data — “Source: Department of Statistics Malaysia”",
    date: "Monthly; queried live",
    url: "https://open.dosm.gov.my/",
  },
  {
    name: "WEF Future of Jobs Report 2025",
    use: "Direction of skill clusters (rising / stable / declining) and of roles (fastest-growing, declining).",
    by: "World Economic Forum",
    licence: "Cited, not redistributed",
    date: "7 Jan 2025",
    url: "https://www.weforum.org/publications/the-future-of-jobs-report-2025/",
  },
  {
    name: "TalentCorp Impact Study (AI, digital and green economy)",
    use: "Malaysian emerging roles (e.g. AI engineers, sustainability specialists).",
    by: "Talent Corporation Malaysia",
    licence: "Cited, not redistributed",
    date: "2024",
    url: "https://twentytwo13.my/talentcorps-latest-study-on-impact-of-ai-digital-and-green-economy-lists-emerging-jobs-across-key-sectors-in-malaysia/",
  },
  {
    name: "United Nations Sustainable Development Goals",
    use: "Goal names, official colours and target wording for SDG tags.",
    by: "United Nations",
    licence: "Public",
    date: "2015 agenda",
    url: "https://sdgs.un.org/goals",
  },
];

const FORMULAS = [
  {
    title: "Task shift by 2030 (the big saffron number)",
    body: "shift = E × adoption + (1 − E) × spillover, where E is the job's observed AI exposure (Economic Index) and adoption / spillover come from the scenario. The range uses adoption ± 0.10 and spillover × 0.6–1.4. The split into “AI assists” and “AI takes over” uses the job's importance-weighted share of directive vs collaborative AI use.",
  },
  {
    title: "Skill Momentum (0–100)",
    body: "50 + employer outlook (WEF 2025: rising +12, stable 0, declining −15) + AI research momentum (arXiv papers on the skill year on year, relative to all of arXiv; capped at −10 / +22) − AI substitution pressure (25 × observed exposure of the routine job the skill belongs to, scaled by scenario). Bands: ≥68 rising fast, ≥56 rising, ≥44 steady, below that declining.",
  },
  {
    title: "Match score (0–100)",
    body: "Skills you have (60 × weighted share of the role's skills held at working level; basic counts half) + transferable (up to 15, from related skills you hold) + future demand (25 × demand/100) − entry barrier (degree −8, licence −15, waived if you already work in that occupation). Demand = outlook base (growing 58 + 8 × strength, steady 50) + 0.4 × (momentum of key skills − 50) + AI pull − exposure penalty for the scenario. Ranked in all three scenarios; top 5 in all three = “robust”.",
  },
  {
    title: "Pathway",
    body: "Every essential and important gap, plus missing prerequisites, ordered by prerequisite, then level, then importance. Each step takes the first-choice course (free first, level-fit, shortest) and scales its hours by what you already know. Weeks = hours ÷ your hours per week.",
  },
  {
    title: "Impact Compass",
    body: "Impact score = match × (1 + 0.3 × weight × alignment), where alignment is the share of your chosen Goals that the role's SDG targets advance and weight is your slider. With the slider at 0, SDGs never change the order.",
  },
  {
    title: "Fairness check",
    body: "Average best-internal-move score per gender and per age band. Gender and age are never matching inputs; a gap of more than 10 points between groups is flagged for human review.",
  },
];

const LIMITS = [
  ["Task and AI-use data are international, not Malaysian.", "Tasks inside a job are broadly similar across countries; Malaysian demand and context come from OpenDOSM, TalentCorp and HRD Corp. Mapping to MASCO is on the roadmap."],
  ["AI use is measured on Claude conversations only.", "Treated as a floor, not a ceiling, and shown alongside a second, independent view (WEF) and three scenarios."],
  ["Research volume is a proxy for capability progress.", "Used only as one capped part of Skill Momentum, always shown with its raw numbers."],
  ["Scenario parameters are assumptions.", "Written out here, shown as ranges, and every role is ranked in all three scenarios."],
  ["Course hours are provider estimates or approximations.", "Marked as approximate; links are checked automatically and the date shown."],
  ["A language model could invent skills or jobs.", "It only reads CVs into a fixed list of skill ids; anything outside the list is dropped, and the person confirms every skill. Roles, courses and numbers never come from the model."],
];

export default function EvidencePage() {
  const ok = Object.values(LINK_CHECK.results).filter((result) => result.status >= 200 && result.status < 400).length;
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <TopBar />
      <main className="mx-auto w-full max-w-[1100px] px-5 pt-10 pb-20 md:px-8">
        <Micro>Evidence &amp; methodology</Micro>
        <h1 className="mt-3 text-[clamp(1.9rem,4vw,3rem)] leading-[1.05] font-medium tracking-[-0.025em]">Every number, where it comes from, and how it&apos;s computed.</h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-2">
          Nexa only talks about what is in its catalogue — {Object.keys(OCCUPATIONS).length} occupations, {SKILLS.length} skills, {ROLES.length} roles, {COURSES.length} courses — and every number on screen comes
          from a source below. Data files were built on {formatDate(DATA_BUILT_ON)} from {TASK_UNIVERSE.onetTasks.toLocaleString()} O*NET tasks, of which {TASK_UNIVERSE.matchedToAiUse.toLocaleString()} matched
          the Economic Index.
        </p>

        <h2 className="mt-12 text-[22px] font-medium">Sources</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {SOURCES.map((source) => (
            <Card key={source.name} className="p-5">
              <a href={source.url} target="_blank" rel="noreferrer" className="text-[16px] font-medium underline-offset-4 hover:underline">
                {source.name} ↗
              </a>
              <p className="mt-2 text-[14px] leading-snug text-ink-2">{source.use}</p>
              <p className="mt-3 text-[12px] text-ink-3">
                {source.by} · {source.licence} · {source.date}
              </p>
            </Card>
          ))}
        </div>

        <h2 className="mt-12 text-[22px] font-medium">Trend readings bundled with the app</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
          {BUNDLED_SNAPSHOTS.map((snapshot) => (
            <div key={snapshot.id} className="grid gap-2 border-b border-line px-5 py-4 last:border-b-0 md:grid-cols-[200px_1fr_200px]">
              <p className="text-[14px] font-medium">{snapshot.label}</p>
              <p className="text-[13px] text-ink-2">
                arXiv {snapshot.window.current.from} → {snapshot.window.current.to} vs {snapshot.window.previous.from} → {snapshot.window.previous.to} · {Object.keys(snapshot.arxiv.skills).length} skills ·
                arXiv total {snapshot.arxiv.total.previous.toLocaleString()} → {snapshot.arxiv.total.current.toLocaleString()}
                {snapshot.labour ? ` · OpenDOSM ${snapshot.labour.length} months` : ""}
              </p>
              <p className="font-mono text-[12px] text-ink-3 md:text-right">fetched {formatDate(snapshot.fetchedAt)}</p>
            </div>
          ))}
        </div>
        <SourceLine className="mt-2">Press “Refresh signals” in the app for a live reading; it is saved and can be compared with these.</SourceLine>

        <h2 className="mt-12 text-[22px] font-medium">How each score is computed</h2>
        <div className="mt-4 space-y-3">
          {FORMULAS.map((formula) => (
            <Card key={formula.title} className="p-5">
              <p className="text-[15px] font-medium">{formula.title}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{formula.body}</p>
            </Card>
          ))}
        </div>

        <h2 className="mt-12 text-[22px] font-medium">Scenario assumptions</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {SCENARIO_ORDER.map((id) => (
            <Card key={id} className="p-5">
              <p className="text-[15px] font-medium">{SCENARIOS[id].label}</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{SCENARIOS[id].description}</p>
              <p className="mt-3 font-mono text-[12px] text-ink-3">
                adoption {SCENARIOS[id].adoption} · spillover {SCENARIOS[id].spillover} · routine ×{SCENARIOS[id].routinePressure}
              </p>
            </Card>
          ))}
        </div>

        <h2 className="mt-12 text-[22px] font-medium">Guardrails</h2>
        <Card className="mt-4 p-5">
          <ul className="space-y-2.5 text-[14px] leading-relaxed text-ink-2">
            <li>
              <b className="text-ink">Closed catalogue.</b> Roles, skills, courses and SDG targets come only from Nexa&apos;s curated files; automated tests fail the build if anything points outside them.
            </li>
            <li>
              <b className="text-ink">AI disclosure.</b> The only language model is Anthropic&apos;s Claude ({CLAUDE_MODEL}), used optionally to read a CV into skill ids. Without an API key, Nexa uses
              transparent keyword matching. Scores, rankings and pathways are deterministic code.
            </li>
            <li>
              <b className="text-ink">Synthetic data only.</b> Sample people and the demo bank are invented. Uploaded CVs are read in memory and never stored.
            </li>
            <li>
              <b className="text-ink">Humans decide.</b> People confirm their own skills and choose their path; the organisation view offers pathways, never hiring, firing or performance decisions,
              and shows individuals only with consent.
            </li>
            <li>
              <b className="text-ink">Course links checked.</b> {ok} of {Object.keys(LINK_CHECK.results).length} catalogue links returned a valid page on {formatDate(LINK_CHECK.checkedOn)} (the rest block automated checks).
            </li>
          </ul>
        </Card>

        <h2 className="mt-12 text-[22px] font-medium">Known limitations — and what we do about them</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
          {LIMITS.map(([limit, mitigation]) => (
            <div key={limit} className="grid gap-2 border-b border-line px-5 py-4 last:border-b-0 md:grid-cols-2 md:gap-6">
              <p className="text-[14px] font-medium">{limit}</p>
              <p className="text-[14px] text-ink-2">{mitigation}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
