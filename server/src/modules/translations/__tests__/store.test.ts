import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  sourceHash,
  getTranslation,
  translationStats,
  loadTranslations,
  setTranslationsForTests,
  type TranslationEntry,
} from "../store.js";
import { replaceDataset } from "../../shared/cache.js";
import { makeProperty, makeAgent, makeDataset } from "../../properties/__tests__/fixtures.js";
import { toListItem, getPropertyDetail } from "../../properties/service.js";

function entryFor(title: string, description: string | null): TranslationEntry {
  return {
    sourceHash: sourceHash(title, description),
    model: "claude-opus-5-5",
    translatedAt: "2026-11-03",
    en: { title: "BEOGRAD, VRAČAR, THREE-ROOM APARTMENT", description: "A nice apartment." },
    ru: { title: "BEOGRAD, VRAČAR, ТРЁХКОМНАТНАЯ КВАРТИРА", description: "Хорошая квартира." },
  };
}

const tmp = mkdtempSync(path.join(tmpdir(), "pv-translations-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe("translations store", () => {
  const property = makeProperty();

  beforeEach(() => {
    setTranslationsForTests({ [property.id]: entryFor(property.title, property.description) });
  });

  it("returns the translation while the Serbian text is unchanged", () => {
    expect(getTranslation(property)!.en.title).toBe("BEOGRAD, VRAČAR, THREE-ROOM APARTMENT");
  });

  it("ignores it once the agency edits the title or the description", () => {
    expect(getTranslation({ ...property, description: property.description + " Novo." })).toBeNull();
    expect(getTranslation({ ...property, title: "Drugi naslov" })).toBeNull();
    expect(getTranslation({ ...property, id: "999" })).toBeNull();
  });

  it("counts translated / missing / outdated for /api/status", () => {
    const stats = translationStats([
      property,
      { ...property, id: "200" },
      { ...property, description: "izmenjen opis" },
    ]);
    expect(stats).toEqual({ translated: 1, missing: 1, outdated: 1 });
  });

  it("loads a file, skips malformed entries, survives a broken or missing file", () => {
    const file = path.join(tmp, "translations.json");
    writeFileSync(file, JSON.stringify({
      version: 1,
      items: {
        [property.id]: entryFor(property.title, property.description),
        broken: { sourceHash: "x", en: { title: "" }, ru: null },
      },
    }));
    loadTranslations(file);
    expect(getTranslation(property)).not.toBeNull();
    expect(translationStats([{ ...property, id: "broken" }]).translated).toBe(0);

    writeFileSync(file, "{ not json");
    loadTranslations(file);
    expect(getTranslation(property)).toBeNull();

    loadTranslations(path.join(tmp, "missing.json"));
    expect(getTranslation(property)).toBeNull();
  });
});

describe("translations in the public API", () => {
  const property = makeProperty();

  beforeEach(() => {
    replaceDataset(makeDataset([property], [makeAgent({ id: "42" })]));
    setTranslationsForTests({ [property.id]: entryFor(property.title, property.description) });
  });

  it("list items carry the translated titles only", () => {
    expect(toListItem(property).translations).toEqual({
      en: { title: "BEOGRAD, VRAČAR, THREE-ROOM APARTMENT" },
      ru: { title: "BEOGRAD, VRAČAR, ТРЁХКОМНАТНАЯ КВАРТИРА" },
    });
  });

  it("the detail carries title + description", () => {
    expect(getPropertyDetail(property.id)!.translations!.ru).toEqual({
      title: "BEOGRAD, VRAČAR, ТРЁХКОМНАТНАЯ КВАРТИРА",
      description: "Хорошая квартира.",
    });
  });

  it("is null when there is no translation", () => {
    setTranslationsForTests({});
    expect(toListItem(property).translations).toBeNull();
    expect(getPropertyDetail(property.id)!.translations).toBeNull();
  });
});
