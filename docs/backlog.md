# Backlog — Real Estate Website Backend

## 1. Purpose

This backlog translates the planning documents into an implementation-ready MVP execution plan.

It is organized into ordered phases so the backend can be built incrementally, with each phase producing a meaningful and verifiable step forward.

The goal of this backlog is to make implementation easier for both the developer and Claude Code by defining:

- the recommended build order,
- the main tasks inside each phase,
- the dependency flow between tasks,
- the expected result of each task,
- the verification criteria for completion.

This backlog is intentionally **MVP-focused** and should be used as the primary implementation roadmap for the backend.

---

## 2. Backlog Structure

The backlog is organized by **phases / milestones**.

Each phase contains implementation tasks with the following structure:

- **Task**
- **Goal**
- **What to implement**
- **Dependencies**
- **Done when**
- **Verification**

The backlog is written to be as directly executable as possible, so that Claude Code or a developer can take one task at a time and implement it with minimal reinterpretation.

---

## 3. Phase 1 — Project Scaffold / App Setup

### Task 1.1 — Initialize backend project structure

**Goal**  
Create the initial backend application structure in the `server/` folder.

**What to implement**
- initialize the Node.js + TypeScript backend project in `server/`,
- install and configure Fastify as the HTTP server,
- create the initial `src/` structure aligned with the planned architecture,
- add the initial project scripts for development, build, and startup,
- prepare the main application entrypoint.

**Dependencies**
- none

**Done when**
- backend project exists in `server/`,
- Fastify app can start,
- folder structure reflects planned module organization,
- basic scripts are available.

**Verification**
- dependency installation completes successfully,
- the Fastify development server starts successfully,
- the TypeScript project compiles without errors,
- the main application entrypoint runs without runtime errors.

---

### Task 1.2 — Create base module structure

**Goal**  
Prepare the internal feature/module layout for future implementation.

**What to implement**
- create the base module directories:
  - `xml-sync`
  - `properties`
  - `agents`
  - `forms`
  - `home`
  - `shared`
- create the supporting `app/`, `config/`, and `data/` directories,
- add only the minimal placeholder files needed to make the structure clear and usable.

**Dependencies**
- Task 1.1

**Done when**
- the module structure reflects the intended architecture at a high level,
- the project is ready for feature-by-feature implementation without structural rework.

**Verification**
- the expected directory structure exists,
- imports resolve cleanly across the initial project structure,
- there are no module resolution or path configuration issues.

---

### Task 1.3 — Set up core developer scripts

**Goal**  
Make the backend easy to run, lint, typecheck, and build from the beginning.

**What to implement**
- `dev` script,
- `build` script,
- `start` script,
- `typecheck` script.

**Dependencies**
- Task 1.1

**Done when**
- the project can be run, typechecked, and built through package scripts,
- the basic local developer workflow is established.

**Verification**
- all declared scripts run successfully,
- typecheck passes,
- build completes successfully.

---

## 4. Phase 2 — Config + Env + Shared Infrastructure

### Task 2.1 — Implement environment-based configuration

**Goal**  
Create a centralized configuration layer for runtime settings.

**What to implement**
- environment variable loading for runtime configuration,
- typed configuration access from one centralized config layer,
- XML feed URL configuration,
- refresh interval configuration,
- CORS-related configuration placeholders for later phases,
- email provider configuration placeholders for later phases,
- runtime environment mode handling.

**Dependencies**
- Phase 1 complete

**Done when**
- runtime configuration is centralized in one place,
- runtime settings are no longer hardcoded across modules,
- required configuration values are validated during application startup.

**Verification**
- the application starts successfully with valid environment values,
- missing or invalid required configuration causes a clear startup failure,
- configuration can be imported from multiple modules through one shared access pattern.

---

### Task 2.2 — Add shared logging foundation

**Goal**  
Introduce a consistent application logging approach.

**What to implement**
- shared logger setup,
- one consistent logger access pattern for modules,
- basic logging conventions for sync operations, form handling, and unexpected errors.

**Dependencies**
- Task 2.1

**Done when**
- modules can write logs through one shared logging mechanism,
- log output is usable for startup visibility, sync tracing, and debugging.

**Verification**
- log output appears during application startup,
- logs can be emitted from both shared and feature modules,
- unexpected errors are logged through the shared logger.

---

### Task 2.3 — Add shared utility foundation

