"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { taskTimeSplit } from "@/components/me/task-xray";
import { SourceLine } from "@/components/ui/bits";
import { OCCUPATIONS, SKILL_BY_ID } from "@/lib/catalog";
import {
  EMPLOYER_HOURS_PER_WEEK,
  historyOf,
  joinedYear,
  type Employee,
  type EmployeeInsight,
} from "@/lib/engine/org";
import { SCENARIOS, taskShift, type ScenarioId } from "@/lib/engine/scenarios";
import { cn, initials } from "@/lib/utils";

/* ------------------------------------------------------------------ Avatar */

/** Soft backgrounds so every person's picture looks a little different. */
const AVATAR_BG = [
  "#EAF1FF",
  "#FFE9DE",
  "#E3F7EE",
  "#FFF3C4",
  "#EEE9FF",
  "#FDE7F0",
  "#E0F4FF",
  "#F1F7DE",
];
const hash = (text: string) =>
  [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 997, 7);

/**
 * A person's picture: the man or woman illustration on their own colour, or
 * their initials when gender is not stated, or two dots when they have not
 * shared their profile.
 */
export function PersonAvatar({
  employee,
  size = 72,
  ring,
}: {
  employee: Employee;
  size?: number;
  ring?: string;
}) {
  const bg = AVATAR_BG[hash(employee.id) % AVATAR_BG.length]!;
  const style = {
    width: size,
    height: size,
    background: bg,
    boxShadow: ring ? `0 0 0 3px var(--paper), 0 0 0 5px ${ring}` : undefined,
  };
  if (!employee.consent) {
    return (
      <span
        className="grid shrink-0 place-items-center rounded-full font-mono text-ink-3"
        style={{ ...style, fontSize: size * 0.3 }}
      >
        ··
      </span>
    );
  }
  if (employee.gender === "U") {
    return (
      <span
        className="grid shrink-0 place-items-center rounded-full font-mono font-semibold text-ink"
        style={{ ...style, fontSize: size * 0.32 }}
      >
        {initials(employee.name)}
      </span>
    );
  }
  return (
    <span
      className="relative block shrink-0 overflow-hidden rounded-full"
      style={style}
    >
      <Image
        src={`/avatars/${employee.gender === "F" ? "woman" : "man"}.jpg`}
        alt=""
        fill
        sizes={`${size}px`}
        className="object-cover object-top mix-blend-multiply"
      />
    </span>
  );
}

/** Given name for messages: skips Muhammad / Mohd / Nur and a leading Chinese surname. */
export function shortFirst(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const lower = parts.map((part) => part.toLowerCase());
  if (
    parts.length >= 2 &&
    [
      "muhammad",
      "mohd",
      "mohamad",
      "mohammad",
      "nur",
      "nurul",
      "siti",
      "ahmad",
    ].includes(lower[0]!)
  )
    return parts[1]!;
  if (
    parts.length === 3 &&
    [
      "tan",
      "lee",
      "lim",
      "wong",
      "chen",
      "chong",
      "goh",
      "lau",
      "teoh",
      "yeoh",
      "chua",
      "ng",
      "koh",
      "low",
      "ong",
    ].includes(lower[0]!)
  )
    return `${parts[1]} ${parts[2]}`;
  return parts[0] ?? name;
}

/* --------------------------------------------------------------- Inspector */

/** Pathways offered during this visit, so reopening a person shows "Sent". */
const OFFERED = new Set<string>();

