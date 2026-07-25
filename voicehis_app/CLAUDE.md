# VoiceHIS — Project Brief

## What this is
A demo web app for a university assignment: it shows how AI dictation could replace
manual HIS (Hospital Information System) form entry at a single outpatient
consultation station. A spoken or pasted encounter narrative is turned into a
validated, structured HIS entry — but always with a human reviewer in the loop
before anything is "signed."

This is a **demo / teaching artifact**, not a real clinical system. All sample
data is invented. No real patient data is used or stored anywhere.

## Source materials
- `schema.json` — the target structured shape every AI extraction must conform to.
- `samples/sample1_clinical_en.txt` — clean, clinician-style English narrative.
- `samples/sample2_arabic_english_mix.txt` — mixed Arabic/English ("Arabizi"-style)
  clinician dictation. Tests multilingual extraction.
- `samples/sample3_patient_dictation.txt` — messy, hesitant, patient-reported
  narrative with a missing data point (no blood pressure mentioned). Tests the
  "leave it null, don't invent it" rule under noisy input.

## Core product rule
**Never hallucinate structured data.** If a schema field isn't explicitly stated
(or very directly inferable — e.g. "38.2" clearly is the temperature) in the
transcript, the AI must emit `null` for it, not a guess. Every field also gets a
confidence rating so amber-highlighting in review is possible. Sample 3 exists
specifically to prove this rule holds when a field (blood pressure) is truly
absent from the source.

---

## Features (priority order)

1. **Input page** — Web Speech API live recording + transcript, a paste-in
   textarea, and buttons to load the 3 bundled samples.
2. **Extract** — calls the Anthropic API, returns JSON strictly matching
   `schema.json`, with a per-field confidence (`high` / `medium` / `low`).
   Un-stated data → `null`.
3. **Review screen** — HIS-style form pre-filled from the JSON. Nulls and
   low-confidence fields highlighted amber. All fields editable. ICD-10
   suggestion shown as a dropdown of up to 3 options; reviewer must pick one or
   clear it (never auto-accepted).
4. **Deterministic validation** — vitals ranges, required fields, dose format —
   independent of the LLM, with inline errors. "Confirm & sign" requires a
   reviewer name and is blocked while validation errors exist.
5. **On confirm** — save a FHIR-style JSON bundle (Patient stub, Encounter,
   Condition, Observation[], MedicationRequest[]) to in-memory storage + offer
   it as a downloadable file. Add it to a "Committed Records" list with a full
   audit trail: original transcript, AI draft, human-edit diff, timestamps.
6. **Completeness meter** — % of schema fields filled by the AI draft vs. %
   filled after human review, shown side by side.

## Constraints
- React + Vite, single-page app, no backend beyond the Anthropic API call, no login.
- Anthropic API key read from an environment variable — never hardcoded, never
  sent to the client bundle unprotected.
- Clean, legible clinical UI (this is reviewed by humans making medical entries —
  clarity over decoration).
- All data in the app (samples, generated bundles) is invented/demo data.

---

## File map (proposed)

```
voicehis/
├── CLAUDE.md
├── schema.json
├── samples/
│   ├── sample1_clinical_en.txt
│   ├── sample2_arabic_english_mix.txt
│   └── sample3_patient_dictation.txt
├── .env.example                # ANTHROPIC_API_KEY=
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx
    ├── App.jsx                 # routes between Input / Review / Committed views
    ├── schema/
    │   └── schema.json         # copied/imported at build time
    ├── lib/
    │   ├── anthropicClient.js  # thin wrapper around the API call
    │   ├── extract.js          # prompt template + response parsing/validation against schema
    │   ├── validators.js       # deterministic rules: vitals ranges, dose format, required fields
    │   ├── icd10.js            # ICD-10 suggestion list logic (from AI draft, capped at 3)
    │   ├── fhir.js             # maps reviewed form state -> FHIR-style bundle
    │   └── completeness.js     # % filled calculator (pre/post review)
    ├── state/
    │   └── recordsStore.js     # in-memory store for committed records + audit trail
    ├── components/
    │   ├── input/
    │   │   ├── RecorderPanel.jsx   # Web Speech API mic + live transcript
    │   │   ├── PasteTranscript.jsx
    │   │   └── SampleLoader.jsx    # buttons for the 3 samples
    │   ├── review/
    │   │   ├── ReviewForm.jsx      # HIS-style pre-filled form
    │   │   ├── FieldRow.jsx        # single field w/ amber highlight + confidence
    │   │   ├── Icd10Dropdown.jsx
    │   │   ├── ValidationErrors.jsx
    │   │   └── CompletenessMeter.jsx
    │   └── committed/
    │       ├── CommittedList.jsx
    │       └── AuditTrailView.jsx  # transcript / AI draft / human diff / timestamps
    └── styles/
        └── clinical-theme.css
```

