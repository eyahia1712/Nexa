import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { CURRENT_OCCUPATIONS, SKILLS, SKILL_BY_ID } from "@/lib/catalog";
import type { SkillLevel } from "@/lib/profile";

import type { Extraction } from "./keywords";

/**
 * Optional: read a CV with Claude. The model may only answer with skill ids
 * from Nexa's taxonomy and occupation codes from its list; anything else is
 * dropped by the validator below, so it cannot invent skills or jobs. The
 * person reviews and edits every result before it is used.
 */

export const CLAUDE_MODEL = "claude-opus-5-5";

export function claudeEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const ExtractionSchema = z.object({
  full_name: z.string().nullable(),
  avatar: z.enum(["man", "woman"]).nullable(),
  occupation_soc: z.string().nullable(),
  years_experience: z.number().int().nullable(),
  skills: z.array(
    z.object({
      id: z.string(),
      level: z.number().int(),
      evidence: z.string(),
    }),
  ),
});

const SYSTEM = [
  "You read CVs for Nexa, a career-planning tool, and map them onto a fixed skills taxonomy.",
  "Only use skill ids and occupation codes from the lists provided. If nothing fits, leave it out.",
  "Level: 1 = mentioned or basic, 2 = used in work, 3 = a clear strength over years.",
  "Evidence is a short quote or paraphrase from the CV that supports the skill.",
  "full_name is the person's name exactly as the CV gives it (null if none).",
  "avatar only picks a default cartoon picture: \"man\" or \"woman\" from how the CV names or refers to the person, null if unclear. It is never used for scoring.",
  "Do not guess or output any other personal attributes such as age or ethnicity.",
].join("\n");

export async function extractWithClaude(text: string): Promise<Extraction> {
  const client = new Anthropic();
  const taxonomy = SKILLS.map((skill) => `${skill.id}: ${skill.label}`).join("\n");
  const occupations = CURRENT_OCCUPATIONS.map((occupation) => `${occupation.soc}: ${occupation.label} (${occupation.title})`).join("\n");

  const response = await client.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    output_config: { effort: "low", format: zodOutputFormat(ExtractionSchema) },
    messages: [
      {
        role: "user",
        content: `SKILL TAXONOMY (id: label)\n${taxonomy}\n\nOCCUPATIONS (code: label)\n${occupations}\n\nCV\n<<<\n${text.slice(0, 30_000)}\n>>>`,
      },
    ],
  });

  if (response.stop_reason === "refusal" || response.parsed_output === null) {
    throw new Error(response.stop_reason === "refusal" ? "The model declined this CV." : "The model returned no usable result.");
  }
  const parsed = response.parsed_output;
  const known = new Set(CURRENT_OCCUPATIONS.map((occupation) => occupation.soc));
  return {
    engine: "claude",
    model: CLAUDE_MODEL,
    occupationSoc: parsed.occupation_soc !== null && known.has(parsed.occupation_soc) ? parsed.occupation_soc : null,
    years: parsed.years_experience,
    name: parsed.full_name?.trim() || null,
    avatar: parsed.avatar,
    skills: parsed.skills
      .filter((skill) => SKILL_BY_ID.has(skill.id))
      .map((skill) => ({ id: skill.id, level: Math.min(3, Math.max(1, skill.level)) as SkillLevel, evidence: [skill.evidence] })),
  };
}
