# Data Model — Real Estate Website Backend

## 1. Purpose

This document defines the data model for the real estate website backend MVP.

Its purpose is to describe:

- the shape of raw XML data entering the system,
- the normalized internal backend models,
- the agent enrichment model,
- the main form payload models,
- the sync/status model,
- the validation rules that determine whether a property record is accepted into the runtime read model.

This document focuses on **internal backend models** and **data normalization rules**.

It does **not** define final public API request/response contracts in detail. Those belong to `api-contract.md`.

---

## 2. Modeling Principles

The data model is based on the following principles:

1. **XML is the source input, not the public model**
   - the backend should never expose raw XML structure directly to the frontend.

2. **Normalized internal models are the source of application behavior**
   - listing pages,
   - detail pages,
   - filtering,
   - sorting,
   - pagination,
   - agent presentation,
   - inquiry routing.

3. **Only usable properties should enter the runtime read model**
   - incomplete XML records should be rejected early.

4. **Property and agent identity must be stable**
   - property identity comes from XML `property_id`,
   - agent identity comes from XML `id_agent`.

5. **Keep the MVP simple**
   - prefer practical normalized models over heavy abstraction,
   - keep derived fields limited to what is clearly useful.

6. **Allow future extension**
   - the model should remain open for additional property attributes,
   - richer agent profiles,
   - multilingual display labels,
   - extra filters,
   - local enrichment where needed.

---

## 3. Model Layers

The backend data model is split into the following layers:

### 3.1 Raw XML input model

Represents the XML record as it comes from the external feed, after parsing.

Purpose:
- define the backend input shape,
- support explicit mapping from XML to normalized models,
- make XML integration easier to understand and maintain.

### 3.2 Normalized internal domain models

Represents the backend’s internal view of properties, agents, and related entities.

Purpose:
- power listing/detail pages,
- support filtering and sorting,
- support stable API behavior,
- avoid coupling the application to raw XML structure.

### 3.3 Form payload models

Represents validated input for public forms.

Purpose:
- define expected payload intent,
- document required vs optional fields at a high level,
- support contact and inquiry flows.

### 3.4 Operational models

Represents sync and system status data.

Purpose:
- track XML sync health,
- expose service status,
- support observability and debugging.

---

## 4. Raw XML Input Model

## 4.1 RawXmlListing

`RawXmlListing` represents a single parsed property record from the XML export.

This is an input model only. It should not be exposed directly outside the XML ingestion pipeline.

### Core identity and classification fields

- `property_id`
- `property_name`
- `purpose_id`
- `property_type`
- `deleted`

### Location and address fields

- `property_city`
- `property_hood`
- `property_hood_part`
- `property_street`
- `property_street_number`
- `property_flat_number`

### Numeric / structural fields

- `property_price`
- `property_surface`
- `property_land_surface`
- `property_floor`
- `property_floors`
- `property_construction_year`
- `structure`

### Description and media fields

- `property_description`
- `images`
- `video` *(not mapped in MVP)*
- `presentation_3d` *(not mapped in MVP)*

### Attribute / feature fields

- `furnished`
- `heating`
- `equipment`
- `other`

### Agent fields

- `id_agent`
- `agent_email`
- `agent_phone`
- `agent_name`

### Notes

- Repeatable XML values should be normalized into arrays in the parsing/mapping pipeline.
- Empty strings should be treated as missing values where appropriate.
- Raw XML data is considered untrusted input and must be normalized before entering the internal read model.

---

## 5. Normalized Internal Domain Models

## 5.1 Property

`Property` is the main normalized internal model used by the backend.

It represents a valid property record that has passed mapping and validation and is eligible to enter the runtime read model.

### Identity

- `id: string`
  - this is the Relper(XML) `property_id`
  - it is the only property identifier used internally
  - it is treated as the stable unique property ID

- `slug: string`
  - generated from `property_name`
  - used in public URLs together with `id`
  - serves SEO and canonical routing purposes

### Classification

