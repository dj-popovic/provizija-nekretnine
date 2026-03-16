# Architecture — Real Estate Website Backend

## 1. Purpose

This document defines the backend architecture for the real estate website MVP.

The goal of this architecture is to keep the system:
- simple to build,
- easy to maintain,
- fast in runtime,
- SEO-friendly through stable and clean API responses,
- flexible enough for future extensions without overengineering the MVP.

This backend is built for a public-facing real estate website where:
- property data comes from an external XML feed,
- the frontend is already mostly built,
- there is no user login,
- there is no internal admin panel in this project,
- the backend is responsible for property data delivery, inquiry handling, and email sending.

---

## 2. Architecture Principles

The architecture is based on the following principles:

1. **Keep the MVP simple**
   - avoid unnecessary infrastructure,
   - avoid microservices,
   - avoid a full business database for property data.

2. **Use one backend service**
   - one API application is enough for the current scope,
   - easier development, debugging, and deployment.

3. **Separate concerns clearly**
   - XML ingestion,
   - normalized property read model,
   - public API,
   - form handling and email delivery,
   - agent configuration,
   - shared config, validation, and logging.

4. **Optimize for read performance**
   - property pages and listing pages must be fast,
   - the site should not depend on live XML fetches during normal user requests.

5. **Prefer resilience over strict real-time behavior**
   - if the XML provider is temporarily unavailable, the website should still serve the last successfully loaded property data.

---

## 3. High-Level Architecture

The system will use a **monorepo-style structure** with separate frontend and backend folders:

- `client/` → frontend application
- `server/` → backend application

The backend will be a **single REST API service** built with:
- Node.js
- TypeScript
- Fastify

At a high level, the backend is responsible for:

1. fetching the XML feed from the external provider,
2. parsing and normalizing XML property data,
3. storing a runtime read model in memory,
4. keeping a JSON backup of the last successful sync on disk,
5. exposing public API endpoints to the frontend,
6. handling inquiry/contact forms,
7. sending emails to the agency or assigned agents,
8. exposing basic health and sync status endpoints.

---

## 4. System Boundaries

### 4.1 What this backend does

This backend is responsible for:
- property data ingestion from XML,
- property listing and detail API responses,
- home page aggregated public data,
- agent-related public data derived from XML and optionally enriched locally,
- form processing,
- email sending,
- basic health and sync observability.

### 4.2 What this backend does not do
This backend does **not**:
- manage listings as the source of truth,
- write data back to the Relper system,
- provide admin functionality,
- provide user authentication,
- act as a CMS,
- rely on live XML reads during every public request.

### 4.3 External systems
The architecture depends on the following external systems:

1. **Relper XML feed**
   - external source of property data,
   - accessed through HTTP GET,
   - used as the primary source of truth for listing data.

2. **Email delivery provider**
   - used to send inquiry and contact emails,
   - exact provider will be chosen later.

3. **Frontend application**
   - consumes the backend API,
   - renders public-facing pages.

---

## 5. Runtime Model

### 5.1 Public request flow
Normal public website requests should work like this:

1. frontend calls backend API,
2. backend reads already-prepared property data from in-memory cache,
3. backend applies filtering, pagination, and response shaping,
4. backend returns a clean JSON response.

This means public requests do **not** fetch or parse XML in real time.

### 5.2 XML refresh flow
Property data should be refreshed through a separate sync flow:

1. backend fetches XML from the configured URL,
2. XML is parsed,
3. raw XML data is mapped into an internal normalized property model,
4. invalid/problematic entries are skipped and logged,
5. valid entries replace the current in-memory read model,
6. the last successful normalized dataset is written to a JSON file on disk.

### 5.3 Startup behavior
When the backend starts:

1. it should try to load the latest valid JSON backup from disk,
2. it should initialize the in-memory cache from that file if available,
3. it may then run a sync attempt against the XML source,
4. if XML sync fails, the application should continue serving the last valid cached data.

This allows the site to remain usable even if the XML provider is temporarily unavailable.

---

