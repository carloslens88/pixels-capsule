// Basic first line of defense against profanity/hate speech in free-text fields
// (message, slogan). This is a heuristic word-list match, not real moderation —
// it catches common cases in Spanish and English but can both miss creative
// evasions and false-positive on innocuous words that contain a listed substring.
// Treat it as a deterrent, not a guarantee.

const BLOCKED_WORDS = [
  // English profanity / slurs (common ones)
  "fuck", "shit", "bitch", "asshole", "bastard", "cunt", "dick", "piss",
  "nigger", "nigga", "faggot", "fag", "retard", "whore", "slut", "twat",
  "rape", "rapist", "kike", "spic", "chink", "tranny",
  // Spanish profanity / slurs (common ones)
  "puta", "puto", "gilipollas", "cabron", "cabrón", "mierda", "joder",
  "maricon", "maricón", "polla", "coño", "zorra", "subnormal", "retrasado",
  "negro de mierda", "moro de mierda", "sudaca", "violador", "nazi",
];

const COMBINING_MARKS = /[̀-ͯ]/g;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "") // strip accents (é -> e)
    .replace(/@/g, "a")
    .replace(/0/g, "o")
    .replace(/[1!]/g, "i")
    .replace(/3/g, "e")
    .replace(/\$/g, "s");
}

export function containsProfanity(text: string): boolean {
  const normalized = normalize(text);
  return BLOCKED_WORDS.some((word) => {
    const pattern = new RegExp(`\\b${word.replace(/\s+/g, "\\s+")}\\b`, "i");
    return pattern.test(normalized);
  });
}
