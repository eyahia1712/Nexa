import Image from "next/image";

/**
 * Four people, four situations, shown as profile cards: the picture fills the
 * card and Nexa's answer sits on it. Static by design — everything is visible
 * at once, nothing to click.
 */

export interface PersonaCard {
  id: string;
  initial: string;
  color: string;
  name: string;
  tag: string;
  situation: string;
  answer: string;
  chips: string[];
  score: { value: string; label: string };
  photo: string;
  /** "contain" for logos, so nothing is cropped. */
  fit?: "cover" | "contain";
}

export function PersonaCards({ cards }: { cards: PersonaCard[] }) {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <ProfileCard key={card.id} card={card} index={index} />
      ))}
    </div>
  );
}

function ProfileCard({ card, index }: { card: PersonaCard; index: number }) {
  const logo = card.fit === "contain";
  const code = `NX-${card.id.slice(0, 3).toUpperCase()}·01`;
  return (
    <article
      className="nx-rise relative h-[300px] overflow-hidden border border-line-strong/60 text-white shadow-[0_16px_36px_-22px_rgb(0_0_0/55%)] transition-transform duration-300 hover:-translate-y-1"
      style={{ ["--i" as string]: index, background: logo ? `color-mix(in srgb, ${card.color} 12%, white)` : "#111110" }}
    >
      {logo ? (
        <div className="absolute inset-x-10 top-14 bottom-[132px]">
          <Image src={card.photo} alt={card.name} fill sizes="240px" className="object-contain mix-blend-multiply" />
        </div>
      ) : (
        <Image src={card.photo} alt={card.name} fill sizes="(max-width: 1024px) 50vw, 280px" className="object-cover object-top" />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: logo
            ? "linear-gradient(180deg, rgb(0 0 0 / 0%) 0%, rgb(0 0 0 / 0%) 55%, rgb(0 0 0 / 85%) 100%)"
            : "linear-gradient(180deg, rgb(0 0 0 / 62%) 0%, rgb(0 0 0 / 0%) 32%, rgb(0 0 0 / 22%) 52%, rgb(0 0 0 / 88%) 100%)",
        }}
      />

      <div className="relative flex h-full flex-col p-4">
        <div className={`flex items-start justify-between gap-3 ${logo ? "text-ink" : ""}`}>
          <p className="font-mono text-[10px] leading-snug tracking-[0.14em] uppercase opacity-85">
            Nexa
            <br />
            {"// "}
            {card.tag}
          </p>
          <div className="text-right">
            <p className="font-mono text-[28px] leading-none font-semibold">{card.score.value}</p>
            <p className="mt-1 font-mono text-[9.5px] tracking-[0.14em] uppercase opacity-75">{card.score.label}</p>
          </div>
        </div>

        <div className="mt-auto">
          <p className="text-[21px] leading-none font-semibold tracking-[-0.02em]">{card.name}</p>
          <p className="mt-2 font-mono text-[11.5px] tracking-[0.12em] uppercase" style={{ color: "#FFE58A" }}>
            {card.answer}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {card.chips.map((chip) => (
              <span key={chip} className="rounded-full border border-white/35 bg-white/10 px-2.5 py-0.5 font-mono text-[10px] tracking-wider uppercase backdrop-blur-sm">
                {chip}
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/25 pt-2 font-mono text-[9.5px] tracking-[0.14em] uppercase opacity-70">
            <span>{card.situation}</span>
            <span>{code}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
