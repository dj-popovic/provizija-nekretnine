---
paths:
  - server/src/**/*
  - server/src/**
---

# Backend-only working mode

This rule applies when working in backend code under `server/src/`.

- Treat the backend as the active work area by default.
- Do not modify `client/` unless the user explicitly asks for frontend work.
- Keep changes inside the existing backend structure instead of spreading logic across unrelated areas.

## Follow the planned backend shape

Prefer changes that fit the existing feature-based layout:
- `server/src/app/`
- `server/src/config/`
- `server/src/modules/xml-sync/`
- `server/src/modules/properties/`
- `server/src/modules/agents/`
- `server/src/modules/forms/`
- `server/src/modules/home/`
- `server/src/modules/shared/`
- `server/src/data/`

## Keep code organization simple

- Place logic in the most relevant existing module.
- Reuse shared backend utilities only when they are truly shared.
- Avoid introducing new top-level architectural layers without a clear need.
- Avoid enterprise-style restructuring for the current MVP size.
- Keep module boundaries clear and practical.

## Do not broaden the task unnecessarily

When implementing a backend change:
- do not pull frontend concerns into the backend task,
- do not redesign unrelated modules,
- do not reorganize folder structure unless the task actually requires it.

If a requested change would require meaningful frontend work or a broader repo reorganization, stop and call that out explicitly.
