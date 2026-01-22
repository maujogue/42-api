/**
 * Shared type definitions for the 42 API extension
 */

// =============================================================================
// PREFERENCES
// =============================================================================

export interface Preferences {
  clientId: string;
  clientSecret: string;
  debugMode?: boolean;
  userLogin?: string;
  goalHours?: string;
  goalMinutes?: string;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * 42 User object from the API
 */
export interface User {
  id: number;
  login: string;
  location: string | null;
  image: {
    link: string;
  };
  url: string;
}

/**
 * Location statistics - maps dates to time strings
 * Example: { "2024-01-15": "02:56:21.097917" }
 */
export interface LocationStats {
  [date: string]: string;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Parsed time representation
 */
export interface TimeComponents {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

/**
 * Authentication state
 */
export interface AuthState {
  accessToken: string | null;
  isAuthenticating: boolean;
  error: Error | null;
}

/**
 * Date range for API queries
 */
export interface DateRange {
  beginAt: string;
  endAt: string;
}
