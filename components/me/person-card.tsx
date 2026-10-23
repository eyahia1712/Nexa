import Image from "next/image";
import Link from "next/link";

import { SdgTile } from "@/components/ui/bits";
import { OCCUPATIONS, SKILL_BY_ID } from "@/lib/catalog";
import { PERSONAS, type Profile } from "@/lib/profile";
import { cn, initials } from "@/lib/utils";

/**
 * The person, at a glance: their picture (or initials), job, and the skills
 * they bring. Strong skills are filled; human-core skills (not mainly
 * routine) carry a saffron dot.
 */
export function PersonCard({ profile }: { profile: Profile }) {
  const persona = PERSONAS.find((item) => item.id === profile.personaId);
  const occupation = OCCUPATIONS[profile.currentSoc]!;
  const skills = Object.entries(profile.skills).sort((a, b) => b[1] - a[1]);
  const age = persona ? `, ${persona.age}` : "";

  return (
    <div className="nx-rise overflow-hidden border border-line-strong/60 bg-card shadow-[0_16px_36px_-24px_rgb(0_0_0/45%)]">
      <div className="relative h-[230px] bg-[#1D4A61] text-white">
        {persona ? (
          <Image src={persona.photo} alt={profile.name} fill sizes="340px" className="object-cover" style={{ objectPosition: persona.photoFocus ?? "50% 0%" }} priority />
        ) : profile.avatar ? (
          <div className="absolute inset-0 bg-[linear-gradient(160deg,#EAF1FF,#FFF3C4)]">
            <Image src={`/avatars/${profile.avatar}.jpg`} alt={profile.name} fill sizes="340px" className="object-contain object-bottom mix-blend-multiply" priority />
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,#2F6BFF,#DD1367)]">
            <span className="font-mono text-[56px] font-semibold">{initials(profile.name)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/55%)_0%,rgb(0_0_0/0%)_30%,rgb(0_0_0/15%)_55%,rgb(0_0_0/85%)_100%)]" />
        <div className="relative flex h-full flex-col p-4">
          <div className="flex items-start justify-between">
            <p className="font-mono text-[10px] leading-snug tracking-[0.14em] uppercase opacity-85">
              Nexa
              <br />
              {"// "}
              {occupation.family}
            </p>
            <div className="text-right">
              <p className="font-mono text-[26px] leading-none font-semibold">{profile.years}</p>
              <p className="mt-1 font-mono text-[9.5px] tracking-[0.14em] uppercase opacity-75">Years</p>
            </div>
          </div>
          <div className="mt-auto">
            <p className="text-[22px] leading-none font-semibold tracking-[-0.02em]">
              {profile.name}
              {age}
            </p>
            <p className="mt-2 font-mono text-[11px] tracking-[0.12em] text-[#FFE58A] uppercase">{occupation.label}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 border-b border-line text-center">
        {[
          [String(Object.keys(profile.skills).length), "Skills"],
          [`${profile.hoursPerWeek}h`, "Per week"],
          [profile.source === "sample" ? "Sample" : profile.source === "cv" ? "CV" : "Form", "Source"],
        ].map(([value, label], index) => (
          <div key={label} className={cn("px-2 py-3", index > 0 && "border-l border-line")}>
            <p className="font-mono text-[16px]">{value}</p>
            <p className="nx-micro text-[10px] text-ink-3">{label}</p>
          </div>
        ))}
      </div>

      <div className="p-4">
        <p className="nx-micro text-[10.5px] text-ink-3">Skills</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {skills.map(([id, level]) => {
            const skill = SKILL_BY_ID.get(id);
            const human = skill?.routineSoc === null;
            return (
              <span
                key={id}
                title={`${skill?.label} · ${["basic", "working", "strong"][level - 1]}`}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px]",
                  level === 3 ? "border-[#2F6BFF]/35 bg-[#EAF0FF] font-medium text-[#1F49C7]" : "border-line bg-card text-ink",
                )}
              >
                {human ? <span className="size-1.5 rounded-full bg-saffron" /> : null}
                {(skill?.label ?? id).split(" (")[0]!.split(" & ")[0]}
              </span>
            );
          })}
        </div>
        <p className="mt-2 flex items-center gap-3 text-[11px] text-ink-3">
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-full border border-[#2F6BFF]/40 bg-[#EAF0FF]" /> strong
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-saffron" /> human core
          </span>
        </p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {profile.sdgPriorities.map((n) => (
              <SdgTile key={n} n={n} size={22} />
            ))}
          </div>
          <Link href={`/start?edit=${profile.personaId ?? "me"}`} className="nx-micro nx-focus inline-flex h-8 items-center rounded-md border border-line px-3 text-[11px] hover:border-ink">
            Edit
          </Link>
        </div>
      </div>
    </div>
  );
}
