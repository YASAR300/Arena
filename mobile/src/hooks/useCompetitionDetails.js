import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCompetitionDetails } from '../api/competition.api';
import apiClient from '../api/client';

/**
 * useCompetitionDetails Hook
 * Fetches complete competition details and calculated currentUserState using TanStack Query
 */
export const useCompetitionDetails = (idOrSlug) => {
  return useQuery({
    queryKey: ['competition', idOrSlug],
    queryFn: async () => {
      const response = await fetchCompetitionDetails(idOrSlug);
      return response.data || response;
    },
    enabled: !!idOrSlug,
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });
};

/**
 * useRegistrationMutation Hook
 * Initiates payment & confirms spot booking
 */
export const useRegistrationMutation = (competitionId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // 1. Initiate payment order
      const initRes = await apiClient.post(`/competitions/${competitionId}/register/initiate-payment`);
      const { orderId, amount } = initRes.data || initRes;

      // 2. Confirm registration (simulated Razorpay client payment success)
      const confirmRes = await apiClient.post(`/competitions/${competitionId}/register/confirm`, {
        razorpayOrderId: orderId || `order_mock_${Date.now()}`,
        razorpayPaymentId: `pay_mock_${Date.now()}`,
        razorpaySignature: 'mock_signature_valid',
      });

      return confirmRes.data || confirmRes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition', competitionId] });
    },
  });
};

/**
 * useSubmissionMutation Hook
 * Uploads submission media and saves metadata
 */
export const useSubmissionMutation = (competitionId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, mediaUrl }) => {
      // Confirm submission
      const res = await apiClient.post(`/competitions/${competitionId}/submissions`, {
        title: title || 'My Classical Dance Performance',
        mediaUrl: mediaUrl || 'https://example.com/dance_submission.mp4',
        durationSeconds: 180,
      });
      return res.data || res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition', competitionId] });
    },
  });
};

export default useCompetitionDetails;
