// Match time helpers (mirrors backend/src/services/match.service.js)
//
// match_date format: "02 Jun 2026"
// match_time format: "10:30 PM" or "22:30"

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

export const getMatchStartDateTime = (
  matchDate: string,
  matchTime: string,
): Date | null => {
  if (!matchDate || !matchTime) return null;
  const dParts = String(matchDate).trim().split(/\s+/);
  if (dParts.length < 3) return null;
  const day = parseInt(dParts[0], 10);
  const month = MONTHS[dParts[1]];
  const year = parseInt(dParts[2], 10);
  if (isNaN(day) || month == null || isNaN(year)) return null;

  const tMatch = String(matchTime).trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?$/);
  if (!tMatch) return null;
  let hour = parseInt(tMatch[1], 10);
  const minute = parseInt(tMatch[2], 10);
  const ampm = tMatch[3];
  if (ampm) {
    if (ampm.toLowerCase() === 'pm' && hour < 12) hour += 12;
    if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
  }
  return new Date(year, month, day, hour, minute, 0, 0);
};

export const CREDENTIALS_REVEAL_BEFORE_MIN = 5;
export const CREDENTIALS_EDIT_BEFORE_MIN = 10;
export const CREDENTIALS_EDIT_AFTER_MIN = 5;

export const getCredentialsRevealTime = (match: any): Date | null => {
  const start = getMatchStartDateTime(match?.match_date, match?.match_time);
  if (!start) return null;
  return new Date(start.getTime() - CREDENTIALS_REVEAL_BEFORE_MIN * 60 * 1000);
};

export const getCredentialsEditCutoff = (match: any): Date | null => {
  const start = getMatchStartDateTime(match?.match_date, match?.match_time);
  if (!start) return null;
  return new Date(start.getTime() - CREDENTIALS_EDIT_BEFORE_MIN * 60 * 1000);
};

export const getCredentialsEditGraceEnd = (match: any): Date | null => {
  const start = getMatchStartDateTime(match?.match_date, match?.match_time);
  if (!start) return null;
  return new Date(start.getTime() + CREDENTIALS_EDIT_AFTER_MIN * 60 * 1000);
};

export const isWithinCredentialsRevealWindow = (match: any): boolean => {
  const revealAt = getCredentialsRevealTime(match);
  if (!revealAt) return false;
  return new Date() >= revealAt;
};

export const canHostEditCredentials = (match: any): boolean => {
  const start = getCredentialsEditCutoff(match);
  const end = getCredentialsEditGraceEnd(match);
  if (!start || !end) return false;
  const now = new Date();
  return now >= start && now <= end;
};

export const minutesUntil = (target: Date | null): number => {
  if (!target) return 0;
  const diff = target.getTime() - Date.now();
  return Math.max(0, Math.floor(diff / 60000));
};

export const secondsUntil = (target: Date | null): number => {
  if (!target) return 0;
  const diff = target.getTime() - Date.now();
  return Math.max(0, Math.floor(diff / 1000));
};

export const formatCountdown = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return '0:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};
