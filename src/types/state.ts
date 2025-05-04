import type { CountryInfo, PublicHoliday } from './api';

export interface AppState {
  selectedYear: number;
  selectedCountry: CountryInfo | null;
  availableCountries: CountryInfo[];
  holidays: PublicHoliday[];
  leaveDaysCount: number;
  isLoading: boolean;
  error: string | null;
}

export interface LeavePlan {
  recommendedLeaveDays: Date[];
  totalTimeOff: number;
  consecutiveBreaks: ConsecutiveBreak[];
}

export interface ConsecutiveBreak {
  startDate: Date;
  endDate: Date;
  duration: number;
  leaveDaysUsed: number;
}

export interface AlgorithmResult {
  leavePlan: LeavePlan;
  score: number;
}