- `transactionType: "sale" | "rent"`
- `propertyTypeKey: string`
- `propertyTypeLabel: string`

### Core display data

- `title: string`
- `description: string | null`

### Location

- `city: string`
- `hood: string | null`
- `hoodPart: string | null`
- `street: string`
- `streetNumber: string| null`
- `flatNumber: string| null`
- `address: string`
- `locationLabel: string`

### Numeric and structural data

- `price: number`
- `surface: number`
- `landSurface: number | null`
- `roomStructure: number | null`
- `floorRaw: string | null`
- `totalFloors: number | null`
- `constructionYear: number | null`

### Furnishing and feature data

- `furnishedKey: string | null`
- `furnishedLabel: string | null`
- `heating: string[]`
- `equipment: string[]`
- `otherFeatures: string[]`

### Derived boolean flags

These are optional normalized helper fields derived from XML feature lists where possible:

- `hasTerrace: boolean`
- `hasElevator: boolean`
- `hasParking: boolean`
- `hasGarage: boolean`
- `isNewConstruction: boolean`

### Registration status

- `registrationStatus: "registered" | "unregisterable" | "in_progress" | null`
  - derived from `<other>` XML values: "Uknjižen" → `registered`, "Neuknjiživ" → `unregisterable`, "U fazi knjiženja" → `in_progress`
  - `null` when no registration status is present in the record

### Media

- `images: PropertyImage[]`
- `primaryImage: PropertyImage | null`
- `videoUrl: string | null` *(not mapped in MVP)*
- `presentation3dUrl: string | null` *(not mapped in MVP)*

### Agent relationship

- `agentId: string`
  - comes from XML `id_agent` (integer value, stored as string internally)

### Source / sync metadata

- `sourceDeletedFlag: boolean`

### Notes

- `Property` is the main internal read model.
- It may contain more fields than the listing endpoint exposes.
- It is valid only if it satisfies the acceptance rules defined later in this document.

---

## 5.2 PropertyImage

`PropertyImage` represents one normalized property image.

### Fields

- `url: string`
- `order: number`

### Notes

- The XML source provides image URLs.
- For MVP, no additional image metadata is required.
- `primaryImage` is derived from the first image in the ordered list.

---

## 5.3 PropertyListItem

`PropertyListItem` is a reduced property projection used for listing pages, cards, related properties, and homepage blocks.

### Typical fields

- `id`
- `slug`
- `url` — canonical frontend relative path, generated by backend using pattern `/nekretnine/:slug-:id`
- `title`
- `transactionType`
- `propertyTypeKey`
- `propertyTypeLabel`
- `city`
- `hood`
- `locationLabel`
- `price`
- `surface`
- `roomStructure`
- `images` — array of `PropertyImage`, supports frontend slider cards
- `primaryImage`
- `highlights` — derived from `<other>` XML elements (curated subset, TBD during implementation)
- `agentId`

### Notes

- This model is intentionally lighter than the full `Property`.
- It contains only the data needed for property card presentation and list-based browsing.
- `url`, `highlights`, and image `alt` text (in the API layer) are derived fields, not stored in the internal model directly.

---

## 5.4 PropertyDetail

`PropertyDetail` is the richer property projection used for the single property page.

### Typical fields

Includes everything needed from `Property`, plus the embedded agent summary.

### Additional fields

- `agentSummary: AgentSummary`

### Notes

- The detail page route uses `slug + id`.
- Backend lookup should resolve primarily by property `id`.
- The slug is used for canonical URL behavior and SEO-friendly routing.
- In the public API, the agent summary uses `agentId` (camelCase), not `id_agent`.

---

## 5.5 Agent

`Agent` is the normalized internal model for an agent.

The core agent relationship is XML-driven, while some additional fields may be enriched locally by the backend.

### Identity

- `id: string`
  - comes from XML `id_agent` (integer value in XML, stored as string internally)
  - this is the primary stable internal agent identifier

- `slug: string`
  - generated from the agent name
  - used in public agent routes

### Core XML-driven fields

- `name: string`
- `email: string | null`
- `phone: string | null`

