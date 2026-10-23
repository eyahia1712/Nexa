"use client";

import { useEffect, useMemo, useState } from "react";

import { EvidenceChip, ScenarioSwitch } from "@/components/app/controls";
import { TopBar } from "@/components/app/top-bar";
import { useSignals } from "@/components/app/use-signals";
import {
  DEMO_ORG,
  analyseEmployees,
  cohorts,
  fairness,
  orgOverview,
  sdgContribution,
  type OrgData,
} from "@/lib/engine/org";
import { clearOrg, loadOrg, saveOrg } from "@/lib/org-csv";
import { cn } from "@/lib/utils";

import { LoadData } from "./load-data";
import { AddToOrg } from "./org-add";
import { DepartmentsWindow, PeopleWindow } from "./org-modals";
import { DEPT_COLORS } from "./org-colors";
import { OrgOverviewView } from "./org-overview";
import { Inspector } from "./org-parts";
import {
  FairnessCards,
  MobilityCards,
  OrgTreeView,
  SdgCards,
  SkillsPies,
} from "./org-views";

const TABS = [
  { id: "dashboard", label: "Dashboard", n: "01" },
  { id: "tree", label: "Org tree", n: "02" },
  { id: "skills", label: "Skills", n: "03" },
  { id: "mobility", label: "Mobility", n: "04" },
  { id: "fairness", label: "Fairness", n: "05" },
  { id: "sdg", label: "SDG report", n: "06" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function OrgDashboard() {
  const signals = useSignals();
  const [data, setData] = useState<OrgData>(DEMO_ORG);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [windowOpen, setWindowOpen] = useState<
    "people" | "depts" | "moved" | "fresh" | null
  >(null);

  useEffect(() => {
    const saved = loadOrg();
    if (saved) setData(saved);
    const wanted = new URLSearchParams(window.location.search).get("tab");
    if (TABS.some((item) => item.id === wanted)) setTab(wanted as Tab);
  }, []);

  const insights = useMemo(
    () => analyseEmployees(data.employees, signals.momentum, signals.scenario),
    [data.employees, signals.momentum, signals.scenario],
  );
  const overview = useMemo(() => orgOverview(data, insights), [data, insights]);
  const teams = useMemo(() => cohorts(insights), [insights]);
  const audit = useMemo(() => fairness(insights), [insights]);
  const sdg = useMemo(() => sdgContribution(insights), [insights]);
  const deptColor = useMemo(
    () =>
      new Map(
        data.departments.map((dept, index) => [
          dept,
          DEPT_COLORS[index % DEPT_COLORS.length]!,
        ]),
      ),
    [data.departments],
  );

  const readiness = {
    avgShift:
      insights.reduce((sum, insight) => sum + insight.shift.value, 0) /
      Math.max(1, insights.length),
    high: insights.filter((insight) => insight.shift.value >= 0.4).length,
    movable: insights.filter(
      (insight) =>
        insight.bestMove &&
        insight.bestMove.score >= 45 &&
        insight.bestMove.weeksToReady <= 26,
    ).length,
    flagged: audit.some((report) => report.flagged),
  };
  const inspected =
    insights.find((insight) => insight.employee.id === selected) ?? null;

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <TopBar>
        <ScenarioSwitch
          value={signals.scenario}
          onChange={signals.setScenario}
        />
        <EvidenceChip signals={signals} />
      </TopBar>

      <main className="mx-auto w-full max-w-[1240px] px-5 pt-7 pb-20 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="leading-none tracking-[-0.03em]">
            <span className="text-[clamp(2.4rem,5vw,3.6rem)] font-extrabold">
              {data.name}
            </span>
            {data.location ? (
              <span className="ml-1 text-[clamp(1.1rem,2vw,1.5rem)] font-medium text-ink-3">
                , {data.location}
              </span>
            ) : null}
          </h1>
          <button
            onClick={() => setLoading(true)}
            className="nx-focus inline-flex min-h-10 items-center gap-2 rounded-full border border-line-strong bg-card px-4 text-[13.5px] font-medium hover:border-ink"
          >
            <span className="grid size-5 place-items-center rounded-full bg-saffron text-[12px] text-saffron-deep">
              ↑
            </span>
            Load data
          </button>
        </div>

        <div className="mt-6 grid items-start gap-7 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-9">
          <aside className="space-y-4 lg:sticky lg:top-20">
            <CompanyCard
              data={data}
              overview={overview}
              deptColor={deptColor}
            />
          </aside>

          <section className="min-w-0">
            <nav
              className="nx-no-print -mx-1 flex gap-1 overflow-x-auto pb-1"
              aria-label="Organisation views"
            >
              {TABS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  aria-current={tab === item.id ? "page" : undefined}
                  className={cn(
                    "nx-focus inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[13.5px] transition-colors",
                    tab === item.id
                      ? "border-saffron bg-saffron-soft text-ink shadow-[inset_0_-2px_0_var(--saffron)]"
                      : "border-line bg-card text-ink-2 hover:border-line-strong hover:text-ink",
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-[11px]",
                      tab === item.id ? "text-saffron-deep" : "text-ink-3",
                    )}
                  >
                    {item.n}
                  </span>
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="mt-6" key={`${tab}-${signals.scenario}`}>
              {tab === "dashboard" ? (
                <OrgOverviewView
                  data={data}
                  overview={overview}
                  readiness={readiness}
                  onPeople={() => setWindowOpen("people")}
                  onDepts={() => setWindowOpen("depts")}
                  onMoved={() => setWindowOpen("moved")}
                  onFresh={() => setWindowOpen("fresh")}
                />
              ) : null}
              {tab === "tree" ? (
                <OrgTreeView
                  data={data}
                  insights={insights}
                  onSelect={setSelected}
                  onAdd={() => setAdding(true)}
                />
              ) : null}
              {tab === "skills" ? <SkillsPies data={data} /> : null}
              {tab === "mobility" ? (
                <MobilityCards
                  teams={teams}
                  insights={insights}
                  departments={data.departments}
                  onSelect={setSelected}
                />
              ) : null}
              {tab === "fairness" ? <FairnessCards reports={audit} /> : null}
              {tab === "sdg" ? (
                <SdgCards
                  rows={sdg}
                  learners={teams.reduce(
                    (sum, team) => sum + team.members.length,
                    0,
                  )}
                />
              ) : null}
            </div>
          </section>
        </div>
      </main>

      {windowOpen === "people" ? (
        <PeopleWindow
          data={data}
          insights={insights}
          colors={deptColor}
          onSelect={setSelected}
          onClose={() => setWindowOpen(null)}
        />
      ) : null}
      {windowOpen === "moved" ? (
        <PeopleWindow
          data={data}
          insights={insights}
          colors={deptColor}
          onSelect={setSelected}
          onClose={() => setWindowOpen(null)}
          only={new Set(overview.relabelled.map((employee) => employee.id))}
          kicker="Re-labelled · grew into a new role here"
          title={`${overview.relabelled.length} people`}
          showMoves
        />
      ) : null}
      {windowOpen === "fresh" ? (
        <PeopleWindow
          data={data}
          insights={insights}
          colors={deptColor}
          onSelect={setSelected}
          onClose={() => setWindowOpen(null)}
          only={new Set(overview.fresh.map((employee) => employee.id))}
          kicker="Genuinely new · joined fresh from study"
          title={`${overview.fresh.length} people`}
        />
      ) : null}
      {windowOpen === "depts" ? (
        <DepartmentsWindow
          insights={insights}
          overview={overview}
          colors={deptColor}
          onSelect={setSelected}
          onClose={() => setWindowOpen(null)}
        />
      ) : null}
      {inspected ? (
        <Inspector
          key={inspected.employee.id}
          insight={inspected}
          people={data.employees}
          scenario={signals.scenario}
          color={deptColor.get(inspected.employee.dept)}
          onClose={() => setSelected(null)}
        />
      ) : null}
      {adding ? (
        <AddToOrg
          data={data}
          onClose={() => setAdding(false)}
          onAdd={(next, added) => {
            saveOrg(next);
            setData(next);
            setAdding(false);
            setSelected(added.id);
          }}
        />
      ) : null}
      {loading ? (
        <LoadData
          current={data}
          onClose={() => setLoading(false)}
          onLoad={(next) => {
            saveOrg(next);
            setData(next);
            setLoading(false);
            setTab("dashboard");
          }}
          onReset={() => {
            clearOrg();
            setData(DEMO_ORG);
            setLoading(false);
          }}
        />
      ) : null}
    </div>
  );
}

function CompanyCard({
  data,
  overview,
  deptColor,
}: {
  data: OrgData;
  overview: ReturnType<typeof orgOverview>;
  deptColor: Map<string, string>;
}) {
  const since = Math.min(
    ...data.employees.map((employee) => employee.joined ?? 2026),
  );
  const max = Math.max(
    1,
    ...overview.departments.map((dept) => dept.headcount),
  );
  return (
    <div className="nx-rise overflow-hidden border border-line-strong/60 bg-card shadow-[0_16px_36px_-24px_rgb(0_0_0/45%)]">
      <div className="relative h-[150px] overflow-hidden bg-[linear-gradient(135deg,#FFC300,#FFB000_55%,#F59E0B)] p-4 text-saffron-deep">
        <svg
          aria-hidden
          viewBox="0 0 200 120"
          className="absolute -right-8 -bottom-6 w-[170px] opacity-15"
        >
          {[20, 50, 80, 110, 140].map((x, index) => (
            <rect
              key={x}
              x={x}
              y={120 - (40 + index * 14)}
              width={22}
              height={40 + index * 14}
              rx={2}
              fill="currentColor"
            />
          ))}
        </svg>
        <div className="relative flex h-full flex-col">
          <div className="flex items-start justify-between">
            <p className="font-mono text-[10px] leading-snug tracking-[0.14em] uppercase">
              Nexa
              <br />
              {"// "}
              {data.sector}
            </p>
            <div className="text-right">
              <p className="font-mono text-[26px] leading-none font-semibold">
                {overview.headcount}
              </p>
              <p className="mt-1 font-mono text-[9.5px] tracking-[0.14em] uppercase">
                People
              </p>
            </div>
          </div>
          <p className="mt-auto text-[26px] leading-none font-extrabold tracking-[-0.02em]">
            {data.name}
            {data.location ? (
              <span className="ml-1 text-[14px] font-medium opacity-75">
                , {data.location}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 border-b border-line text-center">
        {[
          [String(overview.departments.length), "Depts"],
          [String(overview.roles), "Roles"],
          [Number.isFinite(since) ? String(since) : "–", "Since"],
        ].map(([value, label], index) => (
          <div
            key={label}
            className={cn("px-2 py-3", index > 0 && "border-l border-line")}
          >
            <p className="font-mono text-[16px]">{value}</p>
            <p className="nx-micro text-[10px] text-ink-3">{label}</p>
          </div>
        ))}
      </div>

      <div className="p-4">
        <p className="nx-micro text-[10.5px] text-ink-3">Departments</p>
        <ul className="mt-2 space-y-1">
          {overview.departments.map((dept) => (
            <li key={dept.name} className="flex items-center gap-2 px-1.5 py-1">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: deptColor.get(dept.name) }}
              />
              <span className="min-w-0 flex-1 truncate text-[13px]">
                {dept.name}
              </span>
              <span className="h-1.5 w-14 overflow-hidden rounded-full bg-stone">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${(dept.headcount / max) * 100}%`,
                    background: deptColor.get(dept.name),
                  }}
                />
              </span>
              <span className="w-5 text-right font-mono text-[12px]">
                {dept.headcount}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-ink-3">
          {data.demo ? "Demo data · invented people" : data.note}
        </p>
      </div>
    </div>
  );
}