**Goal**  
Prepare common helpers needed across the project.

**What to implement**
- string normalization helpers,
- slug generation helper,
- safe numeric parsing helpers,
- common null/empty normalization helpers,
- optional date/time helpers only if required by upcoming sync or status tasks.

**Dependencies**
- Task 2.1

**Done when**
- shared normalization and parsing logic exists in one reusable location,
- future modules can use common helpers without duplicating utility logic.

**Verification**
- helper functions compile without errors,
- representative input values produce expected normalized outputs,
- utilities are importable from relevant shared and feature modules.

---

## 5. Phase 3 — XML Fetch / Parsing

### Task 3.1 — Implement XML fetch service

**Goal**  
Fetch raw XML safely from the configured external source.

**What to implement**
- HTTP GET request to the configured XML feed,
- timeout handling,
- network error handling,
- fetch service abstraction for XML retrieval.

**Dependencies**
- Phase 2 complete

**Done when**
- backend can request raw XML from the configured URL,
- fetch errors are handled explicitly.

**Verification**
- successful fetch returns raw XML content,
- failed fetch logs a clear error,
- timeout scenarios are handled explicitly,
- provider failure does not crash the application process.

---

### Task 3.2 — Implement XML parsing layer

**Goal**  
Parse raw XML into a usable JavaScript/TypeScript structure.

**What to implement**
- XML parser integration,
- parse service abstraction,
- handling of malformed XML,
- extraction of listing records into a predictable parsed structure.

**Dependencies**
- Task 3.1

**Done when**
- raw XML can be parsed into structured listing records,
- malformed XML results in a controlled failure path instead of an unhandled crash.

**Verification**
- valid XML is parsed successfully,
- malformed XML produces a controlled failure,
- parsed listing records can be inspected during development for debugging.

---

## 6. Phase 4 — Mapping + Normalization + Validation

### Task 4.1 — Define `RawXmlListing` input mapping shape

**Goal**  
Create the internal raw XML input representation used before normalization.

**What to implement**
- raw listing input type/model,
- mapping of parsed XML fields into predictable raw structure,
- normalization of repeatable XML values into arrays where needed.

**Dependencies**
- Phase 3 complete

**Done when**
- parsed XML records are transformed into a consistent raw input model,
- downstream mapping does not depend on parser quirks.

**Verification**
- sample parsed XML listing is mapped into the `RawXmlListing` shape,
- repeatable XML fields are always represented as arrays in the raw model,
- missing or empty XML fields are mapped consistently according to the raw input rules.

---

### Task 4.2 — Implement property normalization mapper

**Goal**  
Map raw XML property data into the normalized internal `Property` model.

**What to implement**
- ID normalization,
- slug generation,
- transaction type mapping,
- property type mapping,
- location/address mapping,
- numeric field parsing,
- media mapping,
- features/equipment mapping,
- derived fields such as `locationLabel` and `primaryImage`.

**Dependencies**
- Task 4.1
- shared utilities from Phase 2

**Done when**
- a raw listing can be transformed into a normalized property object,
- mapping follows `data-model.md`.

**Verification**
- a representative raw listing is mapped into a valid normalized `Property`,
- numeric XML values are parsed into numbers where required by the model,
- derived fields such as `slug`, `locationLabel`, and `primaryImage` are populated correctly.

---

### Task 4.3 — Implement property validation rules

**Goal**  
Reject unusable property records before they enter the runtime read model.

**What to implement**
- validation of required property fields:
  - `property_id`
  - `purpose_id`
  - `property_type`
  - `property_name`
  - `city`
  - `price`
  - `surface`
  - `id_agent`
- deleted record exclusion,
- invalid record reporting.

Note: `address` is a derived field built from `city` and other location fields. The validated raw input is `city`.

**Dependencies**
- Task 4.2

**Done when**
- invalid properties are rejected,
- valid properties are accepted,
- deleted properties are excluded.

**Verification**
- a record missing any required field is skipped,
- a record marked as deleted is excluded from the normalized dataset,
- accepted records satisfy all required validation rules,
- invalid records are reported without breaking processing of valid records.

---

### Task 4.4 — Extract and deduplicate agents from XML

**Goal**  
Build the XML-driven agent model from property records.

**What to implement**
- extraction of agent data from:
  - `id_agent`
  - `agent_email`
  - `agent_phone`
  - `agent_name`
