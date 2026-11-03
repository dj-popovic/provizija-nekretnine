# Translation instructions v2 — ProVizija Nekretnine (real-estate agency, Novi Sad, Serbia)

You translate property listings written by the agency's agents in Serbian (Latin script) for the agency's website: the **title** and the **description** of every listing, into English (`en`) and Russian (`ru`).

## Rules

1. **Cities, districts / neighbourhoods, villages, streets, squares and other named local places stay exactly as written**, in the original Latin spelling — also in the Russian text (no transliteration, no Cyrillic): "Novi Sad", "Grbavica", "Sremska Kamenica", "Bulevar Evrope", "Voganj", "Kej", "Najlon pijaca". Keep the Russian grammar around them correct ("в районе Grbavica", "рядом с рынком Najlon pijaca"). You may add a short generic word so a foreigner understands what the place is ("the Kej riverside promenade", "набережная Kej").
2. **Other geography uses its standard name in the target language**: rivers, mountains, landmarks — e.g. Dunav → the Danube / Дунай, Fruška gora → Fruška Gora / Фрушка-Гора, Petrovaradinska tvrđava → Petrovaradin Fortress / Петроварадинская крепость, Srbija → Serbia / Сербия.
3. **Titles are ALL CAPS**, like the agency's own titles. Keep the original order: places first, then the property, then the area. Example: "RUMA, VOGANJ, PORODIČNA KUĆA - RANČ 196 M2" → en "RUMA, VOGANJ, FAMILY HOUSE – RANCH, 196 M²", ru "RUMA, VOGANJ, СЕМЕЙНЫЙ ДОМ – РАНЧО, 196 М²". Write the area unit as "M²" / "М²" in titles.
4. **In the description, lines that the agent wrote in ALL CAPS are written in normal sentence case** (a heading stays a heading, just not shouted). Only the title is all caps.
5. **Numbers never change**: prices, areas, years, floor numbers, distances, phone numbers, licence and register numbers, percentages. Write areas as m² (en) / м² (ru). Keep "€".
6. **Don't add or drop information**, don't summarize, don't "improve" the sales pitch. Keep the paragraph breaks, lists and structure of the original exactly (same line breaks). Fix obvious typos silently by translating the intended meaning.
7. Natural, professional real-estate tone in the target language — how a good local agency would write it, not word-for-word. English: British or American spelling, but consistent within a listing.
8. Serbian conventions:
   - Floors: Serbian numbering stays (3. sprat = "3rd floor" / "3-й этаж"). "Prizemlje" = "ground floor" / "партер". "Visoko prizemlje" = "raised ground floor" / "высокий партер". "Potkrovlje" = "attic floor" / "мансарда".
   - Rooms: "jednoiposoban / dvosoban / trosoban / četvorosoban" = one-and-a-half-room / two-room / three-room / four-room apartment; "garsonjera" = studio.
   - "ar" (land area) = "ares" / "сот." (1 ar = 100 m²).
   - "Uknjižen", "uknjižba 1/1" = registered in the land registry, full (1/1) ownership.
   - Heating: CG = central (district) heating, EG / etažno = individual central heating, TA peć = storage heater.
   - "Lođa" = loggia, "salonac / salonski stan" = salon-style apartment (large rooms, high ceilings, typically an older building).
   - "Može na kredit / stambeni kredit" = mortgage eligible / возможна покупка в ипотеку. "Odmah useljiv" = ready to move in.
   - "Salaš" = a traditional Vojvodina farmstead (en "salaš farmstead", ru "салаш (хутор)").
9. Agent names and the agency name ("PRO-VIZIJA NEKRETNINE", "ProVizija") stay as written.
10. A listing with an empty description: translate only the title, `"description": null`.

## Output

One JSON file (UTF-8) with exactly this shape, every input listing present, in input order:

```json
{
  "listings": [
    { "id": "606", "en": { "title": "…", "description": "…" }, "ru": { "title": "…", "description": "…" } }
  ]
}
```

Use `\n` for line breaks inside the strings, exactly where the original has them.
