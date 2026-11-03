// ---------------------------------------------------------------------------
// Property translations (i18n phase 7)
//
// English / Russian titles and descriptions of the properties, machine
// translated from the agency's Serbian text. Stored in
// server/src/data/translations.json, which is committed to git: during
// development it is filled from Claude Code, in production the translator
// adds new / changed properties (phase 7b).
//
// Each entry remembers a hash of the Serbian title + description it was made
// from. When the agency edits the text, the hash no longer matches and the
// entry is ignored (the site shows the Serbian text) until it is re-translated.
// ---------------------------------------------------------------------------

import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../shared/logger.js";
import type { Property } from "../shared/models.js";

const log = logger.child({ module: "translations" });

// Same location rule as the JSON backup: server/src/data/, from src/ or dist/
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(thisDir, "..", "..", "..");
export const TRANSLATIONS_FILE = path.join(serverRoot, "src", "data", "translations.json");

export type TranslationLang = "en" | "ru";
export const TRANSLATION_LANGS: TranslationLang[] = ["en", "ru"];

export interface TranslatedText {
  title: string;
  description: string | null;
}

export interface TranslationEntry {
  sourceHash: string;
  model: string;
  translatedAt: string; // YYYY-MM-DD
  en: TranslatedText;
  ru: TranslatedText;
}

interface TranslationsFile {
  version: 1;
  items: Record<string, TranslationEntry>;
}

let items: Record<string, TranslationEntry> | null = null;

/** Hash of the Serbian source text a translation was made from. */
export function sourceHash(title: string, description: string | null): string {
  return createHash("sha256").update(`${title}\n\n${description ?? ""}`).digest("hex").slice(0, 16);
}

function isText(value: unknown): value is TranslatedText {
  const v = value as TranslatedText;
  return !!v && typeof v.title === "string" && v.title.length > 0 &&
    (v.description === null || typeof v.description === "string");
}

function isEntry(value: unknown): value is TranslationEntry {
  const v = value as TranslationEntry;
  return !!v && typeof v.sourceHash === "string" && isText(v.en) && isText(v.ru);
}

/**
 * Reads the translations file. A missing file means "no translations yet";
 * a broken file is logged and ignored, and so is any malformed entry.
 */
export function loadTranslations(file: string = TRANSLATIONS_FILE): void {
  items = {};
  if (!existsSync(file)) return;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf-8")) as TranslationsFile;
    let skipped = 0;
    for (const [id, entry] of Object.entries(parsed.items ?? {})) {
      if (isEntry(entry)) items[id] = entry;
      else skipped++;
    }
    log.info({ count: Object.keys(items).length, skipped }, "Translations loaded");
  } catch (err) {
    log.error({ err }, "Translations file is not valid JSON — ignored");
    items = {};
  }
}

function all(): Record<string, TranslationEntry> {
  if (items === null) loadTranslations();
  return items as Record<string, TranslationEntry>;
}

/** The translation of a property, or null when there is none or the Serbian text changed since. */
export function getTranslation(property: Pick<Property, "id" | "title" | "description">): TranslationEntry | null {
  const entry = all()[property.id];
  if (!entry) return null;
  return entry.sourceHash === sourceHash(property.title, property.description) ? entry : null;
}

/** Counts for /api/status. */
export function translationStats(properties: Pick<Property, "id" | "title" | "description">[]): {
  translated: number;
  missing: number;
  outdated: number;
} {
  let translated = 0;
  let outdated = 0;
  for (const p of properties) {
    const entry = all()[p.id];
    if (!entry) continue;
    if (entry.sourceHash === sourceHash(p.title, p.description)) translated++;
    else outdated++;
  }
  return { translated, missing: properties.length - translated - outdated, outdated };
}

/** Tests only: replace the loaded entries. */
export function setTranslationsForTests(entries: Record<string, TranslationEntry>): void {
  items = entries;
}