- agent normalization,
- agent deduplication by `id_agent`,
- slug generation for agents.

**Dependencies**
- Task 4.1

**Done when**
- backend can derive a stable agent collection from XML input,
- duplicate agent entries across properties are merged logically.

**Verification**
- repeated `id_agent` values produce one normalized agent,
- agent slug is generated from agent name,
- core agent fields are available for endpoint use.

---

### Task 4.5 — Build normalized dataset assembly

**Goal**  
Assemble the complete normalized dataset from validated properties and derived agents.

**What to implement**
- normalized property collection,
- normalized agent collection,
- property-to-agent relationship via XML `id_agent`,
- final normalized dataset structure ready for in-memory cache storage and downstream read models.

**Dependencies**
- Tasks 4.2, 4.3, 4.4

**Done when**
- one sync run can produce the normalized dataset used by the backend,
- properties and agents are linked correctly.

**Verification**
- dataset contains only validated properties,
- agent collection is deduplicated by `id_agent`,
- property → agent relation is preserved for records with valid agent data,
- properties without valid `id_agent` are excluded from the dataset.

---

## 7. Phase 5 — In-Memory Cache + JSON Fallback

### Task 5.1 — Implement in-memory runtime cache

**Goal**  
Create the primary runtime read layer used by public API requests.

**What to implement**
- in-memory storage for the normalized runtime dataset,
- read access methods for feature modules,
- cache replacement strategy applied only after successful sync completion.

**Dependencies**
- Phase 4 complete

**Done when**
- application can hold the normalized dataset in memory,
- public modules can read from it safely.

**Verification**
- the in-memory cache can be populated with a normalized dataset,
- feature modules can read from the cache through the intended access pattern,
- cache replacement after a successful sync does not require an application restart.

---

### Task 5.2 — Implement JSON backup persistence

**Goal**  
Persist the last successful normalized dataset to disk.

**What to implement**
- JSON serialization of the normalized dataset,
- writing `properties-cache.json`,
- safe overwrite behavior for successful sync outputs,
- file read utility for startup loading.

**Dependencies**
- Task 5.1

**Done when**
- successful sync writes normalized data to disk,
- data can later be reloaded from the backup file.

**Verification**
- the cache file is written after successful normalized dataset creation,
- the file contents are valid JSON,
- the written file can be read back successfully.

---

### Task 5.3 — Implement startup load from JSON backup

**Goal**  
Allow the backend to start with the last known good dataset even if XML is unavailable.

**What to implement**
- load the JSON backup file during application startup,
- initialize the in-memory cache from disk if a valid backup is present,
- controlled fallback behavior if the backup file is missing or invalid.

**Dependencies**
- Task 5.2

**Done when**
- the application can boot using the last valid disk backup,
- XML unavailability at startup does not automatically prevent the backend from serving cached data.

**Verification**
- the application starts using an existing valid JSON backup,
- a missing backup file is handled gracefully,
- an invalid backup file produces a controlled fallback or error path.

---

## 8. Phase 6 — Sync Orchestration / Refresh Job

### Task 6.1 — Implement sync orchestration flow

**Goal**  
Connect fetch, parse, mapping, validation, agent extraction, and cache replacement into one sync pipeline.

**What to implement**
- orchestration service,
- step sequencing:
  - fetch XML
  - parse XML
  - map raw listings
  - validate listings
  - extract / deduplicate agents
  - build normalized dataset
  - persist JSON backup
  - swap in-memory cache
  - update sync status
  - handle partial success / logging

**Dependencies**
- Phases 3, 4, 5 complete

**Done when**
- one sync execution runs the complete ingestion pipeline end-to-end,
- a successful sync updates the runtime dataset only after all required steps complete successfully.

**Verification**
- the sync pipeline completes end-to-end on valid XML,
- a successful sync replaces the in-memory dataset,
- a successful sync writes the JSON backup,
- sync status is updated after pipeline completion.

---

### Task 6.2 — Implement sync status tracking

**Goal**  
Track the outcome of sync attempts in a reusable operational model.

**What to implement**
- `SyncStatus` model support,
- `lastSuccessfulSyncAt`,
- `lastAttemptAt`,
- `loadedPropertiesCount`,
- `invalidPropertiesCount`,
- `lastError`,
- `status`.

**Dependencies**
- Task 6.1