## 6. Data Strategy

### 6.1 Source of truth
The source of truth for property data is the external XML feed.

The local backend does **not** own property data as a business database.

### 6.2 Local data model strategy
Even though the backend does not use a primary property database, it still needs a local technical read layer.

The architecture will use:

- **in-memory cache** as the primary runtime read model,
- **JSON file backup on disk** as persistence for the last successful sync.

This gives the backend:
- fast reads,
- resilience across restarts,
- reduced XML dependency during public traffic,
- simple implementation for the MVP.

### 6.3 Why not live XML reads
Live XML reads on every request are avoided because they would:
- slow down public pages,
- make the site dependent on XML provider availability,
- complicate filtering and pagination,
- weaken performance and SEO-related response quality.

---

## 7. Property Data Pipeline

The XML integration should be implemented as a clear pipeline.

### 7.1 XML fetch layer
Responsibilities:
- perform HTTP request to XML URL,
- handle timeouts/network failures,
- return raw XML content.

### 7.2 XML parser layer
Responsibilities:
- parse XML into a usable JavaScript/TypeScript structure,
- handle malformed XML safely,
- provide structured raw records.

### 7.3 Mapping / normalization layer
Responsibilities:
- transform XML records into an internal normalized property model,
- normalize field names and value types,
- convert optional/missing values safely,
- normalize images and media fields,
- prepare property records for listing/detail endpoints.

### 7.4 Validation layer
Responsibilities:
- validate the minimum fields needed for a usable property record,
- reject clearly broken records,
- keep validation practical and lightweight for MVP.

### 7.5 Sync result handling
If some properties are invalid:
- skip problematic properties,
- log the issue,
- continue sync with valid records,
- treat the sync as partial success if appropriate.

This avoids full feed failure because of a few bad records.

---

## 8. Internal Domain Model

The architecture should use an internal normalized model instead of exposing raw XML structure directly.

### 8.1 Property model

The internal property model should include, at minimum:
- external property ID,
- title,
- slug,
- transaction type,
- property type,
- location fields,
- room structure / room count,
- area,
- price,
- description,
- images,
- optional attributes/features,
- agent assignment from XML,
- any fields needed for listing and detail views.

### 8.2 Listing view model
The listing response should expose only what is needed for property cards and filters.

### 8.3 Detail view model
The detail response can expose the richer set of fields needed for the property page.

This separation keeps API responses cleaner and avoids coupling the frontend directly to raw XML.

---

## 9. Agent Architecture

Agent data is primarily **XML-driven** for the MVP.

The XML export now provides agent-related fields directly on each property record, including:
- `id_agent`
- `agent_email`
- `agent_phone`
- `agent_name`

Because of that, the primary property-to-agent relationship should be derived from XML data.

### 9.1 Agent data source

The backend should derive core agent data from the XML feed by collecting and deduplicating agent information from property records.

The XML-driven agent model should include at minimum:
- agent ID,
- name,
- email,
- phone.

### 9.2 Local enrichment layer

Although core agent identity and contact data come from XML, the backend may still use a small local enrichment layer for presentation-specific fields that are not provided by the XML feed.

Examples:
- agent image,
- agent bio,
- optional display order,
- optional future presentation metadata.

This local enrichment layer is supplementary and does not replace XML as the primary source of the agent relationship.

### 9.3 Property-to-agent relationship

The relationship between properties and agents should be taken directly from XML through `id_agent`.

This means:
- each property is assigned to an agent from the XML feed,
- backend lookup and aggregation can use `id_agent` as the stable internal agent identifier,

### 9.4 Agent pages

The backend should support:
- agents list page,
- single agent page,
- property list for each agent based on XML-derived agent assignment.

Public agent routes should still use a slug, while internal lookup may use the stable XML agent ID.

---

## 10. API Architecture

The backend will expose a **REST API**.

The exact endpoint list will be finalized in `api-contract.md`, but the architecture expects the API to be organized around features such as:

- properties
- home
- agents
- forms / inquiries
- health / status

