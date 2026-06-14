// Session-persistent cache for Gemini-generated segment risk explanations.
//
// Backed by sessionStorage (not an in-memory React ref) so explanations survive
// a logout/login within the same browser tab — logging out unmounts the
// dashboard, which would otherwise destroy a useRef/useState-held cache and
// force a slow, redundant Gemini re-fetch on the next login.
//
// Shape on disk: a JSON dictionary { [segmentId]: explanationText | null }.
// A stored `null` means "analysed, no explanation" — distinct from a missing
// key (never analysed), which the hasOwnProperty check below preserves.

const STORAGE_KEY = "railguard_ai_explanations";

/** Read the whole dictionary from sessionStorage, tolerating absence/corruption. */
function readAll() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

/** Serialize the dictionary back to sessionStorage; degrade quietly if blocked. */
function writeAll(dict) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dict));
  } catch (_) {
    // Storage full or unavailable (e.g. private mode) → behave as a no-op cache.
  }
}

/**
 * Look up a cached explanation.
 * @param {string} segmentId
 * @returns {string|null|undefined} the cached text (or null), or undefined on a miss.
 */
export function getAiExplanation(segmentId) {
  if (!segmentId) return undefined;
  const dict = readAll();
  return Object.prototype.hasOwnProperty.call(dict, segmentId) ? dict[segmentId] : undefined;
}

/** Store (or overwrite) one segment's explanation text. */
export function cacheAiExplanation(segmentId, text) {
  if (!segmentId) return;
  const dict = readAll();
  dict[segmentId] = text ?? null;
  writeAll(dict);
}

/** Drop one segment's cached explanation (its risk picture changed). */
export function removeAiExplanation(segmentId) {
  if (!segmentId) return;
  const dict = readAll();
  if (Object.prototype.hasOwnProperty.call(dict, segmentId)) {
    delete dict[segmentId];
    writeAll(dict);
  }
}

/** Wipe the entire explanation cache (e.g. after a global reset). */
export function clearAiExplanations() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (_) {
    /* ignore */
  }
}