### Local enrichment fields

These do not come from XML and may be stored/configured internally:

- `imageUrl: string | null`
- `bio: string | null`

### Future optional enrichment

The model should remain open for fields such as:

- display order,
- featured flag,
- social links,
- additional descriptive content.

### Notes

- Agents should be deduplicated by `id_agent`.
- Public agent routes use `slug`.
- Internal lookup may use `id`.

---

## 5.6 AgentSummary

`AgentSummary` is a compact embedded agent object used inside property detail responses and similar projections.

### Typical fields

- `id`
- `slug`
- `name`
- `email`
- `phone`
- `imageUrl`
- `stats` *(optional local enrichment field, e.g. `{ label: "500+ prodatih nekretnina" }`)*

### Notes

- This model exists for frontend convenience.
- It avoids forcing the frontend to separately fetch agent basics for every property detail page.
- `stats` is a local enrichment field, not sourced from XML.

---

## 6. Agent Data Strategy

The backend uses an **XML-driven agent relationship**.

### Core rule

Each property is expected to have an assigned agent in XML through:

- `id_agent`
- `agent_email`
- `agent_phone`
- `agent_name`

### Enrichment rule

Because XML does not currently provide everything needed for ideal agent presentation, the backend may enrich agents locally with additional fields, especially:

- agent image,
- optional bio,
- future presentation metadata.

### Resulting approach

The agent model is:

- **XML-driven for identity and contact basics**
- **internally enriched for presentation-only fields**

This replaces the previous architecture assumption of manual property-to-agent mapping as the primary MVP strategy.

---

## 7. Enum and Value Mapping Strategy

## 7.1 General rule

Where practical, the backend should use:

- **normalized English internal keys**
- while preserving or being able to derive **original display labels**

This keeps the internal model cleaner and more stable for implementation.

---

## 7.2 Transaction type mapping

XML input:
- `purpose_id = 1` → rent
- `purpose_id = 2` → sale

Normalized model:
- `transactionType: "rent" | "sale"`

If the XML value cannot be mapped to a supported transaction type, the property record is invalid and must be rejected.

---

## 7.3 Property type mapping

The backend should normalize XML property type values into internal keys.

Examples:

- apartment
- house
- land
- commercial
- office
- garage
- cottage
- other

The model should also preserve a human-readable label:

- `propertyTypeKey`
- `propertyTypeLabel`

Unknown or unmapped values may fall back to `other` if the record is otherwise usable.

---

## 7.4 Furnished mapping

The backend should normalize furnishing values into a simple internal key where possible, while still supporting a display label.

Examples:
- furnished
- empty
- semi_furnished

If the XML value is not recognized, the backend may keep the label as-is and set the key conservatively or leave it null.

---

## 7.5 Feature lists

The following values should be normalized into string arrays:

- `heating`
- `equipment`
- `other`

General rules:
- trim values,
- remove empty values,
- deduplicate repeated values where practical.

Some common values may also be converted into derived boolean flags for easier frontend and filtering use.

---

## 8. Validation and Record Acceptance Rules

## 8.1 Property acceptance rule

A property record is accepted into the normalized runtime read model only if it has all of the following:

- `property_id`
- valid `transaction_type`
- valid `property_type`
- `title`
- `city`
- `price`
- `surface`
- `id_agent`

If any of these is missing, the property is rejected and not loaded into the public read model.

This rule exists because a property without these fields cannot be presented meaningfully on the website.

Note: `address` is a derived field built from `city` and other location fields during normalization. The validated raw input is `city`, which is already in the required list above.

---

## 8.2 Optional but allowed missing fields

A property may still be accepted if it is missing:

- description,
- images,
- land surface,
- room structure,
- floor,
- total floors,
- construction year,
- video URL,
- 3D presentation URL,
- non-core feature lists.

---

## 8.3 Deleted property rule

If XML marks a property as deleted:

- `deleted = 1`

the record must be excluded from the public runtime read model.

It should not appear in listing, detail, or homepage property responses.