### 10.1 Recommended API responsibilities
The backend should support API groups such as:

- property listing
- property detail
- home page aggregated data
- agents list
- single agent page data
- contact form submission
- property inquiry submission
- agent inquiry submission
- advertise-your-property form submission
- health endpoint
- sync status endpoint

### 10.2 Route identity strategy
Recommended public route identity patterns:

- property detail: **slug + external property ID**
- agent detail: **slug**

This gives:
- cleaner URLs,
- stable lookup,
- better SEO structure,
- lower ambiguity.

---

## 11. Filtering, Sorting, and Pagination

Filtering, sorting, and pagination should be handled entirely on the backend.

### 11.1 Filtering
The backend should support, at minimum:
- property type,
- location,
- room structure / room count,
- price range,
- area range.

The filtering system should be designed so additional filters can be added later without major refactoring.

### 11.2 Sorting
Sorting is also a backend responsibility.

Initial planned sorting options:
- newest first,
- lowest price first,
- highest price first.

### 11.3 Pagination
Pagination should use a standard model:
- `page`
- `pageSize`

This is simple and fully adequate for the MVP.

---

## 12. Home Page Aggregation

The home page should have a dedicated backend endpoint for aggregated public data.

This endpoint may include:
- featured properties,
- team preview,
- counters,
- or other homepage blocks needed by the frontend.

The exact payload shape will be defined later in the API contract, but the architecture should treat the home page as a separate read use case rather than forcing the frontend to assemble it from many small requests.

---

## 13. Forms and Email Flow

All public forms should go through the backend API.

### 13.1 Supported form types
The backend should handle:
- general contact form,
- property inquiry form,
- agent inquiry form,
- advertise-your-property form.

### 13.2 Form processing pipeline
For all forms, the processing pattern should be:

1. validate input,
2. sanitize input,
3. build email message,
4. send email,
5. return success or failure response.

### 13.3 Email composition
For the MVP, the backend does not need a full email templating system.

A simple composition layer is enough:
- generate readable email content,
- optionally support simple HTML formatting,
- keep implementation small and maintainable.

### 13.4 Delivery model
For the MVP, email sending will happen directly in the request-response flow.

This keeps the system simpler.

A future async/queue-based approach may be added later if necessary, but it is not part of the initial architecture.

---

## 14. Validation and Error Handling

The architecture should include lightweight but clear validation.

### 14.1 Validation targets
Validation should exist for:
- query parameters,
- form payloads,
- XML-mapped property records.

### 14.2 Error response structure
API errors should use a simple standardized format so frontend integration and debugging are easier.

The format does not need to be overly complex, but it should be consistent.

### 14.3 XML failure handling
If XML fetch or parse fails:
- keep the last successful in-memory dataset,
- keep using the JSON disk backup if needed,
- expose sync status information,
- log the error.

### 14.4 Partial sync failure handling
If only part of the XML feed is invalid:
- skip invalid records,
- log issues,
- keep valid records,
- treat sync as partial success.

### 14.5 Missing or invalid agent data handling
If a property does not contain a valid `id_agent` from XML:
- the property must not enter the runtime dataset,
- the issue should be logged,
- the property is treated as an invalid record and skipped during sync.

---

## 15. Caching and Performance

Performance is important, especially for:
- home page,
- property listing page,
- property detail page.

### 15.1 Runtime cache
The backend will use an in-memory cache as the primary read layer.

### 15.2 Disk backup
The backend will also maintain a JSON file backup of the last successful sync.

### 15.3 Detail page performance
The property detail endpoint should return already-normalized and ready-to-use data instead of doing expensive transformation work on every request.

### 15.4 Home page performance
Home page aggregated data should also be prepared from cached data rather than recomputed from live XML.

---

## 16. Security

Because there is no login, the main security focus is on public API hardening and form abuse prevention.

### 16.1 Security priorities
Main security concerns are:
- input validation,
- sanitization,
- rate limiting,
- abuse protection on form endpoints,
- CORS policy,
- careful logging of user-submitted data.

