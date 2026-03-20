# Project Spec — Real Estate Website Backend

## 1. Overview

This project is a backend for a modern real estate website whose primary goals are to attract potential buyers and renters, strengthen the brand of a new agency, and provide an easy way for users to browse, filter, and inquire about properties.

The website is intended for users who want to:
- buy a property,
- rent a property,
- advertise their property through the agency,
- contact the agency or a specific agent.

The frontend is already mostly built, while the backend is being developed from scratch and should support the public-facing website.

---

## 2. Product Goals

The main product goals are:

1. Generate new leads for the agency.
2. Present the agency in a professional and modern way online.
3. Make property browsing and filtering simple and intuitive.
4. Allow users to easily send inquiries to the agency or to specific agents.
5. Provide a strong foundation for SEO optimization and future website expansion.

---

## 3. Project Scope

### In Scope (MVP)

The MVP includes:

- displaying properties imported from an external XML source,
- a property listing page with filters and pagination,
- a single property detail page,
- an agents page and individual agent pages,
- a contact form that sends inquiries to the agency,
- an “Advertise Your Property” form,
- an agent contact form,
- a property-specific inquiry form on the property detail page,
- a solid foundation for SEO-friendly public data,
- Serbian language only in the initial version.

### Out of Scope

To be defined in the future.

---

## 4. Target Users

### Primary users
- people looking to buy a property,
- people looking to rent a property.

### Secondary users
- people who want to advertise or sell their property through the agency,
- people who want to contact the agency or a specific agent.

### Internal business users
- agents and the agency staff, who already manage listings through the external Relper system rather than through this website.

---

## 5. Site Structure Supported by Backend

Based on the planned website pages, the backend should support the following parts of the product:

### 5.1 Home page
The home page contains sections such as:
- Hero section,
- Featured properties,
- Counters,
- Buying process,
- Team section,
- FAQ,
- Call to action.

The backend should provide data for the dynamic sections of the home page, especially featured properties and team/agent-related content.

### 5.2 About Us
The “About Us” page is fully static on the frontend. It contains hero, text sections, partners, slider, counters, and CTA, but does not require any backend endpoint or backend logic in the MVP.

### 5.3 Properties
The main listing page contains:
- a hero/search-like section,
- additional navigation,
- a filter bar,
- property cards.

This is one of the core backend-driven pages and requires reliable listing, filtering, sorting, and pagination support.

### 5.4 Property detail page
The single property page contains:
- an image slider,
- core property information,
- a detailed description,
- agent information,
- an inquiry form,
- related property cards.

### 5.5 Agents
The agents page contains an agents listing and basic team information.

### 5.6 Single agent page
The single agent page contains:
- hero section,
- contact form,
- image and basic information,
- short bio/description,
- properties assigned to that agent.

### 5.7 Contact
The contact page contains:
- hero section,
- contact form,
- map,
- agency contact information.

The page content is mostly static, but the form requires backend processing and email delivery.

### 5.8 Advertise Your Property
This page contains:
- hero section,
- a detailed property submission form,
- a side section with explanations/benefits.

In the MVP, this form does not write directly into Relper. Instead, it is sent to the agency by email as a lead.

---

## 6. Data Source Strategy

### 6.1 Primary Source of Truth
The primary source of property data is not a local database of this project, but an external XML export available through a URL provided by the Relper system.

The client manages listings through a separate Relper application. Creating, updating, and deleting listings happens in that external system, while this website only displays the data.

### 6.2 Initial Assumption for MVP
For the MVP, the working assumption is:

- the backend uses the XML feed as the main source of truth,
- data is refreshed periodically from the XML URL,
- the initial assumption is a **once-per-day refresh**,
- the refresh frequency may be changed later.

### 6.3 Scope of Imported Data
The website should display only the listings that belong to the client/agency this website is being built for, not the provider’s entire central database.

---

## 7. Real Estate Domain Model (Business View)

Based on the XML schema, the backend must support properties with a unique identifier and a broad set of attributes.

### 7.1 Supported transaction types
The MVP must support at least:
- sale,
- rent.

### 7.2 Supported property types
The system should be ready to support multiple property types, including:
- apartment,
- house,
- land/plot,
- commercial unit,
- office/commercial space,
- garage,
- cottage/weekend house,
- and other property types available in the XML feed.

### 7.3 Important property attributes
The most important data shown on the website will include:
- listing title,
- price,
- location,
- area size,
- room count / structure,
- description,
- images,
- property type,
- transaction type,
- assigned agent,
- unique listing ID.

In addition, the system should remain open for attributes such as:
- floor,
- total floors,
- furnished/unfurnished status,
- heating,
- equipment/features,
- other property-specific attributes such as terrace, elevator, parking, garage, new construction, and similar.

### 7.4 Images and media
The XML schema supports multiple images per property. The XML also supports optional video and 3D presentation URLs, but these are **not in MVP scope** and will not be mapped in the first version.

