# CLAUDE.md

## Project context

This repository is a real-estate website monorepo with `client/` and `server/`.
The active work area is the backend only.
Treat `server/` as the default workspace unless the user explicitly asks for frontend work.
Do not modify `client/` by default.

This backend is an MVP public REST API for a real-estate website.
Its main responsibilities are:
- serve property, agent, home, health, and status data,
- ingest property data from a RELPER XML feed,
- handle public inquiry/contact forms,
- send emails for those forms.

The backend uses Node.js + TypeScript + Fastify.

The site is Serbian-language only. Content arrives in Serbian from the XML feed. No i18n or multilingual support is needed for MVP.

Prefer simple, practical, implementation-ready solutions over speculative future-proofing.

## How to use project documents

Do not read all project documents for every task.
Read this file first, identify the task type, then open only the minimum relevant document set.

Use the documents like this:
- `docs/project-spec.md` — MVP scope, supported pages, business intent, backend responsibilities.
- `docs/architecture.md` — system design, repo structure, runtime flow, sync pipeline, cache/fallback behavior, module boundaries.
- `docs/data-model.md` — internal models, normalization, validation, acceptance rules, identity handling.
- `docs/api-contract.md` — endpoints, request/response shapes, wrappers, status codes, error shape, route/query rules.
- `docs/backlog.md` — implementation order, task boundaries, dependencies, done criteria, verification.

Examples:
- endpoint or response work -> `docs/api-contract.md` (+ `docs/data-model.md` if needed)
- sync/runtime/caching work -> `docs/architecture.md` (+ `docs/data-model.md` if needed)
- scope or feature inclusion question -> `docs/project-spec.md`
- deciding what to build next -> `docs/backlog.md`

## Scope guardrails

Stay inside the current MVP.
Do not silently add scope, abstractions, or systems “just in case”.

Unless the user asks for them, treat the following as out of scope:
- auth,
- admin or CMS functionality,
- writing back to RELPER,
- CRM integration,
- local lead storage,
- queue-based email delivery,
- major async worker architecture beyond the planned refresh job,
- new public endpoints outside the documented MVP,
- filter facets / available-filters endpoints,
- free-text search,
- multilingual support.

If a non-MVP addition seems useful:
1. mark it as outside current scope,
2. explain why it may help,
3. ask before adding it.

## Core backend invariants

Treat these as fixed unless the user explicitly changes them:
- RELPER XML is the source of truth for property data.
- The backend does not own the primary property database.
- Public requests must read from the prepared runtime dataset, not fetch/parse live XML.
- Sync is full refresh, not incremental.
- Expected sync flow: fetch -> parse -> map -> validate -> skip invalid -> build normalized dataset -> replace in-memory cache -> write JSON snapshot.
- Invalid records are skipped with logging; a few bad records must not fail the whole refresh if valid records still exist.
- Cache replacement happens only after a successful normalized dataset build.
- In-memory cache is the primary runtime read layer.
- JSON snapshot on disk is the fallback of the last successful sync.
- `property_id` is the canonical property identity.
- Public property detail uses `:slug-id`, but lookup is ID-driven.
- `id_agent` is the canonical internal agent identity.
- Property-to-agent relationship comes from XML.
- A property without a valid `id_agent` must not enter the runtime model.
- Do not expose raw XML shapes through the public API.
- Do not treat internal normalized models as identical to public API responses.
- `PropertyListItem` and `PropertyDetail` are separate public read models.

If you find older wording in project docs that conflicts with these invariants, flag the conflict instead of silently following outdated text.

## API and forms

When working on public API behavior, treat `docs/api-contract.md` as the authority.
Keep public responses, status codes, route behavior, and error shape aligned with the documented contract.

When working on forms, keep the MVP implementation simple and backend-owned.
Follow the documented request/response behavior and keep email handling aligned with the project rules for the forms module.

## Code organization

The backend is one service with a feature-based structure under `server/src/`.
Prefer work that fits the planned modules and keeps layering light.
Do not introduce deep enterprise layering, microservices, or unnecessary abstraction for the current project size.

## Change policy

Ask before making changes that alter scope or core project decisions, especially if they would:
- add new public endpoints or new backend responsibilities,
- change route identity rules,
- change response wrappers or error shape,
- introduce a new primary database or system of record,
- add auth, admin, CMS, queues, CRM, or local lead storage,
- change XML-first ingestion, sync strategy, or property/agent identity rules,
- broaden work into frontend changes.

If project documents conflict, do not silently choose a new direction.
Prefer the latest explicit user-confirmed decision and keep implementation conservative until the conflict is resolved.

## Working style

Optimize for the user's working style:
- practical,
- direct,
- low-theory,
- implementation-oriented,
- low-ambiguity,
- restrained about scope expansion.

When proposing something new, explain what it is, why it helps, and whether it is required for MVP or only optional.

## Relationship to `.claude/rules/`

This file should stay concise.
Use `.claude/rules/` for modular global or path-scoped rules.
Do not duplicate large planning content here.