**Done when**
- sync status reflects both the latest sync attempt and the latest successful sync result.

**Verification**
- a successful sync updates counts and timestamps,
- a failed sync updates error information,
- stored status values remain consistent with the latest known sync outcome.

---

### Task 6.3 — Implement partial success handling and logging

**Goal**  
Ensure a few bad XML records do not fail the entire dataset refresh.

**What to implement**
- skip invalid property records,
- continue processing valid records,
- log invalid record issues,
- distinguish total failure from partial success.

**Dependencies**
- Task 6.1

**Done when**
- invalid records are skipped without failing the full sync run,
- valid records still produce a usable normalized dataset.

**Verification**
- mixed valid/invalid input produces usable dataset,
- invalid record count is tracked,
- logs show why records were skipped.

---

### Task 6.4 — Implement periodic refresh job

**Goal**  
Refresh XML data automatically on the configured interval.

**What to implement**
- scheduled sync execution,
- interval-based refresh,
- safe startup sequencing so the refresh job does not interfere with initial application boot behavior.

**Dependencies**
- Task 6.1

**Done when**
- the backend can refresh XML-derived data periodically without manual action.

**Verification**
- scheduled sync triggers at configured interval,
- repeated sync runs do not crash the app,
- cache updates after successful scheduled sync.

---

### Task 6.5 — Implement manual development refresh mechanism

**Goal**  
Provide a development-friendly way to trigger sync manually.

**What to implement**
- a development-only command or protected internal endpoint for manual sync triggering,
- clear restriction so the feature is not exposed as a public production capability.

**Dependencies**
- Task 6.1

**Done when**
- developer can force a sync manually in development.

**Verification**
- the manual trigger starts a sync successfully in development,
- the feature is not unintentionally exposed as a public production endpoint or command.

---

## 9. Phase 7 — Health / Status

### Task 7.1 — Implement health endpoint

**Goal**  
Provide a simple endpoint confirming the service is running.

**What to implement**
- basic health route,
- minimal health response.

**Dependencies**
- Phase 1 complete

**Done when**
- the service exposes a working health endpoint that can be called independently of XML sync state.

**Verification**
- the health endpoint returns a success response,
- the endpoint works even if the XML provider is unavailable,
- the endpoint does not depend on a successful sync to respond.

---

### Task 7.2 — Implement sync status endpoint

**Goal**  
Expose current sync/operational state for observability.

**What to implement**
- route returning the current `SyncStatus`,
- status response shaping for external consumption,
- exposure of only basic safe operational information.

**Dependencies**
- Phase 6 complete

**Done when**
- the sync status endpoint exposes the current known sync state in a stable response shape.

**Verification**
- the endpoint returns the expected sync status fields,
- returned values reflect the latest known sync outcome,
- no unsafe internal-only details are exposed in the response.

---

## 10. Phase 8 — Properties Endpoints

### Task 8.1 — Implement property listing query model

**Goal**  
Support listing filters, sorting, and pagination on the backend.

**What to implement**
- query param parsing,
- supported filters:
  - transaction type
  - property type
  - city
  - hood / location
  - room structure
  - price range
  - area range
- sorting:
  - newest first
  - lowest price first
  - highest price first
- pagination:
  - `page`
  - `pageSize`

**Dependencies**
- Phase 5 complete

**Done when**
- listing query inputs are parsed, normalized, and validated consistently before reaching the listing service.

**Verification**
- valid query combinations are parsed successfully,
- invalid query values are rejected through a controlled validation path,
- sorting and pagination inputs are interpreted consistently.

---

### Task 8.2 — Implement property listing service

**Goal**  
Return filtered and paginated `PropertyListItem` results from the cached dataset.

**What to implement**
- filter application on cached property data,
- sort application,
- pagination application,
- `PropertyListItem` response shaping with pagination metadata,
- API-layer derived fields during response shaping:
  - `url` (from slug + id using frontend route pattern `/nekretnine/:slug-:id`)
  - `alt` on images (from property title)
  - `highlights` (from `otherFeatures` — curated subset TBD)

**Dependencies**
- Task 8.1

**Done when**
- backend can return listing results from cache without live XML parsing.

**Verification**
- listing responses include the expected `PropertyListItem` card fields,
- filtering works on representative cases,
- pagination metadata is correct and consistent with the returned items,
- derived fields (`url`, image `alt`, `highlights`) are populated correctly.

