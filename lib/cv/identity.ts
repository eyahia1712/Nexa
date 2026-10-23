/**
 * Who the CV belongs to: their name, and which default picture to show
 * (man or woman). Works offline with no AI.
 *
 * The picture is chosen only from what the CV itself says — a "Gender:"
 * line, a title (Mr, Ms, Encik, Puan), Malay or Indian name particles
 * (bin/binti, a/l, a/p), pronouns, or a common first name. If nothing is
 * clear it returns null and the person picks. It is display only: nothing
 * in Nexa's scoring ever reads it.
 */

export type Avatar = "man" | "woman";

const NOT_A_NAME = /\b(curriculum|vitae|resume|résumé|cv|profile|contact|summary|objective|address|phone|mobile|email|e-mail|linkedin|github|experience|education|skills|page|career|personal|details|information)\b/i;
// Job words end a name when a PDF puts "Name Job Title email" on one line.
const JOB_WORDS =
  /^(senior|junior|lead|head|chief|principal|software|data|customer|service|sales|marketing|business|financial|finance|account|accounts|accountant|auditor|engineer|developer|designer|manager|executive|analyst|assistant|officer|specialist|consultant|representative|administrator|admin|clerk|teacher|lecturer|nurse|technician|operator|supervisor|director|intern|student|graduate|kuala|lumpur|selangor|penang|johor|malaysia|singapore)$/i;
const PARTICLES = new Set(["bin", "binti", "bte", "bt", "a/l", "a/p", "al", "ap", "van", "de", "da", "von"]);

const MEN = new Set(
  "muhammad mohd mohamad mohammad mohamed muhamad ahmad ahmed ali abdul abu ismail hafiz hafiz amir aiman farid faiz firdaus hakim haziq irfan khairul syafiq syahmi hariz danial daniel adam ryan jason kevin raj rajesh kumar arjun suresh ravi ganesh vijay john james michael david robert william richard thomas mark paul peter andrew joseph brian eric steven alex alexander chris christopher matthew nicholas benjamin samuel aaron azman azlan razak rahman hassan hussain yusof yusuf zul zulkifli amirul ikhwan imran izzat luqman nazri rizal shahrul wei ming jun jie hao kai zhi yong hong chee keong"
    .split(" "),
);
const WOMEN = new Set(
  "nurul siti nur noor aisyah aishah aisha fatimah farah nadia aina alya amira aqilah syafiqah nabila hani hanis izzati liyana nurin sofea sophia sarah sara emily jessica jennifer elizabeth mary patricia linda barbara susan karen nancy lisa betty sandra ashley emma olivia ava mia isabella grace hannah chloe priya kavitha lakshmi devi meena anita sunita shalini mei ling hui xin yan jia qi ying xiao fang li na rachel michelle melissa stephanie nicole amanda angela"
    .split(" "),
);
// Short Chinese given-name syllables are shared by men and women; only use them as a tie-breaker.
const AMBIGUOUS = new Set(["wei", "ming", "jun", "jie", "hao", "kai", "zhi", "yong", "hong", "mei", "ling", "hui", "xin", "yan", "jia", "qi", "ying", "xiao", "fang", "li", "na"]);

const titleCase = (word: string) => (PARTICLES.has(word.toLowerCase()) ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
const isNameWord = (word: string) => PARTICLES.has(word.toLowerCase()) || /^[A-Z][A-Za-z'’.-]*$/.test(word) || /^[A-Z][A-Z'’.-]+$/.test(word);

function tidy(words: string[], minWords = 2) {
  const name = words.map((word) => word.replace(/[,;:]+$/, "")).filter(Boolean);
  if (name.length < minWords || name.length > 6) return null;
  const allCaps = name.every((word) => word === word.toUpperCase());
  return (allCaps ? name.map(titleCase) : name).join(" ");
}

/** The person's name, from a "Name:" line or the first line that looks like a name. */
export function findName(text: string): string | null {
  const labelled = /(?:^|\n)\s*(?:full\s+)?name\s*[:\-–]\s*([^\n|•,]{3,60})/i.exec(text);
  if (labelled) {
    const name = tidy(labelled[1]!.trim().split(/\s+/));
    if (name) return name;
  }
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 15);
  for (const [index, line] of lines.entries()) {
    if (/[@\d]/.test(line.slice(0, 40)) && !/^[A-Za-z]/.test(line)) continue;
    // Take the leading run of name-like words (PDF text can put a whole header on one line).
    const words = line.split(/\s+/);
    const run: string[] = [];
    for (const word of words) {
      if (!isNameWord(word) || NOT_A_NAME.test(word) || JOB_WORDS.test(word.replace(/[,;:]+$/, ""))) break;
      run.push(word);
      if (run.length === 6) break;
    }
    // A single word only counts as a name when it heads the CV ("AISYAH").
    const minWords = index === 0 ? 1 : 2;
    if (run.length >= minWords && run.join("").length >= 3 && !NOT_A_NAME.test(run.join(" "))) {
      const name = tidy(run, minWords);
      if (name) return name;
    }
  }
  return null;
}

/** Which default picture fits, or null when the CV does not make it clear. */
export function findAvatar(text: string, name: string | null): Avatar | null {
  const stated = /\b(?:gender|sex|jantina)\s*[:\-–]?\s*(male|female|man|woman|lelaki|perempuan)\b/i.exec(text);
  if (stated) return /^(male|man|lelaki)$/i.test(stated[1]!) ? "man" : "woman";

  const lowerName = (name ?? "").toLowerCase();
  if (/\b(binti|bte|bt|a\/p)\b/.test(lowerName)) return "woman";
  if (/\b(bin|a\/l)\b/.test(lowerName)) return "man";

  const head = text.slice(0, 400);
  if (/\b(mrs|ms|miss|madam|puan)\b\.?/i.test(head)) return "woman";
  if (/\b(mr|encik|tuan)\b\.?\s/i.test(head)) return "man";

  const he = (text.match(/\b(he|him|his|himself)\b/gi) ?? []).length;
  const she = (text.match(/\b(she|her|hers|herself)\b/gi) ?? []).length;
  if (he >= 2 && he > she * 2) return "man";
  if (she >= 2 && she > he * 2) return "woman";

  const words = lowerName.split(/[\s.-]+/).filter(Boolean);
  for (const word of words) {
    if (AMBIGUOUS.has(word)) continue;
    if (MEN.has(word)) return "man";
    if (WOMEN.has(word)) return "woman";
  }
  return null;
}
