import { OCCUPATIONS, ROLES, SKILL_BY_ID } from "@/lib/catalog";
import { DEMO_ORG, type Employee, type OrgData } from "@/lib/engine/org";
import type { SkillLevel } from "@/lib/profile";

/**
 * Load a workforce from a CSV file (one row per person) and keep it in this
 * browser. Nothing is uploaded to a server.
 *
 * Columns (only id, name, title and department are required):
 *   id, name, title, department, manager_id, joined, entry, gender, age_band,
 *   consent, skills, history, soc
 *   - skills:  python:3;sql:2         (Nexa skill ids, level 1–3)
 *   - history: 2021:Intern>2023:Junior Developer>2025:Senior Developer
 *   - entry:   fresh | experienced
 */

export const CSV_COLUMNS = [
  "id",
  "name",
  "title",
  "department",
  "manager_id",
  "joined",
  "entry",
  "gender",
  "age_band",
  "consent",
  "skills",
  "history",
  "soc",
] as const;

const STORAGE_KEY = "nexa.org.v1";

/** Job titles to O*NET codes. Specific patterns come before general ones. */
const TITLE_TO_SOC: [RegExp, string][] = [
  [
    /chief executive|\bceo\b|managing director|branch head|country head|general manager/,
    "11-1011.00",
  ],
  [/chief operating|\bcoo\b|operations manager|branch manager/, "11-1021.00"],
  [
    /finance manager|\bcfo\b|chief financial|financial controller|head of finance/,
    "11-3031.00",
  ],
  [
    /it manager|\bcto\b|chief technology|head of (it|technology)|engineering manager/,
    "11-3021.00",
  ],
  [/hr manager|head of (people|hr)|chief people|hr director/, "11-3121.00"],
  [/marketing manager|head of marketing|\bcmo\b/, "11-2021.00"],
  [/supervisor|team lead/, "43-1011.00"],
  [/customer service|call cent|contact cent|customer support/, "43-4051.00"],
  [/teller/, "43-3071.00"],
  [/data entry/, "43-9021.00"],
  [/receptionist|front desk/, "43-4171.00"],
  [/accounts? clerk|bookkeep|accounts? assistant/, "43-3031.00"],
  [/accountant|auditor/, "13-2011.00"],
  [/financial analyst|fintech|investment analyst|credit analyst/, "13-2051.00"],
  [/data scientist/, "15-2051.00"],
  [/data analyst|bi analyst|business intelligence|data \/ bi/, "15-2051.01"],
  [/machine learning|ai engineer|\bml\b/, "15-1221.00"],
  [/security|cyber/, "15-1212.00"],
  [/devops|cloud/, "15-1299.08"],
  [/network|system admin|sysadmin/, "15-1244.00"],
  [/it support|help ?desk|technician|desktop support/, "15-1232.00"],
  [/developer|software engineer|programmer/, "15-1252.00"],
  [/\bux\b|\bui\b|product designer/, "15-1255.00"],
  [/graphic|designer/, "27-1024.00"],
  [/training|learning (and|&) development|\bl&d\b/, "13-1151.00"],
  [/\bhr\b|human resource|recruit|talent/, "13-1071.00"],
  [/marketing|social media|brand/, "13-1161.00"],
  [/project manager|programme manager|scrum/, "13-1082.00"],
  [/sales|relationship manager/, "41-4012.00"],
  [/cashier/, "41-2011.00"],
  [/sustainab|\besg\b/, "13-1199.05"],
  [/admin|assistant|clerk|officer/, "43-6014.00"],
];

export function socForTitle(title: string): string | null {
  const lower = title.toLowerCase();
  for (const [pattern, soc] of TITLE_TO_SOC)
    if (pattern.test(lower)) return soc;
  return null;
}

/** Typical skills for a job, used when a row lists none. */
export function typicalSkills(soc: string): Record<string, SkillLevel> {
  const sample = DEMO_ORG.employees.find(
    (employee) =>
      employee.soc === soc && employee.history && employee.history.length === 1,
  );
  if (sample) return sample.skills;
  const role = ROLES.find((item) => item.soc === soc);
  return role
    ? Object.fromEntries(
        role.skills.slice(0, 6).map((skill) => [skill.id, 2 as SkillLevel]),
      )
    : {};
}

