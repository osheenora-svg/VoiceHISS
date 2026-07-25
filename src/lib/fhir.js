/**
 * Builds a FHIR-style JSON bundle from the *reviewed* (human-confirmed) form
 * state — never from the raw AI draft directly, since the human review is
 * the source of truth once signed. Only fields that actually have a value
 * produce a resource; nothing is fabricated to fill out the bundle shape.
 *
 * This is a teaching-demo approximation of FHIR (R4-shaped resources), not a
 * validated/conformant FHIR bundle — good enough to show the structure
 * (Patient, Encounter, Condition, Observation, MedicationRequest) without
 * claiming clinical-system interoperability.
 */

function textResource(status, text) {
  return { status, div: `<div xmlns="http://www.w3.org/1999/xhtml">${escapeHtml(text)}</div>` };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let counter = 0;
function nextId(prefix) {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function buildFhirBundle({ formValues, icd10Candidates = [], reviewerName, confirmedAt, transcript }) {
  counter = 0; // deterministic ids within a single bundle
  const entries = [];

  const patientId = nextId('patient');
  entries.push({
    resource: {
      resourceType: 'Patient',
      id: patientId,
      text: textResource('generated', 'Demo patient — no real patient-identifying data collected.'),
      meta: { tag: [{ code: 'DEMO', display: 'Demo/synthetic record — VoiceHIS university assignment' }] }
    }
  });

  const encounterId = nextId('encounter');
  entries.push({
    resource: {
      resourceType: 'Encounter',
      id: encounterId,
      status: 'finished',
      class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' },
      subject: { reference: `Patient/${patientId}` },
      reasonCode: formValues.chiefComplaint ? [{ text: formValues.chiefComplaint }] : [],
      period: { end: confirmedAt }
    }
  });

  if (formValues.diagnosis) {
    const selectedCandidate = icd10Candidates.find((c) => c.code === formValues.icd10Suggestion);
    entries.push({
      resource: {
        resourceType: 'Condition',
        id: nextId('condition'),
        subject: { reference: `Patient/${patientId}` },
        encounter: { reference: `Encounter/${encounterId}` },
        code: {
          text: formValues.diagnosis,
          coding: selectedCandidate
            ? [
                {
                  system: 'http://hl7.org/fhir/sid/icd-10',
                  code: selectedCandidate.code,
                  display: selectedCandidate.label
                }
              ]
            : []
        }
      }
    });
  }

  const observationSpecs = [
    { field: 'temperature', code: '8310-5', display: 'Body temperature' },
    { field: 'bloodPressure', code: '85354-9', display: 'Blood pressure panel' },
    { field: 'examination', code: '39156-5', display: 'Physical examination finding' },
    { field: 'allergies', code: '52473-6', display: 'Allergies and adverse reactions' },
    { field: 'duration', code: '11340-5', display: 'Duration of present illness' }
  ];

  for (const spec of observationSpecs) {
    const value = formValues[spec.field];
    if (value === null || value === undefined || String(value).trim().length === 0) continue; // never fabricate
    entries.push({
      resource: {
        resourceType: 'Observation',
        id: nextId('observation'),
        status: 'final',
        subject: { reference: `Patient/${patientId}` },
        encounter: { reference: `Encounter/${encounterId}` },
        code: { coding: [{ system: 'http://loinc.org', code: spec.code, display: spec.display }] },
        valueString: value
      }
    });
  }

  const medications = Array.isArray(formValues.medications) ? formValues.medications : [];
  for (const med of medications) {
    if (!med.name) continue; // don't emit an empty/incomplete med row as a resource
    entries.push({
      resource: {
        resourceType: 'MedicationRequest',
        id: nextId('medicationrequest'),
        status: 'active',
        intent: 'order',
        subject: { reference: `Patient/${patientId}` },
        encounter: { reference: `Encounter/${encounterId}` },
        medicationCodeableConcept: { text: med.name },
        dosageInstruction: [
          {
            text: [med.dose, med.frequency].filter(Boolean).join(', ') || undefined,
            doseAndRate: med.dose ? [{ doseQuantity: { text: med.dose } }] : undefined
          }
        ]
      }
    });
  }

  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: confirmedAt,
    meta: {
      tag: [{ code: 'DEMO', display: 'VoiceHIS demo bundle — invented data, not a real patient record' }]
    },
    extension: [
      {
        url: 'https://voicehis.demo/reviewer',
        valueString: reviewerName
      },
      {
        url: 'https://voicehis.demo/source-transcript',
        valueString: transcript
      }
    ],
    entry: entries
  };
}
