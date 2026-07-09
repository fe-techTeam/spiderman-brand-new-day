// Profanity gate for every user-generated text surface (posts, comments,
// replies, usernames, MJ Wall, fan-art captions, profile fields).
//
// English — `obscenity`: catches derived forms ("f*cker"), leetspeak ("sh1t")
// and spacing tricks while avoiding Scunthorpe-style false positives
// ("assess", "Scunthorpe" pass).
// Hindi — the LDNOOBW romanized list (naughty-words/hi.json, how Hinglish is
// actually typed) plus a curated Devanagari set below, matched on letter
// boundaries so innocents like "Gandhi" pass but "chutiya_69" doesn't.
//
// To ban more words, append to HINDI_DEVANAGARI / EXTRA_TERMS — no other
// change needed.

import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";
import hindiRomanized from "naughty-words/hi.json";

const englishMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

// The LDNOOBW list is romanized only — cover the same slurs typed in script.
const HINDI_DEVANAGARI = [
  "मादरचोद", "मादरचोध", "बहनचोद", "बहेनचोद", "बेहेनचोद", "भैणचोद",
  "भोसड़ी", "भोसड़ीके", "भोसड़ा", "भोसडा", "भोसडीके", "भड़वा", "भड़वे", "भड़ुआ",
  "चूतिया", "चुतिया", "चूतिये", "चुतिये", "चूतियापा", "चूत", "चुत",
  "गांड", "गाण्ड", "गांडू", "गांडु", "गान्डु",
  "लंड", "लण्ड", "लौड़ा", "लोड़ा", "लवड़ा", "लौड़े", "लंडूरे",
  "रंडी", "रण्डी", "रंडीबाज़", "छिनाल",
  "हरामी", "हरामज़ादा", "हरामजादा", "हरामज़ादे", "हरामजादे", "हरामखोर",
  "कमीना", "कमीने", "कुतिया", "कुत्ती",
  "झांट", "झाँट", "झाटू", "झांटू",
  "चोद", "चोदू", "चुदाई", "चुदक्कड़", "बकचोद", "बकचोदी", "मूतना",
  "टट्टे", "गोटे",
];

// Romanized additions the LDNOOBW list misses (common alternate spellings).
const EXTRA_TERMS = [
  "bhosdike", "bhosdi ke", "bsdk", "madarchod", "maderchod", "behenchod",
  "bhenchod", "benchod", "bhnchod", "lawda", "lavda", "loda", "lode",
  "gaandu", "gandu", "chutiye", "chutiyapa", "randi baaz", "jhantu",
  "bakchod", "bakchodi", "chodu", "haramzada", "haramzade", "haramkhor",
];

const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// One alternation over all Hindi terms. Multi-word phrases match joined or
// separated ("behen chod", "behen_chod", "behenchod"). Boundaries are
// letters-only so trailing digits/underscores (usernames) still match.
const hindiPattern = [...new Set(
  [...hindiRomanized, ...EXTRA_TERMS, ...HINDI_DEVANAGARI]
    .map((w) => w.toLowerCase().trim())
    .filter(Boolean)
)]
  .map((w) => w.split(/[\s._-]+/).map(escapeRe).join("[\\s._-]*"))
  .join("|");
const hindiMatcher = new RegExp(`(?<!\\p{L})(?:${hindiPattern})(?!\\p{L})`, "iu");

/** True when any of the given strings contains banned language (EN or HI). */
export function containsProfanity(...parts) {
  for (const part of parts) {
    if (typeof part !== "string" || !part) continue;
    const text = part.normalize("NFKC");
    if (englishMatcher.hasMatch(text) || hindiMatcher.test(text)) return true;
  }
  return false;
}

/** Standard 400 body for rejected content — one shared voice everywhere. */
export function profanityResponse(what = "message") {
  return Response.json(
    { error: `Let's keep the web friendly — your ${what} contains language that isn't allowed here. Please rephrase and try again.`, code: "profanity" },
    { status: 400 }
  );
}
