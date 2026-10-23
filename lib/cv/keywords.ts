import { CURRENT_OCCUPATIONS, SKILLS } from "@/lib/catalog";
import type { SkillLevel } from "@/lib/profile";

import { findAvatar, findName, type Avatar } from "./identity";

/**
 * Deterministic CV reading: find each taxonomy skill's keywords in the text.
 * Always available (no API key, no network) and fully explainable — every
 * suggested skill carries the words that triggered it.
 */

export interface ExtractedSkill {
  id: string;
  level: SkillLevel;
  evidence: string[];
}

export interface Extraction {
  skills: ExtractedSkill[];
  occupationSoc: string | null;
  years: number | null;
  engine: "keywords" | "claude";
  model?: string;
  /** The person's name as written on the CV. */
  name?: string | null;
  /** Default picture to show; display only, never used in scoring. */
  avatar?: Avatar | null;
}

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function extractWithKeywords(text: string): Extraction {
  const lower = ` ${text.toLowerCase().replace(/\s+/g, " ")} `;
  const skills: ExtractedSkill[] = [];
  for (const skill of SKILLS) {
    const hits = skill.keywords.filter((keyword) => new RegExp(`(^|[^a-z0-9])${escape(keyword)}([^a-z0-9]|$)`).test(lower));
    if (hits.length === 0) continue;
    // More distinct mentions suggest more depth; the person confirms the level.
    const level: SkillLevel = hits.length >= 3 ? 3 : hits.length === 2 ? 2 : 2;
    skills.push({ id: skill.id, level, evidence: hits.slice(0, 4) });
  }

  let occupationSoc: string | null = null;
  let best = 0;
  for (const occupation of CURRENT_OCCUPATIONS) {
    const words = [occupation.label, occupation.title].join(" ").toLowerCase().split(/[^a-z]+/).filter((word) => word.length > 3);
    const score = words.filter((word) => lower.includes(word)).length / Math.max(1, words.length);
    if (score > best && score >= 0.34) {
      best = score;
      occupationSoc = occupation.soc;
    }
  }

  const yearMatch = /(\d{1,2})\+?\s*(?:years|yrs)/i.exec(text);
  const name = findName(text);
  return { skills, occupationSoc, years: yearMatch ? Number(yearMatch[1]) : null, engine: "keywords", name, avatar: findAvatar(text, name) };
}
