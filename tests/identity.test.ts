import { describe, expect, it } from "vitest";

import { findAvatar, findName } from "@/lib/cv/identity";
import { SAMPLE_CV } from "@/lib/profile";

describe("CV identity", () => {
  it("reads the name from the first line, in title case", () => {
    expect(findName("NUR AISYAH BINTI AHMAD\nKuala Lumpur · aisyah@mail.com\nPROFILE\n...")).toBe("Nur Aisyah binti Ahmad");
    expect(findName(SAMPLE_CV)).toBe("Aisyah");
  });
  it("reads a labelled name and a one-line PDF header", () => {
    expect(findName("Curriculum Vitae\nName: Tan Wei Ming\nPhone: 012-345 6789")).toBe("Tan Wei Ming");
    expect(findName("Daniel Lee Software Engineer daniel@x.com +60 12 345")).toBe("Daniel Lee");
  });
  it("skips headings that are not names", () => {
    expect(findName("RESUME\nContact Details\nRaj Kumar a/l Suresh\nPenang")).toBe("Raj Kumar a/l Suresh");
  });
  it("picks a picture only from clear signals", () => {
    expect(findAvatar("", "Nur Aisyah binti Ahmad")).toBe("woman");
    expect(findAvatar("", "Raj Kumar a/l Suresh")).toBe("man");
    expect(findAvatar("Gender: Female", "Tan Wei Ming")).toBe("woman");
    expect(findAvatar("", "Daniel Lee")).toBe("man");
    expect(findAvatar("", "Tan Wei Ming")).toBeNull();
  });
});
