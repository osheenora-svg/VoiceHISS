/**
 * Triggers a client-side download of `data` (any JSON-serializable value) as
 * a .json file named `filename`. No server involved — pure Blob + anchor
 * click, per the brief's "downloadable file" requirement.
 */
export function downloadJson(filename, data) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}