### 16.2 Form protection
The architecture should include:
- rate limiting,
- basic anti-spam rules,
- honeypot support,
- possible CAPTCHA support later if needed.

### 16.3 CORS
The backend should support configurable CORS rules.

This is useful whether frontend and backend end up:
- on the same domain,
- on subdomains,
- or on separate domains.

### 16.4 Sensitive logging
The backend should avoid logging raw sensitive user-submitted form content unnecessarily.

---

## 17. Observability and Operational Endpoints

The MVP should include simple observability, not a heavy monitoring stack.

### 17.1 Logging
The backend should support basic application logging for:
- XML sync attempts,
- XML sync failures,
- number of loaded properties,
- form submission handling,
- email delivery success/failure,
- unexpected runtime errors.

### 17.2 Health endpoint
A simple health endpoint should exist to confirm that the service is running.

### 17.3 Sync status endpoint
A simple sync status endpoint should expose:
- last successful sync time,
- number of loaded properties,
- last sync error,
- optional simple status flag (`ok` / `error`).

### 17.4 Manual refresh for development
The architecture should support a manual refresh mechanism for development/testing.

Decided approach:
- a development-only endpoint or command, enabled only via an environment flag,
- disabled entirely in production.

---

## 18. Code Organization

The backend should be organized primarily **by feature**, with light internal layering inside each feature.

This keeps the code easier to navigate and maintain.

### 18.1 Suggested modules
Recommended backend modules:

- `xml-sync`
- `properties`
- `agents`
- `forms`
- `home`
- `shared`

### 18.2 Internal layering
Inside modules, keep responsibilities separated where useful, for example:
- routes/controllers,
- services,
- mappers,
- validators,
- config/helpers.

The goal is not to create deep enterprise layering, but to keep responsibilities clean.

### 18.3 Suggested repository structure

```text
client/
  ...frontend app...

server/
  src/
    app/
    config/
    modules/
      xml-sync/
      properties/
      agents/
      forms/
      home/
      shared/
    data/
      agent-enrichment.json
      properties-cache.json
```

This structure is only a recommended starting point and may evolve.

---

## 19. Configuration Strategy

The backend should use environment-based configuration.

Examples of configuration concerns include:
- XML feed URL,
- refresh interval,
- email provider credentials,
- allowed CORS origins,
- runtime environment,
- optional development-only refresh controls.

This keeps the system flexible across development and production environments.

---

## 20. Deployment Assumptions

This document stays intentionally light on deployment details because hosting decisions are not finalized yet.

However, the architecture assumes support for:
- environment-based configuration,
- production mode,
- a background XML refresh job,
- frontend/backend separation if needed later.

The backend should be deployable as one simple web service.

---

## 21. Current Decisions

The following are the current architecture decisions for the MVP:

- use one backend service,
- use Node.js + TypeScript + Fastify,
- use a `client/` + `server/` repository structure,
- use XML as the external source of truth for property data,
- do not fetch XML on every public request,
- use in-memory cache as the runtime read model,
- use JSON-on-disk as a backup of the last successful sync,
- use XML-driven agent assignment by default,
- allow a small local agent enrichment layer for fields such as image and bio if needed,
- handle forms through the backend and send emails directly in the request-response flow,
- use REST API architecture,
- keep validation, logging, and observability simple but explicit.

---

## 22. Future Extension Points

The architecture should remain open for later improvements such as:
- multilingual support,
- additional filters,
- more homepage aggregation blocks,
- better email formatting,
- optional local metadata storage,
- richer local agent enrichment,
- more advanced caching,
- stronger anti-spam protections.

These are extension points, not MVP requirements.

---

## 23. Summary

This architecture intentionally favors simplicity and reliability over complexity.

The chosen MVP design is:
- one backend service,
- XML-driven property ingestion,
- local runtime caching,
- JSON backup persistence,
- id_agent property mapping,
- clean public REST API,
- simple email-based lead flows.

This gives the project a practical foundation that is fast enough for a real public website, simple enough to build within the project timeline, and structured enough to support future growth.