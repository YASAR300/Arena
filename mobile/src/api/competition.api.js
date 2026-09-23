import apiClient from './client';

/**
 * Competition API layer
 * All competition-related API calls, consumed by React Query hooks
 */

/**
 * Fetch full competition details by slug
 * Includes: competition info, judge, rewards, important dates, previous winners
 */
export const fetchCompetitionDetails = (slug) => {
  return apiClient.get(`/competitions/${slug}`);
};

/**
 * Fetch the current user's registration status for a competition
 */
export const fetchRegistrationStatus = (competitionId) => {
  return apiClient.get(`/competitions/${competitionId}/registration-status`);
};

/**
 * Register the current user for a competition
 */
export const registerForCompetition = (competitionId) => {
  return apiClient.post(`/competitions/${competitionId}/register`);
};

/**
 * Fetch the current user's submission for a competition
 */
export const fetchSubmission = (competitionId) => {
  return apiClient.get(`/competitions/${competitionId}/submission`);
};

/**
 * Submit media for a competition
 */
export const submitCompetitionEntry = (competitionId, payload) => {
  return apiClient.post(`/competitions/${competitionId}/submit`, payload);
};

/**
 * Fetch previous winners for a competition series
 */
export const fetchPreviousWinners = (seriesId) => {
  return apiClient.get(`/competitions/series/${seriesId}/winners`);
};

/**
 * Fetch current user's referral details for a competition
 */
export const fetchReferralInfo = (competitionId) => {
  return apiClient.get(`/competitions/${competitionId}/referral`);
};
