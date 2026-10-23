"use client";

import { useEffect, useRef, useState } from "react";

import { BTN_GHOST, BTN_SAFFRON, Micro } from "@/components/ui/bits";
import { DEMO_ORG, type OrgData } from "@/lib/engine/org";
import {
  CSV_COLUMNS,
  demoCsv,
  employeesFromCsv,
  type CsvResult,
} from "@/lib/org-csv";
import { cn } from "@/lib/utils";

/**
 * Load your own workforce from a CSV. The file is read in this browser and
 * kept here (nothing is sent to a server). Download the template to see the
 * columns; only id, name, title and department are required.
 */
export function LoadData({
  current,
  onLoad,
  onReset,
  onClose,
}: {
  current: OrgData;
  onLoad: (data: OrgData) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(current.demo ? "" : current.name);
  const [location, setLocation] = useState(
    current.demo ? "" : current.location,
  );
  const [result, setResult] = useState<(CsvResult & { file: string }) | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  const read = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      if (!/\.csv$/i.test(file.name) && file.type !== "text/csv")
        throw new Error(
          "Please choose a .csv file (Excel: File → Save As → CSV).",
        );
      const parsed = employeesFromCsv(await file.text());
      setResult({ ...parsed, file: file.name });
    } catch (caught) {
      setResult(null);
      setError((caught as Error).message);
    }
  };

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([demoCsv()], { type: "text/csv" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "nexa-workforce-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] rounded-2xl border border-line bg-paper p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="Load workforce data"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <Micro>Load data</Micro>
            <p className="mt-1 text-[22px] font-medium">
              Bring your own workforce
            </p>
          </div>
          <button
            onClick={onClose}
            className="nx-focus grid size-9 place-items-center rounded-lg border border-line text-[18px]"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <Micro>Organisation</Micro>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Maybank"
              className="nx-focus mt-1.5 h-10 w-full rounded-lg border border-line bg-card px-3 text-[14px]"
            />
          </label>
          <label className="block">
            <Micro>Location</Micro>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="e.g. Kuala Lumpur"
              className="nx-focus mt-1.5 h-10 w-full rounded-lg border border-line bg-card px-3 text-[14px]"
            />
          </label>
        </div>

        <button
          onClick={() => input.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void read(event.dataTransfer.files[0]);
          }}
          className={cn(
            "nx-focus mt-4 grid w-full place-items-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
            dragging
              ? "border-saffron bg-saffron-soft"
              : "border-line-strong bg-card hover:border-ink",
          )}
        >
          <span className="grid size-11 place-items-center rounded-full bg-saffron text-[20px] text-saffron-deep">
            ↑
          </span>
          <span className="mt-2 text-[15px] font-medium">
            {result ? result.file : "Drop a CSV here, or choose a file"}
          </span>
          <span className="mt-0.5 text-[12px] text-ink-3">
            Read in your browser · never uploaded
          </span>
        </button>
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => void read(event.target.files?.[0])}
        />

        {error ? (
          <p className="mt-3 rounded-lg border border-auto/40 bg-[#ce2c2c0d] p-3 text-[13px] text-auto">
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="mt-3 rounded-xl border border-line bg-card p-4">
            <div className="grid grid-cols-3 text-center">
              {[
                [result.employees.length, "people"],
                [result.departments.length, "departments"],
                [
                  new Set(result.employees.map((employee) => employee.title))
                    .size,
                  "job titles",
                ],
              ].map(([value, label]) => (
                <div key={String(label)}>
                  <p className="font-mono text-[24px] font-semibold">{value}</p>
                  <p className="text-[11.5px] text-ink-3">{label}</p>
                </div>
              ))}
            </div>
            {result.warnings.map((warning) => (
              <p key={warning} className="mt-2 text-[12px] text-assist">
                {warning}
              </p>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            className={BTN_SAFFRON}
            disabled={!result}
            onClick={() =>
              result &&
              onLoad({
                name: name.trim() || "My organisation",
                location: location.trim() || "",
                sector: "Loaded from CSV",
                note: `Loaded from ${result.file}`,
                demo: false,
                departments: result.departments,
                employees: result.employees,
              })
            }
          >
            Use this data
          </button>
          <button className={BTN_GHOST} onClick={download}>
            Download template
          </button>
          {current !== DEMO_ORG ? (
            <button
              className="nx-micro nx-focus ml-auto text-[11px] text-ink-3 underline underline-offset-4 hover:text-ink"
              onClick={onReset}
            >
              Back to demo data
            </button>
          ) : null}
        </div>

        <details className="mt-4 text-[12px] text-ink-2">
          <summary className="cursor-pointer text-ink-3">Columns</summary>
          <p className="mt-2 font-mono text-[11px] leading-relaxed">
            {CSV_COLUMNS.join(", ")}
          </p>
          <p className="mt-1.5 leading-relaxed">
            Required: id, name, title, department.{" "}
            <span className="font-mono">history</span> like{" "}
            <span className="font-mono">
              2021:Intern&gt;2023:Junior Developer
            </span>
            , <span className="font-mono">skills</span> like{" "}
            <span className="font-mono">python:3;sql:2</span>,{" "}
            <span className="font-mono">entry</span> fresh or experienced.
          </p>
        </details>
      </div>
    </div>
  );
}
