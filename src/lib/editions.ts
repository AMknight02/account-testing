// Maps user email to their question edition.
// Each user only sees questions from their assigned edition.
const editionMap: Record<string, "her" | "his"> = {
  "jessica.francisco@gmail.com": "her",
  "amastrino02@outlook.com": "his",
};

export function getEditionForEmail(
  email: string | undefined
): "her" | "his" | null {
  if (!email) return null;
  return editionMap[email.toLowerCase()] ?? null;
}
