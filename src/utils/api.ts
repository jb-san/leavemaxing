import { NAGER_API_URL } from '../config/api';
import type { CountryInfo, PublicHoliday } from '../types/api';

/**
 * Fetches the list of available countries from Nager.Date API
 */
export async function fetchAvailableCountries(): Promise<CountryInfo[]> {
  try {
    const response = await fetch(`${NAGER_API_URL}/AvailableCountries`);

    if (!response.ok) {
      throw new Error(`Failed to fetch countries: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching countries:', error);
    return [];
  }
}

/**
 * Fetches public holidays for a specific country and year
 */
export async function fetchPublicHolidays(
  year: number,
  countryCode: string
): Promise<PublicHoliday[]> {
  try {
    const response = await fetch(`${NAGER_API_URL}/PublicHolidays/${year}/${countryCode}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch holidays: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return [];
  }
}

// Simple in-memory cache for API responses
const apiCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetches data with caching
 */
export async function fetchWithCache<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  // Check if we have cached data and it's still valid
  const cachedData = apiCache[key];
  const now = Date.now();

  if (cachedData && now - cachedData.timestamp < CACHE_EXPIRY) {
    return cachedData.data as T;
  }

  // No valid cache, fetch fresh data
  const data = await fetchFn();

  // Store in cache
  apiCache[key] = {
    data,
    timestamp: now,
  };

  return data;
}

/**
 * Fetches countries with caching
 */
export async function getCachedCountries(): Promise<CountryInfo[]> {
  return fetchWithCache('countries', fetchAvailableCountries);
}

/**
 * Fetches holidays with caching
 */
export async function getCachedHolidays(
  year: number,
  countryCode: string
): Promise<PublicHoliday[]> {
  const cacheKey = `holidays_${year}_${countryCode}`;
  return fetchWithCache(cacheKey, () => fetchPublicHolidays(year, countryCode));
}
