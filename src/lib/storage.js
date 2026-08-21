/* ------------------------------------------------------------------ */
/* "Saved on this device" — browser localStorage only.                  */
/* Nothing in this file ever makes a network request. Quotes saved here */
/* are visible only in this browser, on this device, to this user.      */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "salesai_saved_quotes_v1";

function readAll() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt or inaccessible storage — fail safe to an empty list rather than throwing.
    return [];
  }
}

function writeAll(quotes) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
    return true;
  } catch {
    // Storage full, private-browsing restrictions, etc.
    return false;
  }
}

function makeId() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function listSavedQuotes() {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getSavedQuote(id) {
  return readAll().find((q) => q.id === id) || null;
}

export function saveQuote({ name, company, contact, notes, planId, voiceId, smsId }) {
  const quotes = readAll();
  const now = Date.now();
  const quote = {
    id: makeId(),
    name: name?.trim() || company?.trim() || "Untitled quote",
    company: company?.trim() || "",
    contact: contact?.trim() || "",
    notes: notes?.trim() || "",
    planId,
    voiceId,
    smsId,
    createdAt: now,
    updatedAt: now,
  };
  quotes.push(quote);
  const ok = writeAll(quotes);
  return ok ? quote : null;
}

export function duplicateQuote(id) {
  const quotes = readAll();
  const source = quotes.find((q) => q.id === id);
  if (!source) return null;
  const now = Date.now();
  const copy = { ...source, id: makeId(), name: `${source.name} (copy)`, createdAt: now, updatedAt: now };
  quotes.push(copy);
  writeAll(quotes);
  return copy;
}

export function renameQuote(id, newName) {
  const quotes = readAll();
  const idx = quotes.findIndex((q) => q.id === id);
  if (idx === -1) return false;
  quotes[idx] = { ...quotes[idx], name: newName?.trim() || quotes[idx].name, updatedAt: Date.now() };
  return writeAll(quotes);
}

export function deleteQuote(id) {
  const quotes = readAll().filter((q) => q.id !== id);
  return writeAll(quotes);
}

export function clearAllQuotes() {
  return writeAll([]);
}
