"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { TopBar } from "@/components/app/top-bar";
import { BTN_GHOST, BTN_INK, BTN_SAFFRON, Card, Chip, Micro, SdgTile } from "@/components/ui/bits";
import { CURRENT_OCCUPATIONS, OCCUPATIONS, SDG_GOALS, SKILLS, SKILL_BY_ID, type SkillCategory } from "@/lib/catalog";
import { PERSONAS, SAMPLE_CV, loadProfile, profileFromPersona, saveProfile, type Profile, type SkillLevel } from "@/lib/profile";
import { cn } from "@/lib/utils";

/**
 * "Tell us about yourself": three ways in (a sample person, a CV, or a short
 * form), then one review screen where the person confirms every skill before
 * anything is calculated. AI suggests; the person decides — from step one.
 */

type Mode = "sample" | "cv" | "form";

interface Draft {
  name: string;
  currentSoc: string;
  years: number;
  hoursPerWeek: number;
  sdgPriorities: number[];
  skills: Record<string, SkillLevel>;
  evidence: Record<string, string[]>;
  source: Profile["source"];
  personaId?: string;
  story?: string;
  headline?: string;
  avatar?: "man" | "woman";
}

const EMPTY: Draft = { name: "", currentSoc: "43-4051.00", years: 3, hoursPerWeek: 6, sdgPriorities: [8, 4], skills: {}, evidence: {}, source: "form" };