---

### Task 8.3 — Implement property listing endpoint

**Goal**  
Expose public property listing API route.

**What to implement**
- route/controller,
- query request validation,
- response shaping consistent with the property listing use case.

**Dependencies**
- Task 8.2

**Done when**
- frontend can request property listing data from the backend.

**Verification**
- endpoint returns expected list response shape,
- endpoint uses cache-backed data,
- invalid query inputs return consistent errors.

---

### Task 8.4 — Implement property detail service

**Goal**  
Return full property detail data from the cached normalized model.

**What to implement**
- lookup by property `id` from the cached dataset,
- `PropertyDetail` projection,
- embedded `agentSummary` (agent is always present since properties without valid `id_agent` are rejected at sync time),
- API-layer derived fields during response shaping:
  - `url` (from slug + id using frontend route pattern)
  - `alt` on images (from property title)
  - `highlights` (from `otherFeatures`)
  - `registrationStatus` (already in internal model)

**Dependencies**
- Phase 5 complete
- agent extraction from Phase 4 complete

**Done when**
- the backend can return a single normalized `PropertyDetail` record from cache,
- agent summary data is always included (local enrichment fields like photo/bio are optional).

**Verification**
- a valid property ID returns detail data,
- the response contains the expected `PropertyDetail` fields,
- embedded agent summary is always present with XML-sourced fields,
- local enrichment fields (photo, bio, stats) are included when configured.

---

### Task 8.5 — Implement property detail endpoint

**Goal**  
Expose public property detail API route using `slug + id`.

**What to implement**
- route/controller,
- slug + id route support,
- canonical slug handling strategy.

**Dependencies**
- Task 8.4

**Done when**
- the frontend can request single property detail pages via a stable `slug + id` route identity,
- property resolution is based on ID while slug is treated as the SEO/canonical route component.

**Verification**
- the route resolves the property by ID,
- slug behavior is handled consistently according to the canonical route strategy,
- a nonexistent property returns the appropriate error response.

---

### Task 8.6 — Implement related properties logic

**Goal**  
Support related properties on the property detail page as part of MVP.

**What to implement**
- deterministic related property selection rules based on available property attributes,
- related property projection using list/card-friendly data,
- integration into the property detail flow or a companion response structure.

**Dependencies**
- Task 8.4

**Done when**
- the property detail feature returns related properties as part of the MVP detail experience.

**Verification**
- related properties are returned for eligible records,
- the current property is excluded from the related results,
- related results use a listing-friendly response shape.

---

## 11. Phase 9 — Agents Endpoints

### Task 9.1 — Implement agent read service

**Goal**  
Provide access to normalized agents derived from XML.

**What to implement**
- agent collection read service backed by cached normalized data,
- internal lookup by agent `id`,
- public lookup by agent `slug`,
- aggregation of properties assigned to each agent.

**Dependencies**
- Phase 4 complete
- Phase 5 complete

**Done when**
- backend can read agents and their associated properties from cached normalized data.

**Verification**
- agents can be listed from cached normalized data,
- an agent can be resolved by slug,
- associated properties can be retrieved for a resolved agent.

---

### Task 9.2 — Implement agent local enrichment layer

**Goal**  
Support internally managed agent fields not provided by XML.

**What to implement**
- local enrichment storage/config keyed by agent `id`,
- merge of XML-driven agent data with local enrichment fields,
- support for at least agent image,
- optional support for bio and future presentation fields.

**Dependencies**
- Task 9.1

**Done when**
- agent data can be enriched locally without changing or breaking XML-driven agent identity.

**Verification**
- local agent image data is merged correctly,
- the agent remains identifiable by XML `id_agent`,
- missing local enrichment data does not break agent endpoint responses.

---

### Task 9.3 — Implement agents list endpoint

**Goal**  
Expose public agents listing API route.

**What to implement**
- route/controller,
- agents list response shaping,
- enriched agent output where local enrichment data is available.

**Dependencies**
- Tasks 9.1, 9.2

**Done when**
- frontend can request the agents page data from backend.

**Verification**
- the endpoint returns normalized agents,
- enrichment fields appear when configured,
- the response shape is stable and usable for the agents page.

---

### Task 9.4 — Implement single agent endpoint

**Goal**  
Expose public single-agent page data.

