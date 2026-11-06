# Napomene frontend → backend

Kratka lista stvari koje frontend već koristi ili očekuje od API-ja.
Piše Đorđe (frontend); Relja odlučuje kako i kada.

## Agenti: WhatsApp i Viber

- Kartice agenata (`PV.render.agentCard`) i profil agenta (`page-agent.js`) imaju
  dugmad za WhatsApp i Viber. Detalj nekretnine ih ima za agenta oglasa.
- Broj se trenutno uzima iz `agent.phone`.
- Ako agent ima **poseban** broj za WhatsApp ili Viber, frontend ga već prihvata:
  pošaljite polja `agent.whatsapp` i/ili `agent.viber` (bilo koji format, npr.
  `064 111 2233` ili `+38164…`). Kad postoje, imaju prednost nad `agent.phone`.
  Bez njih se koristi `agent.phone`.
- Logika je u `client/js/renderers.js` → `agentMessengers()` / `intlPhone()`.

## Otvoreno (od ranije)

- Tab **Novogradnja** na stranici Nekretnine šalje `transactionType=sale&newBuild=true`
  — treba filter po `newBuild=true` (npr. ključ `new_build`).
- **Izdvojene nekretnine** na početnoj: prazne dok se ne popuni `FEATURED_PROPERTY_IDS`.
- **Brojevi agencije** na sajtu su još placeholder (+381 11 123 4567, +381 64 123 4567)
  i `AGENCY_PHONE` u `page-property.js` — čekamo prave brojeve od klijenta.
