/**
 * Utility function to normalize item names for matching.
 * Examples:
 * "Engineering Mathematics 2" -> "engineering math 2"
 * "Engineering Mathematics-II" -> "engineering math 2"
 * "Scientific Calculator casio fx-991es" -> "casio fx 991es scientific calculator"
 */
export const normalizeItemName = (str) => {
  if (!str) return "";

  let clean = str.toString().toLowerCase().trim();

  // Replace common Roman numerals with Arabic numerals
  clean = clean.replace(/\bmaths?\b/g, "math");
  clean = clean.replace(/\bmathematics\b/g, "math");
  clean = clean.replace(/\bii\b/g, "2");
  clean = clean.replace(/\b2nd\b/g, "2");
  clean = clean.replace(/\biii\b/g, "3");
  clean = clean.replace(/\b3rd\b/g, "3");
  clean = clean.replace(/\biv\b/g, "4");
  clean = clean.replace(/\b4th\b/g, "4");
  clean = clean.replace(/\b1st\b/g, "1");
  clean = clean.replace(/\bcalc\b/g, "calculator");
  clean = clean.replace(/\blab\b/g, "equipment");

  // Remove punctuation and special characters
  clean = clean.replace(/[^a-z0-9\s]/g, " ");

  // Trim multiple spaces into single space
  clean = clean.replace(/\s+/g, " ").trim();

  return clean;
};