**What to implement**
- route/controller using agent slug as the public route identity,
- agent detail response,
- associated properties list.

**Dependencies**
- Tasks 9.1, 9.2

**Done when**
- the frontend can request single-agent page data including the agent’s associated properties.

**Verification**
- the route resolves the agent by slug,
- the response contains agent data and associated properties,
- a nonexistent slug returns the appropriate error response.

---

## 12. Phase 10 — Home Endpoint

### Task 10.1 — Implement home aggregation service

**Goal**  
Prepare aggregated homepage data from cached normalized data as a single backend-assembled home response.

**What to implement**
- featured properties selection strategy,
- team preview data from cached agent data,
- minimal homepage aggregates required for the MVP home response.

**Dependencies**
- properties read flow available,
- agents read flow available

**Done when**
- backend can assemble homepage data from cached data without frontend combining multiple backend responses,
- home aggregation service returns one home response object intended for homepage rendering.

**Verification**
- service returns one stable homepage aggregation shape,
- featured properties selection is defined and implemented in the backend service,
- team preview and homepage aggregates are built from cached data,
- output is built from cached data only.

---

### Task 10.2 — Implement home endpoint

**Goal**  
Expose public homepage aggregation API route.

**What to implement**
- route/controller,
- integration with the home aggregation service,
- response shaping for the homepage use case.

**Dependencies**
- Task 10.1

**Done when**
- frontend can request homepage data from one endpoint,
- endpoint returns backend-assembled homepage response.

**Verification**
- endpoint returns the homepage aggregation produced by the home service,
- response shape matches the intended homepage response contract,
- endpoint does not require frontend-side assembly of featured properties, team preview, or homepage aggregates.

---

## 13. Phase 11 — Forms + Email

### Task 11.1 — Implement shared email service

**Goal**  
Create a reusable email sending and composition layer for all public form flows.

**What to implement**
- email provider integration,
- shared send function,
- shared email composition pattern,
- clear email send result/error handling.

**Dependencies**
- Phase 2 complete

**Done when**
- form flows can send emails through one shared service without duplicating provider-specific logic.

**Verification**
- email service can be invoked from form flows successfully,
- send failures are surfaced and logged clearly,
- form-specific handlers do not implement separate provider integration logic.

---

### Task 11.2 — Implement contact form payload validation and endpoint

**Goal**  
Support the general agency contact form.

**What to implement**
- payload validation,
- input sanitization,
- email composition using the shared email service,
- route/controller.

**Dependencies**
- Task 11.1

**Done when**
- contact form can be submitted to the backend and processed through the shared email flow.

**Verification**
- valid payload sends contact email,
- invalid payload is rejected,
- response indicates success/failure consistently,
- endpoint does not persist contact submissions to a database.

---

### Task 11.3 — Implement property inquiry form payload validation and endpoint

**Goal**  
Support inquiries from the property detail page.

**What to implement**
- property-aware payload validation,
- property reference lookup handling,
- inquiry email composition using property and agent context,
- route/controller.

**Dependencies**
- Task 11.1
- property and agent read flows available

**Done when**
- property inquiry can be submitted through the backend and routed using the property-agent relationship when available.

**Verification**
- valid payload sends inquiry email,
- property reference is resolved correctly,
- assigned agent is resolved correctly when agent data is available,
- invalid property reference is handled safely.

---

### Task 11.4 — Implement agent inquiry form payload validation and endpoint

**Goal**  
Support inquiries from the single-agent page.

**What to implement**
- agent-aware payload validation,
- agent reference lookup handling,
- email composition to the selected agent,
- route/controller.

**Dependencies**
- Task 11.1
- agents flow available

**Done when**
- users can contact a specific agent through backend form handling.

**Verification**
- valid payload sends email to the correct agent,
- agent reference is resolved correctly,
- invalid agent reference is rejected cleanly.

---

### Task 11.5 — Implement advertise property form payload validation and endpoint

**Goal**  
Support lead submission for users who want to advertise/sell property through the agency.

**What to implement**
- payload validation,
- input sanitization,
- email composition to agency using the shared email service,
- route/controller.

**Dependencies**
- Task 11.1

**Done when**
- advertise-property form can be submitted to the backend and forwarded by email.

**Verification**
- valid payload sends email,
- invalid payload is rejected,
- response indicates success/failure consistently,
- no CRM/database write is performed.

