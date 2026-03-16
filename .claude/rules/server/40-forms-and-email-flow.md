---
description: Rules for the forms module and email submission flow.
paths:
  - server/src/modules/forms/**/*
---

# Forms and email flow

Apply this rule when working on the forms module.

## Core behavior

- Treat forms as backend-owned request handlers that validate input, sanitize content, build an email payload, send the email, and return an API response.
- Keep the MVP flow synchronous inside the request-response cycle unless the user explicitly changes this project decision.
- Do not introduce background jobs, queues, event buses, lead databases, CRM sync, or retry workers for MVP form handling.
- Keep implementation simple, observable, and easy to debug.

## Allowed MVP responsibilities

- Parse and validate incoming form payloads.
- Reject invalid requests with the standard API error shape.
- Sanitize free-text fields before they are used in email content or logs.
- Apply anti-abuse protections already planned for MVP, especially validation, rate limiting, and honeypot checks.
- Build clear email payloads for the relevant recipient or recipient group.
- Send email directly from the backend request handler or a thin supporting service.
- Return a success response only after the email send step succeeds.

## Do not add without explicit approval

- Message queues or async job processing.
- Persistent storage for form submissions.
- CRM, webhook, or third-party lead routing.
- Admin moderation workflows.
- File uploads or attachment handling.
- CAPTCHA providers if a honeypot and rate limiting remain the approved MVP approach.
- Template systems or abstraction layers that are heavier than the current project needs.

## Validation and sanitization

- Keep validation strict and explicit.
- Validate only the fields defined for the specific form type.
- Do not silently accept extra fields just because they exist in the request body.
- Normalize predictable fields only when it improves consistency and does not change meaning.
- Sanitize text used in email bodies, logs, and error details.
- Avoid leaking unsafe raw input into logs or responses.

## Email handling

- Keep email generation simple and deterministic.
- Prefer small, explicit mapping from validated payload -> email subject/body/metadata.
- Keep transport concerns separated from request validation, but do not over-abstract the module.
- Fail the request cleanly when email sending fails.
- Do not report success if the backend did not actually send the email.

## API behavior

- Follow `docs/api-contract.md` for request and response behavior.
- Use the standard error response shape for validation and sending failures.
- Keep responses short and safe. Do not expose internal transport details.
- Do not invent extra response fields unless they are documented and approved.

## Security and abuse controls

- Treat every form endpoint as public-facing and abuse-prone.
- Preserve or strengthen planned protections such as:
  - schema validation
  - honeypot checks
  - rate limiting
  - safe logging
- Do not weaken validation or anti-abuse behavior for convenience during implementation.

## Scope discipline

- Forms are contact workflows, not a general communication platform.
- Do not expand forms into notification systems, inboxes, dashboards, or lead-management features unless the user explicitly asks for that scope.
- If a change affects public endpoint behavior, payload shape, or response format, check `docs/api-contract.md` first.
- If a change affects project scope or architecture, check `docs/project-spec.md` and `docs/architecture.md` before implementing it.