### 7.5 Agent relationship
Each property is connected to one agent through the XML field `id_agent` (an integer identifier).

The XML feed provides core agent contact fields directly on each property record:
- `id_agent` — stable integer agent identifier,
- `agent_email`,
- `agent_phone`,
- `agent_name`.

For the MVP, agents are derived from XML data by collecting and deduplicating agent information across property records. A small local enrichment layer (`agent-enrichment.json`) may provide additional presentation-only fields such as agent photo and bio, but it does not replace XML as the source of agent identity or contact data.

---

## 8. Listing, Filtering and Browsing

### 8.1 Listing behavior
The property listing page must support property card display and pagination.

### 8.2 Required filters (MVP)
The MVP should support at least the following filters:
- property type,
- location,
- room count / structure,
- price range,
- area range.

The backend should also remain flexible enough to support additional filters from the XML domain later.

### 8.3 Search
The MVP will **not include free-text search**. Property discovery will rely on filters, sorting, and pagination.

### 8.4 Sorting
Preferred sorting options for the MVP or an early next iteration:
- newest first,
- lowest price first,
- highest price first.

### 8.5 Expected scale
The expected number of listings in the initial version is approximately 100–500 properties.

---

## 9. Inquiry and Contact Flows

One of the most important goals of the website is lead generation.

### 9.1 Contact page inquiry
The contact form sends an inquiry to the agency.

Minimum fields:
- first name,
- last name,
- phone,
- email,
- inquiry subject,
- message.

### 9.2 Agent page inquiry
The single agent page includes a form that sends an inquiry directly to that specific agent.

Minimum fields:
- full name,
- phone,
- email,
- message.

### 9.3 Property detail inquiry
The single property page includes a form that sends an inquiry to the agent responsible for that property.

Minimum fields:
- full name,
- phone,
- email,
- message.

### 9.4 “Advertise Your Property” inquiry
The “Advertise Your Property” form is intended for users who want to sell or advertise their property through the agency.

For the MVP:
- the form is sent to the agency by email,
- the backend does not write that data directly into the Relper system,
- the agency/agent handles the information manually afterward.

The detailed field definitions for this form are in `api-contract.md` section 11.

### 9.5 Email handling scope
This document defines that the backend processes and forwards contact and lead forms. The exact technical email delivery mechanism will be defined later in the technical design.

---

## 10. SEO and UX Requirements

The website should be structured in a way that supports strong SEO and a fast user experience.

### 10.1 SEO-related expectations
Where relevant, the backend should support:
- stable identifiers and URL-friendly property identity,
- reliable data for listing and detail pages,
- clean and consistent public data that the frontend can use for its SEO layer.

### 10.2 Performance priorities
The highest performance focus should be on:
1. the home page,
2. the property listing page,
3. the property detail page.

---

## 11. Language Support

### MVP
- Serbian language only.

### Future Expansion
Later versions may include:
- English,
- Russian,
- and possibly additional languages.

Multilingual support is not part of the first development phase.

---

## 12. Key Assumptions

This document is based on the following working assumptions:

1. The frontend is already mostly built.
2. The Relper XML feed is the primary source of property data.
3. Contact and lead forms send emails, without CRM integration and without local lead storage in the MVP.
4. Agents may be handled without a full local database in the MVP, unless later it becomes necessary to introduce small supporting local data.
5. The XML feed is initially refreshed periodically, with the starting assumption of once per day.
6. Free-text search is not part of the MVP.

---

## 13. Risks and Open Questions

### Resolved decisions

1. **XML feed usage model** — decided: periodic sync with in-memory cache as the primary runtime read layer, plus a JSON file on disk as a fallback of the last successful sync. Public requests do not fetch or parse live XML.

2. **Agent mapping** — decided: `id_agent` is the canonical internal agent identifier (integer). The XML feed provides `id_agent`, `agent_email`, `agent_phone`, and `agent_name` per property. Agents are derived by collecting and deduplicating across property records. A small local enrichment layer provides presentation-only fields (photo, bio).

### Resolved since initial writing

3. Email delivery:
   - uses Resend as the transactional email provider,
   - email composition uses simple HTML tables,
   - sending happens synchronously inside the request-response flow.

### Still open

4. Additional client requirements:
   - labels such as “new”, “discounted”, or “featured”,
   - additional filters,
   - multilingual support,
   - possible manual override needs.

5. Hosting and deployment decisions:
   - still not defined.

---

## 14. Success Criteria for MVP

The MVP is considered successful if:

1. The website can reliably display properties from the XML source.
2. Users can filter and browse listings with pagination.
3. The backend correctly supports the property detail page and provides all required data for it.
4. Users can send inquiries to the agency or to specific agents.
5. The project provides a stable foundation for future development, SEO improvements, and later upgrades.