---

## 14. Phase 12 — Polishing / Hardening / Docs

### Task 12.1 — Add rate limiting to public-sensitive endpoints

**Goal**  
Reduce abuse risk for forms and selected public-facing endpoints.

**What to implement**
- rate limiting strategy for selected endpoints,
- stricter protection for form endpoints,
- configurable limits.

**Dependencies**
- forms endpoints implemented

**Done when**
- selected sensitive endpoints are protected by rate limiting,
- form endpoints have stricter limits than general public read endpoints if both are covered.

**Verification**
- repeated requests hit configured limits,
- protected endpoints return consistent limit-reached behavior,
- legitimate requests still pass normally within configured limits.

---

### Task 12.2 — Add honeypot support for forms

**Goal**  
Introduce lightweight anti-spam protection for public forms.

**What to implement**
- honeypot field support,
- backend handling logic,
- rejection and logging behavior.

**Dependencies**
- forms endpoints implemented

**Done when**
- forms can detect and reject simple bot-like submissions using honeypot validation.

**Verification**
- honeypot-filled submission is rejected,
- normal submission still succeeds,
- honeypot rejection behavior is consistent across protected form endpoints.

---

### Task 12.3 — Add CORS configuration

**Goal**  
Control allowed frontend origins safely.

**What to implement**
- configurable CORS policy,
- environment-based allowed origins,
- sensible defaults per environment.

**Dependencies**
- Phase 2 config complete

**Done when**
- backend enforces defined CORS behavior for configured origins.

**Verification**
- allowed origin works as expected,
- disallowed origin is rejected according to configured CORS policy.

---

### Task 12.4 — Harden input validation and error responses

**Goal**  
Improve consistency and safety of public API and form handling.

**What to implement**
- stronger validation review across public endpoints,
- consistent error response structure,
- careful sanitization of user-submitted inputs,
- review of sensitive logging behavior.

**Dependencies**
- public endpoints implemented

**Done when**
- API and forms handle invalid input consistently and safely,
- validation and error behavior are aligned across public routes.

**Verification**
- invalid input produces consistent response structure across public endpoints,
- sensitive form content is not over-logged,
- validation behavior is stricter and more consistent than before the hardening pass.

---

### Task 12.5 — Manual testing against real XML feed

**Goal**  
Validate the full backend behavior against the real provider feed before MVP finalization.

**What to implement**
- manual validation pass using the real XML feed,
- inspection of mapping results,
- inspection of invalid record handling,
- inspection of agent extraction,
- endpoint smoke testing against loaded cached data.

**Dependencies**
- Phases 3–11 substantially complete

**Done when**
- real-world sync behavior and core read endpoints are manually checked against actual provider data.

**Verification**
- real XML sync succeeds or fails in a controlled way,
- usable properties are loaded into cache,
- invalid records are skipped without breaking the whole sync,
- agents are extracted correctly from XML agent fields,
- core endpoints return expected data from the loaded dataset.

---

### Task 12.6 — Final implementation documentation pass

**Goal**  
Leave the backend in a maintainable and understandable MVP-ready state.

**What to implement**
- update setup notes where needed,
- ensure docs reflect final implementation decisions,
- align `CLAUDE.md` workflow guidance with the implemented codebase.

**Dependencies**
- implementation phases complete

**Done when**
- backend setup, workflow, and key implementation decisions are documented clearly enough for continuation and maintenance.

**Verification**
- docs match actual project structure and behavior,
- setup instructions are usable,
- Claude-oriented guidance remains consistent with the codebase and current workflow.
---

## 15. Out of MVP / Later

The following items are intentionally outside the initial MVP backlog but are possible future extensions:

- multilingual support,
- richer local agent enrichment,
- richer homepage aggregation blocks,
- stronger feature normalization,
- advanced anti-spam protections,
- more advanced caching strategies,
- optional local metadata storage,
- more advanced email formatting,
- future admin-oriented or CMS-like capabilities if ever needed.

---

## 16. Summary

This backlog is designed to support a practical MVP build order:

1. establish the application foundation,
2. build the XML ingestion pipeline,
3. build stable normalized runtime data,
4. expose read APIs,
5. support lead-generation forms,
6. harden and verify the system.

The most important implementation rule behind this backlog is:

**first build the data pipeline and runtime model correctly, then build public API behavior on top of that stable foundation.**