---
description: Enforce the public API contract when changing backend code that affects endpoint behavior.
paths:
  - server/src/**/*
---

# API contract enforcement

Apply this rule when working on backend code that affects public API behavior.

## Contract-first behavior

- Treat `docs/api-contract.md` as the source of truth for public endpoint behavior in MVP.
- Check `docs/api-contract.md` before changing:
  - endpoint paths
  - route params or query params
  - request body fields
  - response shape
  - error behavior
  - status codes
- Do not silently drift from the documented API contract.

## Response wrappers

- Use `{ "data": ... }` for single-resource responses.
- Use `{ "items": [...], "pagination": ... }` for collection responses.
- Keep response structures stable and predictable.
- Do not invent alternative wrapper patterns for similar endpoints.

## Error handling

- Use the standard error response shape:
  - `error.code`
  - `error.message`
  - `error.details` only when appropriate
- Keep error responses short, stable, and safe.
- Do not expose internal stack traces, transport details, raw upstream payloads, or internal implementation state.

## Status code discipline

- Follow the documented MVP status codes.
- Use `400` for invalid input or malformed request data.
- Use `404` when a referenced public resource does not exist.
- Use `429` when rate limiting applies.
- Use `500` for unexpected backend failures.
- Do not introduce extra status code behavior unless it is intentionally documented and approved.

## Route and identity rules

- Preserve the documented public route structure.
- Property detail remains `slug + id` in the public route.
- Property lookup is ID-authoritative even when the slug is wrong.
- Agent public routing stays slug-based.
- Internal identity rules must not be changed just because a public route looks different.

## Collections, filtering, and pagination

- Keep list endpoints consistent with the documented query model.
- Do not add undocumented filters, sort modes, or pagination fields without approval.
- Do not add filter metadata, facets, or discovery payloads to listing responses in MVP.
- Keep pagination metadata limited to the documented fields.

## Request body discipline

- Accept only the documented payload shape for each endpoint.
- Do not silently add convenience aliases, duplicate fields, or alternative body formats.
- If request validation changes public behavior, align it with `docs/api-contract.md`.

## Model boundary discipline

- Do not expose raw XML records or internal normalized models directly through the API.
- Use the API read models and response shapes defined by the project contract.
- Do not assume that internal model fields should automatically become public response fields.

## Scope control

- Do not add new public endpoints, admin endpoints, CMS behavior, auth flows, or diagnostics endpoints unless the user explicitly expands scope.
- Do not split one documented MVP endpoint into multiple specialized endpoints without approval.
- If a change affects the public API and seems useful but is outside the documented MVP, stop and ask first.
