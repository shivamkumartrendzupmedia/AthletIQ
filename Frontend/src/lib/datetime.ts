/**
 * Pure date and time utilities for converting between UTC ISO timestamps
 * and browser <input type="datetime-local"> strings ("YYYY-MM-DDTHH:mm").
 *
 * Fully deterministic across timezones using Intl.DateTimeFormat with explicit IANA zones.
 * Does not import from apiClient or import.meta.env.
 */

/**
 * Get current browser or system IANA timezone identifier.
 */
export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Format a UTC ISO date string into a "YYYY-MM-DDTHH:mm" string in the given IANA timezone.
 * Suitable for HTML5 <input type="datetime-local" />.
 */
export function toDatetimeLocalString(
  utcIsoString: string,
  timeZone: string = getBrowserTimeZone()
): string {
  if (!utcIsoString) return '';
  const date = new Date(utcIsoString);
  if (isNaN(date.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Parse a "YYYY-MM-DDTHH:mm" string from a datetime-local input in the given IANA timezone,
 * returning a full UTC ISO 8601 string (e.g. "2026-10-15T14:30:00.000Z").
 */
export function fromDatetimeLocalString(
  datetimeLocalValue: string,
  timeZone: string = getBrowserTimeZone()
): string {
  if (!datetimeLocalValue || !datetimeLocalValue.includes('T')) return '';

  const [datePart, timePart] = datetimeLocalValue.split('T');
  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const [hourStr, minuteStr] = timePart.split(':');

  const targetYear = parseInt(yearStr, 10);
  const targetMonth = parseInt(monthStr, 10);
  const targetDay = parseInt(dayStr, 10);
  const targetHour = parseInt(hourStr, 10);
  const targetMinute = parseInt(minuteStr, 10);

  if (
    isNaN(targetYear) ||
    isNaN(targetMonth) ||
    isNaN(targetDay) ||
    isNaN(targetHour) ||
    isNaN(targetMinute)
  ) {
    return '';
  }

  // Iteratively determine UTC timestamp that formats to target local values in the target timeZone
  const approxUtc = Date.UTC(targetYear, targetMonth - 1, targetDay, targetHour, targetMinute, 0);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  function getLocalParts(d: Date) {
    const p = formatter.formatToParts(d);
    return {
      year: parseInt(p.find((x) => x.type === 'year')?.value || '0', 10),
      month: parseInt(p.find((x) => x.type === 'month')?.value || '0', 10),
      day: parseInt(p.find((x) => x.type === 'day')?.value || '0', 10),
      hour: parseInt(p.find((x) => x.type === 'hour')?.value || '0', 10),
      minute: parseInt(p.find((x) => x.type === 'minute')?.value || '0', 10),
    };
  }

  let testDate = new Date(approxUtc);
  for (let i = 0; i < 3; i++) {
    const local = getLocalParts(testDate);
    const localAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, 0);
    const targetAsUtc = Date.UTC(targetYear, targetMonth - 1, targetDay, targetHour, targetMinute, 0);
    const diff = targetAsUtc - localAsUtc;
    if (diff === 0) break;
    testDate = new Date(testDate.getTime() + diff);
  }

  return testDate.toISOString();
}

/**
 * Format startsAt and endsAt into clean, human-readable date, time, and duration strings.
 */
export function formatSessionTimeRange(
  startsAtUtc: string,
  endsAtUtc: string,
  timeZone: string = getBrowserTimeZone()
): { dateStr: string; timeRangeStr: string; durationStr: string } {
  const start = new Date(startsAtUtc);
  const end = new Date(endsAtUtc);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { dateStr: 'Invalid date', timeRangeStr: '', durationStr: '' };
  }

  const dateFmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const dateStr = dateFmt.format(start);
  const startTime = timeFmt.format(start);
  const endTime = timeFmt.format(end);
  const timeRangeStr = `${startTime} – ${endTime}`;

  const durationMin = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  const hours = Math.floor(durationMin / 60);
  const mins = durationMin % 60;
  let durationStr = '';
  if (hours > 0 && mins > 0) {
    durationStr = `${hours}h ${mins}m`;
  } else if (hours > 0) {
    durationStr = `${hours}h`;
  } else {
    durationStr = `${mins}m`;
  }

  return { dateStr, timeRangeStr, durationStr };
}

/**
 * Format a session start time into a clean local time string for start hints.
 * e.g. "Oct 15, 2:00 PM"
 * Uses an explicit IANA timeZone, falling back to getBrowserTimeZone().
 */
export function formatSessionStartHint(
  startsAtUtc: string,
  timeZone: string = getBrowserTimeZone()
): string {
  if (!startsAtUtc) return '';
  const date = new Date(startsAtUtc);
  if (isNaN(date.getTime())) return '';

  const dateFmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
  });

  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${dateFmt.format(date)}, ${timeFmt.format(date)}`;
}
