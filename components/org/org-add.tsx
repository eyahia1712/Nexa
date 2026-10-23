"use client";

import { useEffect, useState } from "react";

import { Micro } from "@/components/ui/bits";
import type { Employee, OrgData } from "@/lib/engine/org";
import { socForTitle, typicalSkills } from "@/lib/org-csv";
import { cn } from "@/lib/utils";

/**
 * Add to the organisation from the tree: one person (into any department,
 * reporting to anyone), or a whole new department with its head. The new
 * people are kept in this browser with the rest of the organisation.
 */

type Mode = "person" | "department";

const FIELD =
  "nx-focus mt-1.5 h-10 w-full rounded-lg border border-line bg-card px-3 text-[14px]";

export function AddToOrg({
  data,
  onAdd,
  onClose,
}: {
  data: OrgData;
  onAdd: (next: OrgData, added: Employee) => void;
  onClose: () => void;
}) {
  const thisYear = new Date().getFullYear();
  const root = data.employees.find((employee) => employee.managerId === null);
  const leaders = data.employees.filter((employee) =>
    data.employees.some((other) => other.managerId === employee.id),
  );
  const [mode, setMode] = useState<Mode>("person");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [dept, setDept] = useState(
    data.departments[1] ?? data.departments[0] ?? "",
  );
  const [newDept, setNewDept] = useState("");
  const [managerId, setManagerId] = useState<string>(
    leaders.find((leader) => leader.dept === (data.departments[1] ?? ""))?.id ??
      root?.id ??
      "",
  );
  const [gender, setGender] = useState<"M" | "F">("F");
  const [joined, setJoined] = useState(thisYear);
  const [entry, setEntry] = useState<"fresh" | "experienced">("fresh");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  const save = () => {
    const department = mode === "department" ? newDept.trim() : dept;
    const role =
      title.trim() || (mode === "department" ? `Head of ${department}` : "");
    if (mode === "department" && !department)
      return setError("Give the department a name.");
    if (
      mode === "department" &&
      data.departments.some(
        (item) => item.toLowerCase() === department.toLowerCase(),
      )
    )
      return setError("That department already exists.");
    if (!name.trim()) return setError("Add the person's name.");
    if (!role) return setError("Add their position.");
    const soc = socForTitle(role) ?? "43-6014.00";
    const person: Employee = {
      id: `n${Date.now().toString(36)}`,
      name: name.trim(),
      title: role,
      soc,
      dept: department,
      managerId:
        mode === "department"
          ? (root?.id ?? null)
          : managerId || (root?.id ?? null),
      gender,
      ageBand: "Unknown",
      years: Math.max(0, thisYear - joined) + (entry === "experienced" ? 3 : 0),
      consent: true,
      skills: typicalSkills(soc),
      joined,
      entry,
      history: [{ year: joined, title: role, soc }],
    };
    onAdd(
      {
        ...data,
        departments:
          mode === "department"
            ? [...data.departments, department]
            : data.departments,
        employees: [...data.employees, person],
      },
      person,
    );
  };

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-ink/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[540px] rounded-2xl border border-line bg-paper p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="Add to the organisation"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <Micro>Org tree</Micro>
            <p className="mt-1 text-[22px] font-semibold">Add to {data.name}</p>
          </div>
          <button
            onClick={onClose}
            className="nx-focus grid size-9 place-items-center rounded-lg border border-line bg-card text-[18px]"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mt-4 inline-flex rounded-full border border-line bg-paper-2 p-1">
          {(
            [
              ["person", "A person"],
              ["department", "A department"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                setMode(id);
                setError(null);
              }}
              className={cn(
                "nx-focus rounded-full px-4 py-1.5 text-[13px] transition-colors",
                mode === id
                  ? "bg-card font-semibold text-ink shadow-sm"
                  : "text-ink-3 hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {mode === "department" ? (
            <label className="block sm:col-span-2">
              <Micro>Department name</Micro>
              <input
                value={newDept}
                onChange={(event) => setNewDept(event.target.value)}
                placeholder="e.g. Digital Banking"
                className={FIELD}
                autoFocus
              />
            </label>
          ) : null}
          <label className="block">
            <Micro>{mode === "department" ? "Head's name" : "Name"}</Micro>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Nur Aina Hassan"
              className={FIELD}
              autoFocus={mode === "person"}
            />
          </label>
          <label className="block">
            <Micro>Position</Micro>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                mode === "department"
                  ? `Head of ${newDept || "…"}`
                  : "e.g. Data / BI Analyst"
              }
              className={FIELD}
            />
          </label>
          {mode === "person" ? (
            <>
              <label className="block">
                <Micro>Department</Micro>
                <select
                  value={dept}
                  onChange={(event) => {
                    setDept(event.target.value);
                    const head = leaders.find(
                      (leader) => leader.dept === event.target.value,
                    );
                    if (head) setManagerId(head.id);
                  }}
                  className={FIELD}
                >
                  {data.departments.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <Micro>Reports to</Micro>
                <select
                  value={managerId}
                  onChange={(event) => setManagerId(event.target.value)}
                  className={FIELD}
                >
                  {leaders.map((leader) => (
                    <option key={leader.id} value={leader.id}>
                      {leader.title} · {leader.name.split(" ")[0]}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
          <label className="block">
            <Micro>Joined</Micro>
            <input
              type="number"
              min={1980}
              max={thisYear}
              value={joined}
              onChange={(event) =>
                setJoined(Number(event.target.value) || thisYear)
              }
              className={cn(FIELD, "font-mono")}
            />
          </label>
          <div>
            <Micro>Joined as</Micro>
            <div className="mt-1.5 flex gap-1.5">
              {(
                [
                  ["fresh", "Fresh"],
                  ["experienced", "Experienced"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setEntry(id)}
                  className={cn(
                    "nx-focus h-10 flex-1 rounded-lg border text-[13px]",
                    entry === id
                      ? "border-[#2a78d6] bg-[#2a78d614] font-semibold"
                      : "border-line bg-card text-ink-2",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Micro>Picture</Micro>
            <div className="mt-1.5 flex gap-1.5">
              {(
                [
                  ["F", "Woman"],
                  ["M", "Man"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setGender(id)}
                  className={cn(
                    "nx-focus h-10 flex-1 rounded-lg border text-[13px]",
                    gender === id
                      ? "border-[#2a78d6] bg-[#2a78d614] font-semibold"
                      : "border-line bg-card text-ink-2",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? <p className="mt-3 text-[13px] text-auto">{error}</p> : null}

        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={save}
            className="nx-focus inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[14px] font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#2a78d6,#6250d6)" }}
          >
            + Add {mode === "department" ? "department" : "person"}
          </button>
          <button
            onClick={onClose}
            className="nx-focus h-11 rounded-xl border border-line bg-card px-4 text-[13.5px]"
          >
            Cancel
          </button>
        </div>
        <p className="mt-3 text-[11.5px] text-ink-3">
          Skills start from what this position typically needs. Saved in this
          browser.
        </p>
      </div>
    </div>
  );
}
