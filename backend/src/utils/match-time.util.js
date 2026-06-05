// Match time helpers — single source of truth for parsing
// match_date / match_time strings into Date objects and for the
// room-credentials reveal / edit windows.
//
// Both match.service.js and partner.service.js previously inlined
// their own copies of `getMatchStartDateTime` / `parseMatchDateTime`
// with subtly different parsers. Q2 fix: centralize the logic here.

const MONTH_MAP = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const CREDENTIALS_REVEAL_BEFORE_MIN = 5;
const CREDENTIALS_EDIT_BEFORE_MIN = 10;
const CREDENTIALS_EDIT_AFTER_MIN = 5;

// Parse `dateStr` (e.g. "02 Jun 2026") + `timeStr` (e.g. "10:30 PM"
// or "22:30") into a Date. Returns null when the input is missing or
// not parseable.
const parseMatchDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;

  const datePart = String(dateStr).trim();
  const timePart = String(timeStr).trim();
  const combined = `${datePart} ${timePart}`;

  // Fast path: Date.parse handles many ISO-ish strings and
  // human formats reliably on modern Node.
  let ts = Date.parse(combined);
  if (!Number.isNaN(ts)) return new Date(ts);

  // Fallback: parse "DD MMM YYYY HH:MM (am|pm)?"
  const parts = combined.match(/(\d+)\s+([a-zA-Z]+)\s+(\d+)\s+(\d{1,2}):(\d{2})(?:\s*(am|pm))?/i);
  if (!parts) return null;
  const [, dayStr, monthStr, yearStr, hourStr, minuteStr, ampm] = parts;
  const month = MONTH_MAP[monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase().slice(0, 3)] ?? MONTH_MAP[monthStr];
  if (month == null) return null;

  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  if (ampm) {
    const upper = ampm.toUpperCase();
    if (upper === 'PM' && hour < 12) hour += 12;
    if (upper === 'AM' && hour === 12) hour = 0;
  }
  return new Date(parseInt(yearStr, 10), month, parseInt(dayStr, 10), hour, minute, 0, 0);
};

// Convenience wrapper that accepts a match document.
const getMatchStartDateTime = (match) => {
  if (!match) return null;
  return parseMatchDateTime(match.match_date, match.match_time);
};

const getCredentialsRevealTime = (match) => {
  const start = getMatchStartDateTime(match);
  if (!start) return null;
  return new Date(start.getTime() - CREDENTIALS_REVEAL_BEFORE_MIN * 60 * 1000);
};

const getCredentialsEditCutoff = (match) => {
  const start = getMatchStartDateTime(match);
  if (!start) return null;
  return new Date(start.getTime() - CREDENTIALS_EDIT_BEFORE_MIN * 60 * 1000);
};

const getCredentialsEditGraceEnd = (match) => {
  const start = getMatchStartDateTime(match);
  if (!start) return null;
  return new Date(start.getTime() + CREDENTIALS_EDIT_AFTER_MIN * 60 * 1000);
};

// True when a host is allowed to edit room credentials at `now`
// (defaults to current time). The window is:
//   [start - 10min, start + 5min]
const canHostEditCredentials = (match, now = new Date()) => {
  const cutoff = getCredentialsEditCutoff(match);
  const graceEnd = getCredentialsEditGraceEnd(match);
  if (!cutoff || !graceEnd) return false;
  return now >= cutoff && now <= graceEnd;
};

module.exports = {
  parseMatchDateTime,
  getMatchStartDateTime,
  getCredentialsRevealTime,
  getCredentialsEditCutoff,
  getCredentialsEditGraceEnd,
  canHostEditCredentials,
  CREDENTIALS_REVEAL_BEFORE_MIN,
  CREDENTIALS_EDIT_BEFORE_MIN,
  CREDENTIALS_EDIT_AFTER_MIN,
};
