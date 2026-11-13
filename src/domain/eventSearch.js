import { DomainError } from './errors.js';
import { mergeSort } from './sorting.js';

function requireSummaries(summaries) {
  if (!Array.isArray(summaries)) {
    throw new DomainError('VALIDATION', 'summaries must be an array');
  }
}

function requireTextFilter(value, field) {
  if (value !== undefined && typeof value !== 'string') {
    throw new DomainError('VALIDATION', `${field} must be text`);
  }
}

function parseDate(value, field, { endOfDay = false } = {}) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DomainError('VALIDATION', `${field} must be a valid date`);
  }

  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    throw new DomainError('VALIDATION', `${field} must be a valid date`);
  }

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = new Date(time);
  if (dateOnly && parsed.toISOString().slice(0, 10) !== value) {
    throw new DomainError('VALIDATION', `${field} must be a valid date`);
  }
  return endOfDay && dateOnly ? time + 86_400_000 - 1 : time;
}

export function filterEvents(
  summaries,
  criteria = {},
) {
  requireSummaries(summaries);
  if (!criteria || typeof criteria !== 'object' || Array.isArray(criteria)) {
    throw new DomainError('VALIDATION', 'criteria must be an object');
  }
  const { q, city, from, to, maxPriceCents, onlyAvailable } = criteria;
  requireTextFilter(q, 'q');
  requireTextFilter(city, 'city');

  const text = q?.trim().toLowerCase();
  const wantedCity = city?.trim().toLowerCase();
  const fromTime = from === undefined ? undefined : parseDate(from, 'from');
  const toTime = to === undefined ? undefined : parseDate(to, 'to', { endOfDay: true });

  if (
    maxPriceCents !== undefined
    && (!Number.isSafeInteger(maxPriceCents) || maxPriceCents < 0)
  ) {
    throw new DomainError('VALIDATION', 'maxPriceCents must be a whole number of cents');
  }
  if (onlyAvailable !== undefined && typeof onlyAvailable !== 'boolean') {
    throw new DomainError('VALIDATION', 'onlyAvailable must be a boolean');
  }

  return summaries.filter((event) => {
    if (text && !`${event.title} ${event.venue}`.toLowerCase().includes(text)) return false;
    if (wantedCity && event.city.toLowerCase() !== wantedCity) return false;

    const startsAt = Date.parse(event.startsAt);
    if (fromTime !== undefined && startsAt < fromTime) return false;
    if (toTime !== undefined && startsAt > toTime) return false;

    if (
      maxPriceCents !== undefined
      && (event.minPriceCents === null || event.minPriceCents > maxPriceCents)
    ) {
      return false;
    }
    if (onlyAvailable && event.seatsLeft <= 0) return false;
    return true;
  });
}

const compareText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const byTitleThenId = (a, b) =>
  compareText(a.title.toLowerCase(), b.title.toLowerCase()) || compareText(a.id, b.id);

const sorters = {
  date: (a, b) =>
    Date.parse(a.startsAt) - Date.parse(b.startsAt) || byTitleThenId(a, b),
  price: (a, b) => {
    const priceA = a.minPriceCents ?? Infinity;
    const priceB = b.minPriceCents ?? Infinity;
    return (priceA - priceB) || byTitleThenId(a, b);
  },
  availability: (a, b) => b.seatsLeft - a.seatsLeft || byTitleThenId(a, b),
};

export const SORT_OPTIONS = Object.keys(sorters);

export function sortEvents(summaries, sortBy = 'date') {
  requireSummaries(summaries);
  if (typeof sortBy !== 'string' || !Object.hasOwn(sorters, sortBy)) {
    throw new DomainError('VALIDATION', `sort must be one of: ${SORT_OPTIONS.join(', ')}`);
  }
  return mergeSort(summaries, sorters[sortBy]);
}

export function searchEvents(summaries, criteria = {}, sortBy = 'date') {
  return sortEvents(filterEvents(summaries, criteria), sortBy);
}
