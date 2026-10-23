"use client";

import { useEffect, useState } from "react";

import { Micro } from "@/components/ui/bits";
import {
  exposureBand,
  historyOf,
  joinedYear,
  type EmployeeInsight,
  type OrgData,
  type OrgOverview,
} from "@/lib/engine/org";
import { cn } from "@/lib/utils";

import { SHIFT_COLOR } from "./org-colors";
import { PersonAvatar } from "./org-parts";

/**
 * The two windows behind the dashboard's first boxes: everyone in one table,
 * and every department as a card that opens onto its people.
 */

function Window({
  title,
  kicker,
  onClose,
  children,
}: {
  title: string;
  kicker: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-ink/30 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-4">
          <div>
            <Micro>{kicker}</Micro>
            <p className="mt-1 text-[22px] font-semibold">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="nx-focus grid size-9 place-items-center rounded-lg border border-line bg-card text-[18px]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function PeopleTable({
  rows,
  colors,
  onSelect,
  showMoves = false,
}: {
  rows: EmployeeInsight[];
  colors: Map<string, string>;
  onSelect: (id: string) => void;
  /** Show the career move (first job → job today) in the position column. */
  showMoves?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card">
      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1fr)_56px_70px] gap-3 border-b border-line bg-paper-2 px-4 py-2 text-[10.5px] tracking-[0.06em] text-ink-3 uppercase">
        <span>Name</span>
        <span>Position</span>
        <span>Department</span>
        <span>Joined</span>
        <span className="text-right">With AI</span>
      </div>
      <ul>
        {rows.map((insight) => {
          const { employee } = insight;
          const band = exposureBand(insight.shift.value);
          return (
            <li
              key={employee.id}
              className="border-b border-line last:border-b-0"
            >
              <button
                onClick={() => onSelect(employee.id)}
                className="nx-focus grid w-full grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1fr)_56px_70px] items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-paper-2"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <PersonAvatar employee={employee} size={32} />
                  <span className="truncate text-[13.5px] font-medium">
                    {employee.consent ? employee.name : "Profile not shared"}
                  </span>
                </span>
                <span className="truncate text-[13px] text-ink-2">
                  {showMoves && historyOf(employee).length > 1 ? (
                    <>
                      {historyOf(employee)[0]!.title} →{" "}
                      <span className="font-medium text-ink">
                        {employee.title}
                      </span>
                    </>
                  ) : (
                    employee.title
                  )}
                </span>
                <span className="flex min-w-0 items-center gap-1.5 text-[12.5px]">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: colors.get(employee.dept) }}
                  />
                  <span className="truncate">{employee.dept}</span>
                </span>
                <span className="font-mono text-[12px] text-ink-2">
                  {joinedYear(employee)}
                </span>
                <span
                  className="text-right font-mono text-[12.5px] font-semibold"
                  style={{ color: SHIFT_COLOR[band] }}
                >
                  {Math.round(insight.shift.value * 100)}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PeopleWindow({
  data,
  insights,
  colors,
  onSelect,
  onClose,
  only,
  kicker = "Total headcount",
  title,
  showMoves = false,
}: {
  data: OrgData;
  insights: EmployeeInsight[];
  colors: Map<string, string>;
  onSelect: (id: string) => void;
  onClose: () => void;
  /** Limit the list to these people (e.g. everyone who changed role). */
  only?: Set<string>;
  kicker?: string;
  title?: string;
  showMoves?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState<string | null>(null);
  const order = new Map(data.departments.map((name, index) => [name, index]));
  const rows = insights
    .filter((insight) => (only ? only.has(insight.employee.id) : true))
    .filter((insight) => (dept ? insight.employee.dept === dept : true))
    .filter((insight) => {
      const text =
        `${insight.employee.name} ${insight.employee.title}`.toLowerCase();
      return text.includes(query.trim().toLowerCase());
    })
    .sort(
      (a, b) =>
        (order.get(a.employee.dept) ?? 0) - (order.get(b.employee.dept) ?? 0),
    );
  return (
    <Window
      kicker={kicker}
      title={title ?? `${data.employees.length} people`}
      onClose={onClose}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or position"
          className="nx-focus h-9 w-full max-w-[260px] rounded-full border border-line bg-card px-4 text-[13px]"
        />
        <button
          onClick={() => setDept(null)}
          className={cn(
            "nx-focus rounded-full border px-3 py-1.5 text-[12px]",
            dept === null
              ? "border-ink bg-card font-semibold"
              : "border-line bg-card text-ink-2",
          )}
        >
          All
        </button>
        {data.departments.map((name) => (
          <button
            key={name}
            onClick={() => setDept(dept === name ? null : name)}
            className="nx-focus flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px]"
            style={{
              borderColor: dept === name ? colors.get(name) : "var(--line)",
              background:
                dept === name ? `${colors.get(name)}1a` : "var(--card)",
            }}
          >
            <span
              className="size-2 rounded-full"
              style={{ background: colors.get(name) }}
            />
            {name}
          </button>
        ))}
      </div>
      <p className="mt-3 mb-2 text-[12px] text-ink-3">
        {rows.length} shown · tap anyone to open their story
      </p>
      <PeopleTable
        rows={rows}
        colors={colors}
        onSelect={onSelect}
        showMoves={showMoves}
      />
    </Window>
  );
}

export function DepartmentsWindow({
  insights,
  overview,
  colors,
  onSelect,
  onClose,
}: {
  insights: EmployeeInsight[];
  overview: OrgOverview;
  colors: Map<string, string>;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const opened = overview.departments.find((dept) => dept.name === open);
  return (
    <Window
      kicker={opened ? "Department" : "Departments"}
      title={
        opened ? opened.name : `${overview.departments.length} departments`
      }
      onClose={onClose}
    >
      {opened ? (
        <>
          <button
            onClick={() => setOpen(null)}
            className="nx-focus mb-4 text-[13px] text-[#2a78d6] hover:underline"
          >
            ← All departments
          </button>
          <div className="mb-4 grid grid-cols-3 gap-3">
            {[
              [String(opened.headcount), "people"],
              [String(opened.roles), "roles"],
              [`${Math.round(opened.avgShift * 100)}%`, "work with AI by 2030"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-xl border border-line bg-card p-3"
              >
                <p
                  className="font-mono text-[24px] font-semibold"
                  style={{ color: colors.get(opened.name) }}
                >
                  {value}
                </p>
                <p className="text-[12px] text-ink-3">{label}</p>
              </div>
            ))}
          </div>
          <PeopleTable
            rows={insights.filter(
              (insight) => insight.employee.dept === opened.name,
            )}
            colors={colors}
            onSelect={onSelect}
          />
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {overview.departments.map((dept) => (
            <DeptBox
              key={dept.name}
              dept={dept}
              color={colors.get(dept.name)!}
              people={insights.filter(
                (insight) => insight.employee.dept === dept.name,
              )}
              onOpen={() => setOpen(dept.name)}
            />
          ))}
        </div>
      )}
    </Window>
  );
}

/**
 * One department, built exactly like the landing page's problem boxes: a big
 * number, one line of words, a small picture (a dot per person and a bar of
 * how much of the work changes with AI), and small print at the bottom.
 */
function DeptBox({
  dept,
  color,
  people,
  onOpen,
}: {
  dept: OrgOverview["departments"][number];
  color: string;
  people: EmployeeInsight[];
  onOpen: () => void;
}) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setSeen(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const share = dept.avgShift;
  return (
    <button
      onClick={onOpen}
      className="nx-focus group flex flex-col rounded-2xl border border-line-strong/60 bg-card p-6 text-left text-ink shadow-[0_14px_34px_-24px_rgb(0_0_0/45%)] transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="w-full flex-1">
        <p className="nx-micro text-[11px] text-ink-3">{dept.name}</p>
        <p
          className="mt-2 font-mono text-[40px] leading-none font-semibold"
          style={{ color }}
        >
          {dept.headcount}
        </p>
        <p className="mt-3 text-[14px] leading-snug text-ink-2">
          people in {dept.roles} {dept.roles === 1 ? "role" : "roles"}
        </p>
        <div className="mt-5 grid grid-cols-10 gap-1" aria-hidden>
          {people.map((insight, index) => (
            <span
              key={insight.employee.id}
              className="aspect-square rounded-full transition-all duration-500"
              style={{
                background: seen
                  ? SHIFT_COLOR[exposureBand(insight.shift.value)]
                  : "var(--stone)",
                transform: seen ? "scale(1)" : "scale(0.4)",
                transitionDelay: `${index * 40}ms`,
              }}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-ink-3">
          each dot = one person, coloured by AI shift
        </p>
        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--human)_18%,white)]">
          <span
            className="h-full rounded-full transition-[width] duration-1000 ease-out"
            style={{
              width: seen ? `${share * 100}%` : "0%",
              background: "linear-gradient(90deg,#FCC30B,#FD6925,#E5243B)",
            }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-auto" />{" "}
            {Math.round(share * 100)}% with AI
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-human" /> human-led
          </span>
        </div>
      </div>
      <p className="mt-5 flex w-full items-center justify-between text-[11px] text-ink-3">
        <span>Work with AI by 2030</span>
        <span className="font-medium text-[#2a78d6] transition-transform group-hover:translate-x-0.5">
          See who →
        </span>
      </p>
    </button>
  );
}
