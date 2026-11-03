// ---------------------------------------------------------------------------
// Visitor language (optional "lang" field on every form)
//
// The site is in sr / en / ru; e-mails to the agency stay Serbian and only
// get a "Jezik posetioca" row so the agent knows how to answer.
// ---------------------------------------------------------------------------

const VISITOR_LANGUAGES: Record<string, string> = {
  sr: "srpski",
  en: "engleski",
  ru: "ruski",
};

export type VisitorLang = "sr" | "en" | "ru";

/**
 * Reads the optional `lang` field. Missing → null; anything other than
 * sr / en / ru → a validation error.
 */
export function parseVisitorLang(
  value: unknown,
  errors: { field: string; message: string }[],
): VisitorLang | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string" && Object.hasOwn(VISITOR_LANGUAGES, value)) return value as VisitorLang;
  errors.push({ field: "lang", message: "Language is not supported." });
  return null;
}

/** "Jezik posetioca" table row for the e-mail, or "" when the language is unknown. */
export function visitorLangRow(lang: VisitorLang | null): string {
  if (!lang) return "";
  return `<tr>
        <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee;">Jezik posetioca</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${VISITOR_LANGUAGES[lang]}</td>
      </tr>`;
}
