import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAvailableCountries, fetchPublicHolidays, fetchWithCache } from './api';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('API functions', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('fetchAvailableCountries', () => {
    it('should fetch and return countries', async () => {
      const mockCountries = [
        { countryCode: 'US', name: 'United States' },
        { countryCode: 'CA', name: 'Canada' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCountries,
      });

      const result = await fetchAvailableCountries();
      expect(result).toEqual(mockCountries);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should return empty array on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchAvailableCountries();
      expect(result).toEqual([]);
    });
  });

  describe('fetchPublicHolidays', () => {
    it('should fetch holidays for a specific country and year', async () => {
      const mockHolidays = [
        {
          date: '2023-01-01',
          localName: 'New Year',
          name: 'New Year',
          countryCode: 'US',
          fixed: true,
          global: true,
          counties: null,
          launchYear: null,
          types: ['Public'],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHolidays,
      });

      const result = await fetchPublicHolidays(2023, 'US');
      expect(result).toEqual(mockHolidays);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchWithCache', () => {
    it('should cache responses and return cached data for repeated calls', async () => {
      const mockFetchFn = vi.fn().mockResolvedValue({ data: 'test' });

      // First call should fetch
      await fetchWithCache('test-key', mockFetchFn);
      expect(mockFetchFn).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await fetchWithCache('test-key', mockFetchFn);
      expect(mockFetchFn).toHaveBeenCalledTimes(1); // Still called only once
    });
  });
});
