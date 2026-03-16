---
description: Rules for editing project planning documents without breaking approved decisions or document boundaries.
paths:
  - docs/project-spec.md
  - docs/architecture.md
  - docs/data-model.md
  - docs/api-contract.md
  - docs/backlog.md
---

# Planning docs discipline

Apply this rule when editing the core project documents in `docs/`.

## Preserve document roles

- `docs/project-spec.md` defines MVP scope, business intent, supported pages, backend responsibilities, and non-goals.
- `docs/architecture.md` defines runtime structure, data flow, system boundaries, and architectural invariants.
- `docs/data-model.md` defines internal models, normalization rules, validation expectations, and runtime data semantics.
- `docs/api-contract.md` defines public API behavior, request/response shapes, route rules, and error behavior.
- `docs/backlog.md` defines implementation order, task scope, dependencies, done criteria, and verification steps.

Do not blur these roles just to make one document feel more complete.

## Preserve approved decisions

- Treat already-approved project decisions as stable unless the user explicitly changes them.
- Do not quietly reinterpret or “improve” core project decisions while editing docs.
- If a document still contains an older idea that conflicts with a newer approved decision, update it carefully and explicitly.
- Do not leave silent contradictions between documents.

## Update the right document

- Put scope changes in `docs/project-spec.md`.
- Put runtime or structural changes in `docs/architecture.md`.
- Put internal model and acceptance-rule changes in `docs/data-model.md`.
- Put public API changes in `docs/api-contract.md`.
- Put sequencing, milestones, or implementation-task changes in `docs/backlog.md`.

Do not solve a missing update by stuffing unrelated content into the wrong file.

## Cross-document consistency

- When changing one document, check whether the change affects the others.
- Keep identity rules, model boundaries, route behavior, and scope assumptions aligned across documents.
- If a change affects both internal behavior and public API behavior, update both the relevant internal doc and the API contract doc.
- If a change affects implementation order or verification, update `docs/backlog.md` too.

## Decision hygiene

- Distinguish clearly between:
  - approved current behavior
  - optional future ideas
  - out-of-scope possibilities
- Do not present speculative ideas as if they are already project decisions.
- If suggesting an optional future improvement, label it clearly as outside current MVP unless the user says otherwise.

## Editing style

- Prefer targeted edits over unnecessary full rewrites.
- Preserve useful existing wording when it is already correct.
- Tighten ambiguity, remove contradictions, and improve execution clarity.
- Do not add theory, generic best-practice prose, or “enterprise” language unless it directly helps this project.

## Backlog-specific rules

- Keep the backlog phase-based.
- Preserve the task structure already chosen for this project:
  - Task name
  - Goal
  - What to implement
  - Dependencies
  - Done when
  - Verification
- Do not convert the backlog into a different planning format unless the user explicitly asks for that.

## Conflict handling

- If two documents disagree, do not silently pick a side and rewrite everything around it.
- Call out the conflict and resolve it using the latest approved project decision from the user.
- When updating a stale document to match a confirmed decision, make that alignment explicit and keep the change minimal.