export function Intake() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sample");
  const [draft, setDraft] = useState<Draft | null>(null);

  // "Edit" on the dashboard opens straight into this person's profile.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("edit");
    if (!wanted) return;
    const saved = loadProfile();
    if (saved && (wanted === "me" || saved.personaId === wanted)) {
      setDraft({ ...saved, evidence: {} });
    } else if (PERSONAS.some((persona) => persona.id === wanted)) {
      setDraft(personaDraft(wanted));
    }
  }, []);

  const finish = (value: Draft) => {
    const profile: Profile = {
      id: value.personaId ? `persona-${value.personaId}` : `me-${Date.now()}`,
      name: value.name.trim() || "You",
      headline: value.headline,
      story: value.story,
      currentSoc: value.currentSoc,
      years: value.years,
      hoursPerWeek: value.hoursPerWeek,
      sdgPriorities: value.sdgPriorities,
      skills: value.skills,
      source: value.source,
      personaId: value.personaId,
      avatar: value.personaId ? undefined : value.avatar,
    };
    saveProfile(profile);
    router.push("/me");
  };

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <TopBar />
      <main className="mx-auto w-full max-w-[1100px] px-5 pt-10 pb-20 md:px-8">
        <Micro>Step 1 of 2 · Tell us about yourself</Micro>
        <h1 className="mt-3 text-[clamp(1.9rem,4vw,3rem)] leading-[1.05] font-medium tracking-[-0.025em]">
          {draft === null ? "Who are you today?" : "Check your profile — you are in charge of it."}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          {draft === null
            ? "Pick a sample person, upload a CV, or answer a few questions. Nothing you upload is stored — it is read once, in memory, and turned into skills you confirm."
            : "Nexa suggested these skills. Remove anything wrong, add what's missing, set your level. Only what you confirm is used."}
        </p>

        {draft === null ? (
          <>
            <div className="mt-8 inline-flex rounded-xl border border-line bg-card p-1" role="tablist">
              {(
                [
                  ["sample", "Sample person"],
                  ["cv", "Upload a CV"],
                  ["form", "Answer questions"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={mode === id}
                  onClick={() => setMode(id)}
                  className={cn("nx-focus min-h-10 rounded-lg px-4 text-[14px] transition-colors", mode === id ? "bg-ink text-paper" : "text-ink-2 hover:text-ink")}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-6">
              {mode === "sample" ? <SamplePicker onPick={finish} onEdit={setDraft} /> : null}
              {mode === "cv" ? <CvUpload onDone={setDraft} /> : null}
              {mode === "form" ? <QuickForm onDone={setDraft} /> : null}
            </div>
            <p className="mt-10 text-[13px] text-ink-3">
              Planning for a team instead?{" "}
              <Link href="/org" className="text-ink underline underline-offset-4">
                Open the organisation view
              </Link>
              .
            </p>
          </>
        ) : (
          <Review draft={draft} onChange={setDraft} onBack={() => setDraft(null)} onDone={finish} />
        )}
      </main>
    </div>
  );
}

function personaDraft(personaId: string): Draft {
  const persona = PERSONAS.find((item) => item.id === personaId)!;
  const profile = profileFromPersona(persona);
  return { ...profile, evidence: {}, source: "sample", personaId: persona.id };
}

function SamplePicker({ onPick, onEdit }: { onPick: (draft: Draft) => void; onEdit: (draft: Draft) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PERSONAS.map((persona, index) => {
        const occupation = OCCUPATIONS[persona.currentSoc];
        return (
          <Card key={persona.id} className="nx-rise flex flex-col p-5" style={{ ["--i" as string]: index }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[19px] font-medium">
                  {persona.name}, {persona.age}
                </p>
                <p className="mt-0.5 text-[14px] text-ink-2">{persona.headline}</p>
              </div>
              <Chip>Synthetic</Chip>
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{persona.story}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3">
              <span>{occupation?.label}</span>·<span>{Object.keys(persona.skills).length} skills</span>·<span>{persona.hoursPerWeek} h/week to learn</span>
              <span className="ml-1 flex gap-1">
                {persona.sdgPriorities.map((n) => (
                  <SdgTile key={n} n={n} size={20} />
                ))}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className={BTN_SAFFRON} onClick={() => onPick(personaDraft(persona.id))}>
                See {persona.name}&apos;s future
              </button>
              <button className={BTN_GHOST} onClick={() => onEdit(personaDraft(persona.id))}>
                Review skills first
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

interface ParseResult {
  skills: { id: string; level: SkillLevel; evidence: string[] }[];
  occupationSoc: string | null;
  years: number | null;
  engine: "keywords" | "claude";
  model?: string;
  notice?: string;
  error?: string;
  name?: string | null;
  avatar?: "man" | "woman" | null;
}

function CvUpload({ onDone }: { onDone: (draft: Draft) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const send = async (body: FormData | string) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/parse-cv", {
        method: "POST",
        ...(typeof body === "string" ? { body: JSON.stringify({ text: body }), headers: { "content-type": "application/json" } } : { body }),
      });
      const result = (await response.json()) as ParseResult;
      if (!response.ok || result.error) throw new Error(result.error ?? "Could not read that CV.");
      onDone({
        ...EMPTY,
        name: result.name ?? "",
        avatar: result.avatar ?? undefined,
        currentSoc: result.occupationSoc ?? EMPTY.currentSoc,
        years: result.years ?? EMPTY.years,
        skills: Object.fromEntries(result.skills.map((skill) => [skill.id, skill.level])),
        evidence: Object.fromEntries(result.skills.map((skill) => [skill.id, skill.evidence])),
        source: "cv",
      });
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const upload = (file: File | undefined) => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    void send(form);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          upload(event.dataTransfer.files[0]);
        }}
        className={cn(
          "nx-dotgrid flex min-h-[260px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragging ? "border-ink bg-saffron-soft" : "border-line-strong bg-card",
        )}
      >
        <div className="grid size-12 place-items-center rounded-xl bg-saffron text-saffron-deep">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 16V4M12 4l-5 5M12 4l5 5M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="mt-4 text-[17px] font-medium">{busy ? "Reading your CV…" : "Drop a CV here"}</p>
        <p className="mt-1 text-[13px] text-ink-3">PDF, Word (.docx) or .txt · up to 5 MB · read in memory, never stored</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button className={BTN_INK} disabled={busy} onClick={() => input.current?.click()}>
            Choose a file
          </button>
          <button className={BTN_GHOST} disabled={busy} onClick={() => void send(SAMPLE_CV)}>
            Use the synthetic sample CV
          </button>
        </div>
        <input ref={input} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(event) => upload(event.target.files?.[0])} />
        {error ? <p className="mt-4 text-[13px] text-auto">{error}</p> : null}
      </div>
      <Card className="p-5">
        <Micro>How your CV is read</Micro>
        <ol className="mt-3 space-y-3 text-[14px] leading-relaxed text-ink-2">
          <li>
            <span className="font-mono text-ink-3">1</span> The text is extracted on the server and never saved.
          </li>
          <li>
            <span className="font-mono text-ink-3">2</span> It is matched to Nexa&apos;s {SKILLS.length}-skill taxonomy — by keywords, or by Claude when the team enables it. Claude may only choose from the
            taxonomy.
          </li>
          <li>
            <span className="font-mono text-ink-3">3</span> You see the words that triggered each skill, and confirm or remove it.
          </li>
        </ol>
        <p className="mt-4 rounded-lg bg-paper-2 p-3 text-[12.5px] leading-snug text-ink-3">
          For the hackathon demo, please use the synthetic sample CV. The SDC rules ask teams not to use real personal data.
        </p>
      </Card>
    </div>
  );
}

const CATEGORY_ORDER: SkillCategory[] = ["Human", "Business", "AI & data", "Technology", "Green & health"];

function QuickForm({ onDone }: { onDone: (draft: Draft) => void }) {
  const [picked, setPicked] = useState<Record<string, SkillLevel>>({});
  const [currentSoc, setCurrentSoc] = useState(EMPTY.currentSoc);
  return (
    <Card className="p-6">
      <label className="block">
        <Micro>Your current or most recent job</Micro>
        <OccupationSelect value={currentSoc} onChange={setCurrentSoc} />
      </label>
      <Micro className="mt-6">Tap the skills you use — tap again for a higher level</Micro>
      <div className="mt-3 space-y-4">
        {CATEGORY_ORDER.map((category) => (
          <div key={category}>
            <p className="mb-2 text-[13px] font-medium text-ink-2">{category}</p>
            <div className="flex flex-wrap gap-2">
              {SKILLS.filter((skill) => skill.category === category).map((skill) => {
                const level = picked[skill.id];
                return (
                  <button
                    key={skill.id}
                    onClick={() =>
                      setPicked((current) => {
                        const next = { ...current };
                        const value = current[skill.id];
                        if (value === undefined) next[skill.id] = 1;
                        else if (value < 3) next[skill.id] = (value + 1) as SkillLevel;
                        else delete next[skill.id];
                        return next;
                      })
                    }
                    className={cn(
                      "nx-focus inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors",
                      level === undefined ? "border-line bg-card text-ink-2 hover:border-line-strong" : level === 3 ? "border-ink bg-ink text-paper" : "border-ink bg-saffron-soft text-ink",
                    )}
                  >
                    {skill.label}
                    {level !== undefined ? <span className="font-mono text-[11px]">{"●".repeat(level)}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-3">
        <button
          className={BTN_SAFFRON}
          disabled={Object.keys(picked).length < 3}
          onClick={() => onDone({ ...EMPTY, currentSoc, skills: picked, source: "form" })}
        >
          Continue
        </button>
        <p className="text-[13px] text-ink-3">{Object.keys(picked).length < 3 ? "Pick at least three skills." : `${Object.keys(picked).length} skills picked.`}</p>
      </div>
    </Card>
  );
}

function OccupationSelect({ value, onChange }: { value: string; onChange: (soc: string) => void }) {
  const families = useMemo(() => [...new Set(CURRENT_OCCUPATIONS.map((occupation) => occupation.family))], []);
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="nx-focus mt-2 h-11 w-full max-w-md rounded-lg border border-line bg-card px-3 text-[15px]"
    >
      {families.map((family) => (
        <optgroup key={family} label={family}>
          {CURRENT_OCCUPATIONS.filter((occupation) => occupation.family === family).map((occupation) => (
            <option key={occupation.soc} value={occupation.soc}>
              {occupation.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function Review({ draft, onChange, onBack, onDone }: { draft: Draft; onChange: (draft: Draft) => void; onBack: () => void; onDone: (draft: Draft) => void }) {
  const [adding, setAdding] = useState("");
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  const available = SKILLS.filter((skill) => draft.skills[skill.id] === undefined);
  const toggleGoal = (n: number) => {
    const has = draft.sdgPriorities.includes(n);
    set({ sdgPriorities: has ? draft.sdgPriorities.filter((goal) => goal !== n) : [...draft.sdgPriorities, n].slice(-3) });
  };

  return (
    <div className="mt-8 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <Micro>Name</Micro>
            <input
              value={draft.name}
              onChange={(event) => set({ name: event.target.value })}
              placeholder="You"
              className="nx-focus mt-2 h-11 w-full rounded-lg border border-line bg-card px-3 text-[15px]"
            />
          </label>
          <label className="block">
            <Micro>Years in this kind of work</Micro>
            <input
              type="number"
              min={0}
              max={45}
              value={draft.years}
              onChange={(event) => set({ years: Number(event.target.value) })}
              className="nx-focus mt-2 h-11 w-full rounded-lg border border-line bg-card px-3 font-mono text-[15px]"
            />
          </label>
        </div>
        {draft.personaId ? null : <AvatarPicker value={draft.avatar} onChange={(avatar) => set({ avatar })} />}
        <label className="mt-4 block">
          <Micro>Current or most recent job</Micro>
          <OccupationSelect value={draft.currentSoc} onChange={(soc) => set({ currentSoc: soc })} />
        </label>

        <div className="mt-6 flex items-baseline justify-between">
          <Micro>Your skills · tap the dots to set your level</Micro>
          <span className="font-mono text-[12px] text-ink-3">{Object.keys(draft.skills).length} confirmed</span>
        </div>
        <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
          {Object.entries(draft.skills).map(([id, level]) => (
            <li key={id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">{SKILL_BY_ID.get(id)?.label}</p>
                {draft.evidence[id]?.length ? <p className="text-[12px] text-ink-3">Found in your CV: “{draft.evidence[id]!.join("”, “")}”</p> : null}
              </div>
              <div className="flex items-center gap-1" role="radiogroup" aria-label={`Level for ${SKILL_BY_ID.get(id)?.label}`}>
                {([1, 2, 3] as const).map((value) => (
                  <button
                    key={value}
                    role="radio"
                    aria-checked={level === value}
                    title={["Basic", "Working", "Strong"][value - 1]}
                    onClick={() => set({ skills: { ...draft.skills, [id]: value } })}
                    className={cn("nx-focus size-6 rounded-full border transition-colors", value <= level ? "border-ink bg-ink" : "border-line-strong bg-card")}
                  />
                ))}
                <span className="ml-2 w-14 text-[12px] text-ink-3">{["Basic", "Working", "Strong"][level - 1]}</span>
              </div>
              <button
                aria-label="Remove skill"
                onClick={() => {
                  const skills = { ...draft.skills };
                  delete skills[id];
                  set({ skills });
                }}
                className="nx-focus grid size-8 place-items-center rounded-md text-ink-3 hover:bg-stone hover:text-ink"
              >
                ×
              </button>
            </li>
          ))}
          {Object.keys(draft.skills).length === 0 ? <li className="px-3 py-4 text-[14px] text-ink-3">No skills yet — add some below.</li> : null}
        </ul>
        <div className="mt-3 flex gap-2">
          <select value={adding} onChange={(event) => setAdding(event.target.value)} className="nx-focus h-10 flex-1 rounded-lg border border-line bg-card px-3 text-[14px]">
            <option value="">Add a skill…</option>
            {CATEGORY_ORDER.map((category) => (
              <optgroup key={category} label={category}>
                {available
                  .filter((skill) => skill.category === category)
                  .map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <button
            className={BTN_GHOST}
            disabled={adding === ""}
            onClick={() => {
              set({ skills: { ...draft.skills, [adding]: 2 } });
              setAdding("");
            }}
          >
            Add
          </button>
        </div>
      </Card>

      <div className="space-y-5">
        <Card className="p-6">
          <Micro>Hours a week you can spend learning</Micro>
          <div className="mt-3 flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={20}
              value={draft.hoursPerWeek}
              onChange={(event) => set({ hoursPerWeek: Number(event.target.value) })}
              className="flex-1 accent-[var(--ink)]"
            />
            <span className="w-16 text-right font-mono text-[20px]">{draft.hoursPerWeek}h</span>
          </div>
          <p className="mt-2 text-[12.5px] text-ink-3">Your pathway timeline is fitted to this.</p>
        </Card>
        <Card className="p-6">
          <Micro>The goals you care about most (up to 3)</Micro>
          <div className="mt-3 grid grid-cols-6 gap-1.5">
            {SDG_GOALS.map((goal) => {
              const on = draft.sdgPriorities.includes(goal.n);
              return (
                <button
                  key={goal.n}
                  title={goal.name}
                  onClick={() => toggleGoal(goal.n)}
                  aria-pressed={on}
                  className={cn("nx-focus rounded-md transition-all", on ? "ring-2 ring-ink ring-offset-2" : "opacity-45 hover:opacity-80")}
                >
                  <SdgTile n={goal.n} size={38} />
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[12.5px] text-ink-3">
            {draft.sdgPriorities.length === 0 ? "None chosen — impact won't change your ranking." : draft.sdgPriorities.map((n) => SDG_GOALS[n - 1]?.name).join(" · ")}
          </p>
        </Card>
        <div className="flex flex-wrap gap-2">
          <button className={BTN_SAFFRON} disabled={Object.keys(draft.skills).length < 3} onClick={() => onDone(draft)}>
            See my future
          </button>
          <button className={BTN_GHOST} onClick={onBack}>
            Back
          </button>
        </div>
        <p className="text-[12.5px] text-ink-3">Your profile stays in this browser. Age, gender and background never change your results — the picture is only for display.</p>
      </div>
    </div>
  );
}

/** Default picture for people without a photo. Pre-picked from the CV when it is clear; display only. */
function AvatarPicker({ value, onChange }: { value?: "man" | "woman"; onChange: (value: "man" | "woman") => void }) {
  return (
    <div className="mt-4">
      <Micro>Picture</Micro>
      <div className="mt-2 flex gap-3" role="radiogroup" aria-label="Picture">
        {(["man", "woman"] as const).map((option) => (
          <button
            key={option}
            role="radio"
            aria-checked={value === option}
            aria-label={option === "man" ? "Man" : "Woman"}
            onClick={() => onChange(option)}
            className={cn(
              "nx-focus relative size-16 overflow-hidden rounded-full border-2 bg-white transition-all",
              value === option ? "border-saffron ring-4 ring-saffron-soft" : "border-line opacity-70 hover:opacity-100",
            )}
          >
            <Image src={`/avatars/${option}.jpg`} alt="" fill sizes="64px" className="object-cover object-top" />
          </button>
        ))}
      </div>
    </div>
  );
}
