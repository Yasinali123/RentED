/**
 * Frontend Content moderation utility to detect inappropriate, sexual, abusive,
 * offensive, or completely irrelevant words in RentED Demand Assistant queries.
 */

const INAPPROPRIATE_PATTERNS = [
  // Explicit & Sexual terms
  /\b(sex|sexual|porn|porno|adult|nude|nudity|erotic|xxx|boobs|penis|vagina|dildo|orgasm|hentai|intercourse|sexy|condom|fetish|strip|blowjob|anal|masturbat|masturbation)\b/i,
  /\b(fuck|fucking|fucker|bitch|shit|asshole|bastard|dick|cunt|pussy|slut|whore|cock|motherfucker|douchebag|bullshit|prick|twat)\b/i,
  // Abusive & Hate speech / Slurs / Violence
  /\b(nigger|nigga|chink|faggot|retard|idiot|stupid|kill|murder|suicide|rape|raper|rapist|abusive|abuse|harass|harassment|hate)\b/i,
  // Drugs & Illegal Weapons
  /\b(weed|marijuana|cocaine|heroin|meth|ecstasy|contraband|gun|pistol|weapon|bomb|explosive|ammo|ammunition|drug|drugs|narcotic)\b/i,
];

const IRRELEVANT_PATTERNS = [
  /\b(who are you|what is your name|tell me a joke|weather|sing a song|code for me|write a story|how are you|hello bot|hi bot|who made you|what can you do)\b/i,
];

export const validateContent = (text) => {
  if (!text || typeof text !== "string") {
    return { isValid: false, reason: "Please enter a valid item name." };
  }

  const trimmed = text.trim();

  if (trimmed.length < 2) {
    return { isValid: false, reason: "Search term is too short." };
  }

  if (trimmed.length > 200) {
    return { isValid: false, reason: "Search term is too long." };
  }

  for (const pattern of INAPPROPRIATE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        reason: "Inappropriate, abusive, explicit, or offensive terms are strictly prohibited on RentED.",
      };
    }
  }

  for (const pattern of IRRELEVANT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        reason: "RentED Demand Assistant is dedicated to campus items & student resources (e.g. textbooks, calculators, lab gear, rooms). Please enter an item you need.",
      };
    }
  }

  return { isValid: true, reason: null };
};