/** RFC 4180-ish CSV: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

const cell = (value: string) =>
  /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

/** The demo workforce as a CSV, to download as a template. */
export function demoCsv(): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const employee of DEMO_ORG.employees) {
    lines.push(
      [
        employee.id,
        employee.name,
        employee.title,
        employee.dept,
        employee.managerId ?? "",
        String(employee.joined ?? ""),
        employee.entry ?? "",
        employee.gender,
        employee.ageBand,
        employee.consent ? "yes" : "no",
        Object.entries(employee.skills)
          .map(([id, level]) => `${id}:${level}`)
          .join(";"),
        (employee.history ?? [])
          .map((step) => `${step.year}:${step.title}`)
          .join(">"),
        employee.soc,
      ]
        .map(cell)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export interface CsvResult {
  employees: Employee[];
  departments: string[];
  warnings: string[];
}

export function employeesFromCsv(
  text: string,
  thisYear = new Date().getFullYear(),
): CsvResult {
  const rows = parseCsv(text.replace(/^﻿/, ""));
  if (rows.length < 2)
    throw new Error("The file needs a header row and at least one person.");
  const header = rows[0]!.map((name) =>
    name.trim().toLowerCase().replace(/\s+/g, "_"),
  );
  const col = (name: string) => header.indexOf(name);
  for (const required of ["id", "name", "title", "department"]) {
    if (col(required) === -1)
      throw new Error(
        `Missing column “${required}”. Required: id, name, title, department.`,
      );
  }
  const warnings: string[] = [];
  const unmatched = new Set<string>();
  const get = (row: string[], name: string) =>
    col(name) === -1 ? "" : (row[col(name)] ?? "").trim();

  const employees: Employee[] = rows.slice(1).map((row, index) => {
    const title = get(row, "title");
    const givenSoc = get(row, "soc");
    let soc = givenSoc && OCCUPATIONS[givenSoc] ? givenSoc : socForTitle(title);
    if (!soc) {
      unmatched.add(title);
      soc = "43-6014.00";
    }
    const history = get(row, "history")
      .split(">")
      .map((step) => step.trim())
      .filter(Boolean)
      .map((step) => {
        const match = /^(\d{4})\s*:\s*(.+)$/.exec(step);
        const stepTitle = match ? match[2]!.trim() : step;
        return {
          year: match ? Number(match[1]) : thisYear,
          title: stepTitle,
          soc: socForTitle(stepTitle) ?? soc!,
        };
      });
    const joined = Number(get(row, "joined")) || history[0]?.year || thisYear;
    if (history.length === 0 || history[history.length - 1]!.title !== title)
      history.push({
        year: history.length
          ? Math.max(joined, history[history.length - 1]!.year)
          : joined,
        title,
        soc,
      });

    const skills: Record<string, SkillLevel> = {};
    for (const part of get(row, "skills").split(/[;|]/)) {
      const [id, level] = part.split(":").map((value) => value.trim());
      if (id && SKILL_BY_ID.has(id))
        skills[id] = Math.min(3, Math.max(1, Number(level) || 2)) as SkillLevel;
    }
    const gender = get(row, "gender").toUpperCase().charAt(0);
    const age = get(row, "age_band");
    return {
      id: get(row, "id") || `row${index + 1}`,
      name: get(row, "name") || `Employee ${index + 1}`,
      title,
      soc,
      dept: get(row, "department") || "Unassigned",
      managerId: get(row, "manager_id") || null,
      gender:
        gender === "F" || gender === "W" ? "F" : gender === "M" ? "M" : "U",
      ageBand: (["20-29", "30-39", "40-49", "50+"].includes(age)
        ? age
        : "Unknown") as Employee["ageBand"],
      years: Math.max(0, thisYear - joined),
      consent: !/^(no|n|false|0)$/i.test(get(row, "consent")),
      skills: Object.keys(skills).length > 0 ? skills : typicalSkills(soc),
      joined,
      entry: /fresh|grad|intern/i.test(get(row, "entry"))
        ? "fresh"
        : "experienced",
      history,
    };
  });

  // Managers that point at nobody become top-level; there must be exactly one root for the tree.
  const ids = new Set(employees.map((employee) => employee.id));
  for (const employee of employees)
    if (employee.managerId && !ids.has(employee.managerId))
      employee.managerId = null;
  const roots = employees.filter((employee) => employee.managerId === null);
  if (roots.length > 1) {
    const top =
      roots.find((employee) => employee.soc === "11-1011.00") ?? roots[0]!;
    for (const employee of roots)
      if (employee !== top) employee.managerId = top.id;
    warnings.push(
      `${roots.length - 1} people had no manager; they now report to ${top.name} so the tree has one top.`,
    );
  }
  if (unmatched.size > 0)
    warnings.push(
      `Job titles Nexa could not match (treated as admin work): ${[...unmatched].slice(0, 5).join(", ")}${unmatched.size > 5 ? "…" : ""}`,
    );
  const departments = [...new Set(employees.map((employee) => employee.dept))];
  return { employees, departments, warnings };
}

export function saveOrg(data: OrgData) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage can be full or blocked; the loaded data then lasts for this visit.
  }
}

export function loadOrg(): OrgData | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OrgData) : null;
  } catch {
    return null;
  }
}

export function clearOrg() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