export function Inspector({
  insight,
  people,
  scenario,
  color,
  onClose,
}: {
  insight: EmployeeInsight;
  people: Employee[];
  scenario: ScenarioId;
  color?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  const { employee } = insight;
  const tone = color ?? "#2a78d6";
  const occupation = OCCUPATIONS[employee.soc]!;
  const split = taskTimeSplit(occupation, scenario);
  const manager = people.find((item) => item.id === employee.managerId);
  const first = employee.consent ? shortFirst(employee.name) : "this person";
  const [offer, setOffer] = useState<"idle" | "sending" | "sent">(
    OFFERED.has(employee.id) ? "sent" : "idle",
  );
  const [toast, setToast] = useState(false);
  const best = insight.bestMove;

  const send = () => {
    if (offer !== "idle") return;
    setOffer("sending");
    window.setTimeout(() => {
      OFFERED.add(employee.id);
      setOffer("sent");
      setToast(true);
      window.setTimeout(() => setToast(false), 3200);
    }, 900);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/25"
      onClick={onClose}
    >
      <aside
        className="h-full w-full max-w-[460px] overflow-y-auto bg-paper shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        aria-label="Employee profile"
      >
        {/* Header: picture, name, role */}
        <div
          className="relative px-6 pt-6 pb-5"
          style={{
            background: `linear-gradient(180deg, ${tone}1f, transparent)`,
          }}
        >
          <button
            onClick={onClose}
            className="nx-focus absolute top-4 right-4 grid size-9 place-items-center rounded-lg border border-line bg-card text-[18px]"
            aria-label="Close"
          >
            ×
          </button>
          <PersonAvatar employee={employee} size={84} ring={tone} />
          <p className="mt-4 text-[23px] leading-tight font-semibold">
            {employee.consent ? employee.name : "Profile not shared"}
          </p>
          <p className="mt-0.5 text-[14px] text-ink-2">{employee.title}</p>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11.5px]">
            <span
              className="rounded-full px-2.5 py-1 font-medium"
              style={{ background: `${tone}1f`, color: tone }}
            >
              {employee.dept}
            </span>
            <span className="rounded-full bg-card px-2.5 py-1 text-ink-2 ring-1 ring-line">
              Joined {joinedYear(employee)}
            </span>
            {manager ? (
              <span className="rounded-full bg-card px-2.5 py-1 text-ink-2 ring-1 ring-line">
                Reports to {manager.title}
              </span>
            ) : null}
          </div>
        </div>

        <div className="px-6 pb-8">
          <CareerTimeline insight={insight} scenario={scenario} />

          {/* How their work changes by 2030 */}
          <div className="mt-5 rounded-xl border border-line bg-card p-4">
            <p className="nx-micro text-[10.5px] text-ink-3">
              Their work by 2030 · {SCENARIOS[scenario].short.toLowerCase()}{" "}
              future
            </p>
            <p className="mt-1.5 font-mono text-[30px] leading-none font-semibold">
              <span className="bg-[linear-gradient(90deg,#2a78d6,#6250d6)] bg-clip-text text-transparent">
                {Math.round((split.assist + split.auto) * 100)}%
              </span>
              <span className="ml-2 font-sans text-[13px] font-normal text-ink-2">
                changes with AI
              </span>
            </p>
            <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full">
              <span
                style={{
                  width: `${split.human * 100}%`,
                  background: "#1baf7a",
                }}
              />
              <span
                style={{
                  width: `${split.assist * 100}%`,
                  background: "#2a78d6",
                }}
              />
              <span
                style={{ width: `${split.auto * 100}%`, background: "#6250d6" }}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: "Stays human", value: split.human, color: "#1baf7a" },
                { label: "With AI", value: split.assist, color: "#2a78d6" },
                { label: "AI takes over", value: split.auto, color: "#6250d6" },
              ].map((part) => (
                <div
                  key={part.label}
                  className="rounded-lg p-2"
                  style={{ background: `${part.color}12` }}
                >
                  <p
                    className="font-mono text-[17px] font-semibold"
                    style={{ color: part.color }}
                  >
                    {Math.round(part.value * 100)}%
                  </p>
                  <p className="text-[11px] text-ink-2">{part.label}</p>
                </div>
              ))}
            </div>
            <SourceLine className="mt-3">
              {occupation.title} · O*NET {occupation.soc} ·{" "}
              {occupation.coveredTaskCount}/{occupation.taskCount} tasks with
              observed AI use
            </SourceLine>
          </div>

          {occupation.declineNote ? (
            <p className="mt-3 rounded-lg border border-assist/40 bg-card p-3 text-[12.5px] leading-snug text-ink-2">
              <span className="nx-micro mr-1.5 text-assist">Beyond AI</span>
              {occupation.declineNote}
            </p>
          ) : null}

          {!employee.consent ? (
            <div className="mt-5 rounded-xl border border-line bg-card p-4 text-[13.5px] leading-relaxed text-ink-2">
              This person hasn&apos;t shared their profile with HR. Only the
              job-level outlook is shown.
            </div>
          ) : best === null ? (
            <div className="mt-5 rounded-xl border border-line bg-card p-4 text-[13.5px] leading-relaxed text-ink-2">
              <p className="font-medium text-ink">Leads the change</p>
              {first} sponsors the reskilling groups in their area. Nexa does
              not plan moves for leaders.
            </div>
          ) : (
            <>
              <p className="mt-6 text-[15px] font-medium">
                Growth options inside the bank
              </p>
              <ul className="mt-3 space-y-2.5">
                {insight.matches
                  .filter((match) => match.role.soc !== employee.soc)
                  .slice(0, 3)
                  .map((match, index) => (
                    <li
                      key={match.role.id}
                      className="rounded-xl border bg-card p-3"
                      style={{
                        borderColor: index === 0 ? `${tone}66` : "var(--line)",
                      }}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-[14.5px] font-medium">
                          {match.role.label}
                        </p>
                        <p
                          className="font-mono text-[18px] font-semibold"
                          style={{ color: index === 0 ? tone : undefined }}
                        >
                          {match.score}
                        </p>
                      </div>
                      <p className="text-[12px] text-ink-3">
                        {match.weeksToReady === 0
                          ? "Ready now"
                          : `~${match.weeksToReady} weeks at ${EMPLOYER_HOURS_PER_WEEK} paid hours a week`}
                        {match.robust ? " · good in all 3 futures" : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {match.gaps
                          .filter((gap) => gap.core || gap.weight >= 2)
                          .slice(0, 4)
                          .map((gap) => (
                            <span
                              key={gap.skillId}
                              className="rounded-full bg-paper-2 px-2 py-0.5 text-[11.5px] text-ink-2"
                            >
                              {SKILL_BY_ID.get(gap.skillId)?.label}
                            </span>
                          ))}
                      </div>
                    </li>
                  ))}
              </ul>

              <button
                onClick={send}
                disabled={offer !== "idle"}
                className={cn(
                  "nx-focus mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[14px] font-semibold transition-all",
                  offer === "sent"
                    ? "bg-[#e3f7ee] text-[#0e7a4b]"
                    : "text-white shadow-[0_10px_24px_-12px_#2a78d6] hover:brightness-110",
                )}
                style={
                  offer === "sent"
                    ? undefined
                    : { background: "linear-gradient(135deg,#2a78d6,#6250d6)" }
                }
              >
                {offer === "idle" ? (
                  <>
                    <span aria-hidden>➤</span> Offer this pathway to {first}
                  </>
                ) : offer === "sending" ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />{" "}
                    Sending to {first}…
                  </>
                ) : (
                  <>✓ Sent to {first}</>
                )}
              </button>
              <p className="mt-2 text-center text-[11.5px] text-ink-3">
                {first} decides whether to take it. Nexa makes no hiring or
                firing decisions.
              </p>
            </>
          )}
        </div>
      </aside>

      {toast ? (
        <div
          className="fixed right-6 bottom-6 z-[60] flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 shadow-[0_18px_40px_-16px_rgb(0_0_0/45%)]"
          role="status"
          onClick={(event) => event.stopPropagation()}
        >
          <span className="grid size-8 place-items-center rounded-full bg-[#e3f7ee] text-[15px] text-[#0e7a4b]">
            ✓
          </span>
          <span>
            <span className="block text-[13.5px] font-semibold">
              Pathway sent to {first}
            </span>
            <span className="block text-[12px] text-ink-3">
              {best
                ? `${best.role.label} · ${best.weeksToReady === 0 ? "ready now" : `~${best.weeksToReady} weeks`}`
                : ""}
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------- Career timeline */

const STEP_COLORS = [
  "#2a78d6",
  "#6250d6",
  "#e87ba4",
  "#eb6834",
  "#1baf7a",
  "#eda100",
];

/**
 * Their story here: every job they have held, oldest first, each with its own
 * colour and how much of that job works with AI by 2030 — then the suggested
 * next step.
 */
function CareerTimeline({
  insight,
  scenario,
}: {
  insight: EmployeeInsight;
  scenario: ScenarioId;
}) {
  const { employee } = insight;
  const steps = historyOf(employee);
  const shareOf = (soc: string) => {
    const occupation = OCCUPATIONS[soc];
    return occupation ? taskShift(occupation, SCENARIOS[scenario]).value : null;
  };
  const next = insight.bestMove;
  const nextColor = STEP_COLORS[steps.length % STEP_COLORS.length]!;
  return (
    <div className="mt-2 rounded-xl border border-line bg-card p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[14px] font-medium">Career here</p>
        <p className="font-mono text-[11.5px] text-ink-3">
          since {steps[0]!.year} ·{" "}
          {employee.entry === "fresh" ? "joined fresh" : "experienced hire"}
        </p>
      </div>
      <ol className="relative mt-3 space-y-3 pl-9">
        <span
          aria-hidden
          className="absolute top-3 bottom-3 left-[13px] w-0.5 rounded-full"
          style={{
            background: `linear-gradient(${STEP_COLORS.slice(0, steps.length + 1).join(",")})`,
          }}
        />
        {steps.map((step, index) => {
          const share = shareOf(step.soc);
          const color = STEP_COLORS[index % STEP_COLORS.length]!;
          const now = index === steps.length - 1;
          return (
            <li key={`${step.year}-${step.title}`} className="relative">
              <span
                className="absolute top-1 -left-9 grid size-7 place-items-center rounded-full font-mono text-[11px] font-bold text-white"
                style={{
                  background: color,
                  boxShadow: `0 4px 10px -4px ${color}`,
                }}
              >
                {index + 1}
              </span>
              <div
                className="rounded-lg px-3 py-2"
                style={{ background: `${color}12` }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p
                    className={cn(
                      "text-[14px]",
                      now ? "font-semibold" : "font-medium",
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="font-mono text-[11.5px]" style={{ color }}>
                    {step.year}
                    {now ? " · now" : ""}
                  </p>
                </div>
                {share !== null ? (
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${share * 100}%`, background: color }}
                      />
                    </span>
                    <span className="w-[82px] text-right font-mono text-[11px] text-ink-2">
                      {Math.round(share * 100)}% with AI
                    </span>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
        {next ? (
          <li className="relative">
            <span
              className="absolute top-1 -left-9 grid size-7 place-items-center rounded-full border-2 border-dashed bg-card text-[12px]"
              style={{ borderColor: nextColor, color: nextColor }}
            >
              ↗
            </span>
            <div
              className="rounded-lg border border-dashed p-3"
              style={{
                borderColor: `${nextColor}99`,
                background: `${nextColor}0d`,
              }}
            >
              <p className="nx-micro text-[10px]" style={{ color: nextColor }}>
                Suggested next
              </p>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[14.5px] font-semibold">{next.role.label}</p>
                <p className="font-mono text-[12px]">fit {next.score}</p>
              </div>
              <p className="text-[11.5px] text-ink-3">
                {next.weeksToReady === 0
                  ? "Ready now"
                  : `~${next.weeksToReady} weeks of learning`}{" "}
                · {Math.round((shareOf(next.role.soc) ?? 0) * 100)}% with AI by
                2030
              </p>
            </div>
          </li>
        ) : null}
      </ol>
    </div>
  );
}
