---
description: Runtime data model and dataset boundary rules for backend modules that read or expose normalized data.
paths:
  - server/src/app/**/*
  - server/src/modules/properties/**/*
  - server/src/modules/agents/**/*
  - server/src/modules/home/**/*
  - server/src/modules/shared/**/*
  - server/src/data/**/*
---

# Runtime data invariants

Apply this rule when working on backend code that reads, shapes, caches, or exposes the normalized runtime dataset.

## Runtime dataset boundary

- Treat the runtime dataset as a prepared, normalized read layer.
- Public read paths must consume the prepared runtime dataset, not rebuild data ad hoc from raw XML.
- Do not add request-time XML parsing, request-time XML mapping, or request-time XML validation to public endpoints.
- Keep runtime reads fast, deterministic, and independent from upstream XML availability.

## Identity rules

- `property_id` is the canonical property identity inside the backend.
- `id_agent` is the canonical internal agent identity.
- Do not replace canonical IDs with slug-based identity, array position, composite pseudo-IDs, or locally invented IDs.
- Public routes may use different shapes than internal identity, but internal lookup logic must remain ID-authoritative.

## Property acceptance and relationship rules

- A property may exist in the runtime dataset only if it passes the project acceptance rules.
- A property without a valid `id_agent` must not enter the runtime dataset.
- Property-to-agent relationship is XML-derived. Do not introduce manual primary mapping logic as a replacement for XML identity.
- If supporting code encounters missing or invalid agent identity for a property, treat that property as rejected input, not as a partial runtime record.

## Agent enrichment boundary

- Local agent enrichment is optional and presentation-only.
- Use enrichment only for non-authoritative additions such as photo, bio, or similar display metadata.
- Do not let local enrichment override XML identity, ownership, or relationship rules.
- Do not make enrichment required for agent or property validity unless the user explicitly changes project scope.

## Model separation

- Keep these layers distinct:
  - raw XML structures
  - normalized internal runtime models
  - public API read models
- Do not collapse these layers into one shared shape for convenience.
- Do not expose internal normalization helpers or storage-oriented fields just because they exist in runtime memory.
- When changing internal model fields, check `docs/data-model.md` first.
- When changing public responses, check `docs/api-contract.md` first.

## Read model discipline

- Preserve the distinction between `PropertyListItem` and `PropertyDetail`.
- Do not treat detail data as the default payload for listing endpoints.
- Do not assume every internal property field belongs in every public response.
- Keep home, property list, property detail, and agent views purpose-specific.

## Data file roles

- `properties-cache.json` is a persisted fallback snapshot of normalized runtime data, not a writable business database.
- `agent-enrichment.json` is a local enrichment source, not a replacement source of truth.
- Do not create new sidecar data files that change runtime truth without explicit approval.

## Safe change behavior

- Prefer additive, low-risk model changes that preserve current identity and read-layer assumptions.
- If a proposed change affects acceptance rules, identity handling, enrichment semantics, or model boundaries, verify it against `docs/data-model.md` and `docs/architecture.md` before implementing.