## Conventions
- **State shape mirrors `schema.json`** end-to-end: extraction output, review
  form state, and the diff computation all key off the same field names, so
  there's one source of truth for "what a record looks like."
- **Confidence is per-field**, stored alongside the value (e.g.
  `{ value: "38.2°C", confidence: "high" }`), not as a single blanket score for
  the whole draft.
- **Two JSON shapes, kept distinct**: the schema.json intake shape (flat,
  UI-friendly) vs. the FHIR-style bundle (nested, standards-shaped) produced
  only at confirm time. `fhir.js` is the only place that translates between them.
- **Validation is deterministic and separate from the LLM.** The AI never
  blocks the "Confirm & sign" button — only `validators.js` does. This keeps
  the safety-relevant logic auditable and testable without hitting the API.
- **Audit trail is append-only** per record: raw transcript → AI draft (with
  confidences) → final human-edited values → diff between the two → reviewer
  name + timestamps for extract time and confirm time.
- **No silent defaults.** A field the AI didn't extract stays `null` until a
  human types something in; it's never defaulted to an empty string that could
  be mistaken for "confirmed blank."
- Components are presentational where possible; the `lib/` modules hold logic
  so it's independently readable/testable without React.

---

## Step-by-step build plan

1. **Scaffold** — Vite + React app, `.env.example`, base folder structure above,
   clinical CSS theme skeleton (no logic yet).
2. **Schema + validators** — bring in `schema.json`, write `validators.js`
   (vitals ranges, required fields, dose regex) with unit-style test cases
   using the 3 samples' expected values, before any UI touches them.
3. **Input page** — `SampleLoader`, `PasteTranscript`, then `RecorderPanel`
   (Web Speech API) last, since mic permissions/live transcript are the
   fiddliest part and easiest to stub with pasted text in the meantime.
4. **Extraction pipeline** — `anthropicClient.js` + `extract.js`: prompt
   template enforcing "null if not stated" + confidence per field, strict
   JSON-schema-shaped response, defensive parsing. Manually verify against all
   3 samples, especially that sample 3's missing blood pressure comes back
   `null` and not fabricated.
5. **Review screen** — `ReviewForm` + `FieldRow` (amber logic for null/low
   confidence) + `Icd10Dropdown` (forced human choice) + wire in
   `ValidationErrors` from step 2 + `CompletenessMeter` (pre-review number only
   for now).
6. **Confirm & sign** — reviewer-name field, error-blocking logic, `fhir.js`
   bundle construction, `recordsStore.js` in-memory save + downloadable file.
7. **Committed records + audit trail** — `CommittedList` and
   `AuditTrailView`, compute human-edit diff, finish `CompletenessMeter`'s
   post-review number.
8. **Pass over the 3 samples end-to-end** — record or paste each, confirm the
   null-handling rule held, the Arabic/English sample extracted correctly, and
   the audit trail/diff reads sensibly. Polish clinical UI last.

Each step should be a separate, reviewable commit. No step after (2) should
touch the LLM prompt without re-running all 3 samples through it.
