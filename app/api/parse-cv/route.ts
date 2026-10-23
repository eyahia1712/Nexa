import { NextResponse } from "next/server";

import { claudeEnabled, extractWithClaude } from "@/lib/cv/claude";
import { extractWithKeywords } from "@/lib/cv/keywords";

/**
 * POST a CV (PDF, DOCX or plain text) or { text }. Returns suggested skills
 * for the person to confirm. Nothing is stored: the file is read in memory
 * and discarded when the response is sent.
 */
export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

async function readText(request: Request): Promise<string> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = (await request.json()) as { text?: string };
    return body.text ?? "";
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return String(form.get("text") ?? "");
  if (file.size > MAX_BYTES) throw new Error("That file is over 5 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return value;
  }
  return new TextDecoder().decode(bytes);
}

export async function POST(request: Request) {
  let text: string;
  try {
    text = await readText(request);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Could not read that file." }, { status: 400 });
  }
  if (text.trim().length < 30) {
    return NextResponse.json({ error: "We could not find enough text in that file. Try a PDF with selectable text, a .docx, or paste the text." }, { status: 400 });
  }

  const keywords = extractWithKeywords(text);
  if (claudeEnabled()) {
    try {
      const ai = await extractWithClaude(text);
      // Keep keyword hits Claude did not mention, so nothing visible is lost.
      const ids = new Set(ai.skills.map((skill) => skill.id));
      return NextResponse.json({
        ...ai,
        occupationSoc: ai.occupationSoc ?? keywords.occupationSoc,
        years: ai.years ?? keywords.years,
        name: ai.name ?? keywords.name,
        avatar: ai.avatar ?? keywords.avatar,
        skills: [...ai.skills, ...keywords.skills.filter((skill) => !ids.has(skill.id))],
        characters: text.length,
      });
    } catch (error) {
      return NextResponse.json({ ...keywords, characters: text.length, notice: `AI reading unavailable (${(error as Error).message}); used keyword matching.` });
    }
  }
  return NextResponse.json({ ...keywords, characters: text.length });
}
