import personaFile from "@/data/curated/personas.json";

/** 1 basic · 2 working · 3 strong */
export type SkillLevel = 1 | 2 | 3;

export interface Profile {
  id: string;
  name: string;
  headline?: string;
  story?: string;
  currentSoc: string;
  years: number;
  hoursPerWeek: number;
  /** SDG goal numbers this person cares about most, in order. */
  sdgPriorities: number[];
  skills: Record<string, SkillLevel>;
  source: "sample" | "cv" | "form";
  /** Set when the profile came from a sample persona. */
  personaId?: string;
  /** Default picture when there is no photo. Display only. */
  avatar?: "man" | "woman";
}

export interface Persona {
  id: string;
  name: string;
  headline: string;
  story: string;
  age: number;
  currentSoc: string;
  years: number;
  hoursPerWeek: number;
  sdgPriorities: number[];
  skills: Record<string, SkillLevel>;
  photo: string;
  /** CSS object-position that keeps the face in frame. */
  photoFocus?: string;
}

export const PERSONAS = personaFile.personas as unknown as Persona[];
export const SAMPLE_CV = personaFile.sampleCv;

export function profileFromPersona(persona: Persona): Profile {
  return {
    id: `persona-${persona.id}`,
    name: persona.name,
    headline: persona.headline,
    story: persona.story,
    currentSoc: persona.currentSoc,
    years: persona.years,
    hoursPerWeek: persona.hoursPerWeek,
    sdgPriorities: persona.sdgPriorities,
    skills: persona.skills,
    source: "sample",
    personaId: persona.id,
  };
}

export const LEVEL_LABEL: Record<SkillLevel, string> = { 1: "Basic", 2: "Working", 3: "Strong" };

const STORAGE_KEY = "nexa.profile.v1";

export function saveProfile(profile: Profile) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Private windows can refuse storage; the session simply won't persist.
  }
}

export function loadProfile(): Profile | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === null ? null : (JSON.parse(raw) as Profile);
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------------------------
   The person's plan: the next role they chose. Kept per profile, so Aisyah's
   choice and Daniel's choice don't overwrite each other, and it survives a
   refresh. The pathway is always rebuilt from the chosen role.
---------------------------------------------------------------------------- */

const planKey = (profileId: string) => `nexa.plan.v1.${profileId}`;

export function loadPlan(profileId: string): string | null {
  try {
    const raw = window.localStorage.getItem(planKey(profileId));
    return raw === null ? null : ((JSON.parse(raw) as { roleId?: string }).roleId ?? null);
  } catch {
    return null;
  }
}

export function savePlan(profileId: string, roleId: string | null) {
  try {
    if (roleId === null) window.localStorage.removeItem(planKey(profileId));
    else window.localStorage.setItem(planKey(profileId), JSON.stringify({ roleId, savedAt: new Date().toISOString() }));
  } catch {
    // Storage can be unavailable (private windows); the plan then lasts for this visit.
  }
}
