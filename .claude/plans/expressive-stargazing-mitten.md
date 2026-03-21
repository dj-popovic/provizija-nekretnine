# Frontend-Backend Integration Plan

## Context

The backend MVP is complete (Phases 1-12). The frontend has 8 HTML pages and 1 JS file (`script.js`, 281 lines) that handles only UI animations/interactions — navbar scroll, stat counters, hover effects, lazy loading, Bootstrap validation. **Zero API calls exist.** All property data, agent data, and form handling is either hardcoded HTML or mock (alert-only). This plan connects the frontend to the backend API.

## Key Decisions

- **Serving**: Same origin — backend serves static files from `client/`. API calls use relative paths (`/api/properties`). Add a static file plugin to Fastify to serve `client/` in production. Easiest deployment.
- **Subnav tabs**: Remove "Kupovina" tab from `nekretnine.html`. Keep "Prodaja" (sale) and "Iznajmljivanje" (rent) as the two tabs.
- **Loading fallback**: Spinner immediately — clear hardcoded content on load, show spinner, render API data or error state. Never show fake placeholder data.

---

## JS Architecture

Keep `script.js` untouched. Add new files under `client/js/`:

```
client/js/
  api.js             — fetch wrapper, base URL, error handling, honeypot
  renderers.js       — shared HTML generators (property card, agent card, pagination, states)
  page-home.js       — index.html: GET /api/home → featured properties + team
  page-properties.js — nekretnine.html: filters + GET /api/properties + pagination
  page-property.js   — nekretnina-detalj.html: read slug-id from URL → GET /api/properties/:slugId
  page-agents.js     — agenti.html: GET /api/agents
  page-agent.js      — agent-detalj.html: read slug from URL → GET /api/agents/:slug
  forms.js           — all 4 POST form handlers
```

All files share a single global namespace: `window.PV = window.PV || {}`. No bundler needed, consistent with existing approach.

Script load order per page:
```html
<script src="js/api.js"></script>
<script src="js/renderers.js"></script>
<script src="js/page-home.js"></script>   <!-- varies per page -->
<script src="js/forms.js"></script>        <!-- on pages with forms -->
<script src="js/script.js"></script>       <!-- existing, stays last -->
```

---

## Implementation Phases

### Phase 0 — Static File Serving (DONE)

Added `@fastify/static` to serve `client/` from the backend on the same origin:
- `http://localhost:3000/` serves `client/index.html`
- `http://localhost:3000/nekretnine.html` serves `client/nekretnine.html`
- `http://localhost:3000/api/properties` serves API data
- No CORS issues, no separate dev server needed

### Phase A — Foundation

**1. `api.js`** — Fetch wrapper + config
- `PV.API_BASE` — defaults to `''` (same origin, relative paths). Override only if needed during dev.
- `PV.api.get(path, params?)` — builds URL with URLSearchParams, returns parsed JSON
- `PV.api.post(path, body)` — sends JSON, auto-includes `website: ""` honeypot field
- Error handling: parse `{ error: { code, message, details } }`, throw structured error
- Handle 429 (rate limit), 400 (validation), 404 (not found), 500 (generic)
- AbortController with 15s timeout

**2. `renderers.js`** — Shared HTML generators + value maps
- `PV.render.propertyCard(item)` — generates `.property-card` HTML from API PropertyListItem
- `PV.render.agentCard(agent)` — generates `.team-card` HTML from API agent object
- `PV.render.pagination(paginationData)` — dynamic pagination controls
- `PV.render.spinner()`, `PV.render.emptyState(msg)`, `PV.render.errorState(msg)`
- `PV.render.formatPrice(price, transactionType)` — "285.000 EUR" or "900 EUR/mes."
- `PV.maps` — Serbian↔English value mappings (transactionType, propertyType, etc.)

### Phase B — Read-Only Pages (one at a time)

**B1. `page-home.js`** — Home page
- GET /api/home → render featured properties into section, render team preview into section
- Intercept hero search form: map Serbian field values to API params, redirect to `nekretnine.html?transactionType=sale&...`

**B2. `page-properties.js`** — Property listing (most complex page)
- On load: read URL search params (from home search redirect or bookmarked URL)
- Maintain filter state object: `{ transactionType, propertyType, location, rooms, priceMin, priceMax, areaMin, areaMax, page, sort }`
- Connect filter chips (`data-filter`/`data-val`) to update state + trigger fetch
- Connect subnav tabs (Prodaja/Iznajmljivanje) to transactionType filter. Remove "Kupovina" tab from HTML.
- Connect price/area inputs + search/reset buttons
- `fetchAndRender()`: show spinner in `#propertiesGrid`, GET /api/properties with params, render cards + pagination + results count
- Sync filter state to URL via `history.replaceState()` (bookmarkable)
- Pagination: click handler updates page, re-fetches, scrolls to top

**B3. `page-property.js`** — Property detail
- Read `id` (slug-id) from `?id=` query param
- GET /api/properties/:slugId
- Populate: breadcrumb, badge, gallery (main + thumbnails), specs panel, title/location/price, features, description, agent card, related properties
- Wire inquiry form to POST /api/inquiries/property with loaded propertyId
- Handle 404: show "property not found" with link back to listing

**B4. `page-agents.js`** — Agent listing
- GET /api/agents → render agent cards into container

**B5. `page-agent.js`** — Agent detail
- Read `slug` from `?slug=` query param
- GET /api/agents/:slug → populate profile, stats, portfolio properties
- Wire inquiry form to POST /api/inquiries/agent with loaded agentId

### Phase C — Forms

**C1. Contact form** (kontakt.html): POST /api/contact
**C2. Property & agent inquiry forms** (detail pages): POST /api/inquiries/property, POST /api/inquiries/agent
**C3. Advertise property form** (oglasite-nekretninu.html): POST /api/advertise-property

General pattern for all forms:
- preventDefault → validate → collect fields → POST → show success/error → re-enable
- Honeypot: inject hidden `website` input via JS on each form
- Loading state: disable button + "Slanje..." text during request
- Success: green alert / replace form content
- Error 400: show field-level validation errors
- Error 429: "Previše zahteva, pokušajte ponovo."

### Phase D — Polish
- Edge cases: network offline, timeouts
- Accessibility: aria-live for dynamically updated regions

---

## Detail Page URL Strategy

Query parameters — simplest for static HTML without a router:
- Property: `nekretnina-detalj.html?id=moderan-dvosoban-stan-123`
- Agent: `agent-detalj.html?slug=marko-markovic`

---

## HTML Modifications Needed

Each page needs:
- `id` attributes on dynamic containers that lack them (featured properties row, team row, etc.)
- New `<script>` tags for the JS files
- Hardcoded cards will be replaced by JS on load
- Form inputs on detail pages need `id`/`name` attributes for JS to read values

---

## Value Mapping (Serbian UI → English API)

```
transactionType: prodaja→sale, iznajmljivanje→rent
propertyType: stan→apartment, kuca→house, poslovni→commercial, zemljiste→land
```
These maps are expandable for future i18n (Serbian, English, Russian).

---

## Verification (incremental, after each phase)

After each phase, verify by:
1. Start backend: `cd server && npm run dev`
2. Open `http://localhost:3000/` in browser
3. Test the specific feature just implemented
4. Confirm no regressions on previously working features