---

## 8.4 Agent requirement rule

For MVP, each property is expected to have an agent in XML.

A property without valid agent identity data should be treated as invalid, because agent assignment is part of the intended business flow of the site.

---

## 8.5 XML parsing normalization rules

Before validation, the XML mapping layer should apply practical normalization rules such as:

- trim strings,
- convert empty strings to null where appropriate,
- parse numeric values into numbers,
- normalize repeatable fields into arrays,
- deduplicate repeated feature values where useful.

---

## 9. Form Payload Models

This document defines the purpose and high-level field expectations for public form payloads.

Precise API request validation details belong in `api-contract.md`.

---

## 9.1 ContactFormPayload

Purpose:
- general inquiry sent to the agency

Main fields:
- `firstName`
- `lastName`
- `phone`
- `email`
- `subject`
- `message`

---

## 9.2 PropertyInquiryPayload

Purpose:
- inquiry sent from the property detail page regarding a specific property

Main fields:
- `propertyId`
- `fullName`
- `phone`
- `email`
- `message`

---

## 9.3 AgentInquiryPayload

Purpose:
- inquiry sent from the single agent page to a specific agent

Main fields:
- `agentId`
- `fullName`
- `phone`
- `message`

Optional fields may be added later if needed.

---

## 9.4 AdvertisePropertyPayload

Purpose:
- lead form for users who want to advertise/sell their property through the agency

The exact frontend structure may evolve, but the payload should clearly represent:
- submitter identity,
- contact information,
- basic property context,
- free-text message.

At minimum, the model should remain open for fields such as:
- `city`
- `hood`
- `address`
- `fullName`
- `phone`
- `heating`
- `email`
- `propertyType`
- `transactionType`
- `surface`
- `price`
- `message`

---

## 10. Operational Model

## 10.1 SyncStatus

`SyncStatus` represents the current XML sync state of the backend.

### Fields

- `status: "ok" | "error"`
- `lastSuccessfulSyncAt: string | null`
- `lastAttemptAt: string | null`
- `loadedPropertiesCount: number`
- `invalidPropertiesCount: number`
- `lastError: string | null`

### Notes

- This model supports the sync status endpoint and basic operational visibility.
- It should reflect the latest known sync outcome.
- A failed sync should not automatically mean there is no usable property data, because the backend may continue serving the last successful cached dataset.

---

## 11. Derived Field Rules

The following derived fields are expected in the normalized model where useful:

- `slug`
- `address`
- `locationLabel`
- `primaryImage`
- feature boolean flags such as:
  - `hasTerrace`
  - `hasElevator`
  - `hasParking`
  - `hasGarage`
  - `isNewConstruction`

These are implementation-support fields intended to simplify frontend use and backend response shaping.

---

## 12. Identity and Routing Rules

## 12.1 Property routes

Public property detail route identity:
- `slug + id`

Internal property lookup:
- primarily by `id`

Meaning:
- the ID is the authoritative lookup key,
- the slug is a public URL/canonical aid.

---

## 12.2 Agent routes

Public agent route identity:
- `slug`

Internal agent lookup:
- may use `id`

Meaning:
- public URLs remain clean,
- backend still retains stable identity through `id_agent`.

---

## 13. Future Extension Points

The data model should remain open for future additions such as:

- richer property feature normalization,
- more precise property-type mapping,
- multilingual labels,
- richer agent profiles,
- local agent presentation metadata,
- additional operational metrics,
- stronger structured form validation metadata.

---

## 14. Summary

The backend data model is built around a clear transformation:

**Raw XML listing → normalized Property / Agent models → listing/detail/API projections**

Key decisions of this model are:

- property identity is Relper(XML) `property_id`,
- agent identity is XML `id_agent`,
- property detail routing uses `slug + id`,
- agent routing uses `slug`,
- only sufficiently complete properties are accepted,
- deleted properties are excluded,
- XML drives core property and agent data,
- local enrichment may supplement agent presentation fields,
- the normalized internal model is the foundation for all backend read behavior.