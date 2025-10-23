import apiClient from '../client';

/**
 * Payment Service
 * Handles all payment and transaction API calls
 */

const paymentService = {
  /**
   * Create payment intent for a job (Customer)
   * @param {string} jobId
   * @param {number} amount - Amount in cents/pence
   */
  createPaymentIntent: async (jobId, amount) => {
    const response = await apiClient.post('/payments/create-intent', {
      jobId,
      amount,
    });
    return response.data;
  },

  /**
   * Confirm payment
   * @param {string} paymentIntentId
   */
  confirmPayment: async (paymentIntentId) => {
    const response = await apiClient.post('/payments/confirm', {
      paymentIntentId,
    });
    return response.data;
  },

  /**
   * Get payment methods for user
   */
  getPaymentMethods: async () => {
    const response = await apiClient.get('/payments/methods');
    return response.data;
  },

  /**
   * Add payment method
   * @param {string} paymentMethodId - Stripe payment method ID
   */
  addPaymentMethod: async (paymentMethodId) => {
    const response = await apiClient.post('/payments/methods', {
      paymentMethodId,
    });
    return response.data;
  },

  /**
   * Remove payment method
   * @param {string} paymentMethodId
   */
  removePaymentMethod: async (paymentMethodId) => {
    const response = await apiClient.delete(`/payments/methods/${paymentMethodId}`);
    return response.data;
  },

  /**
   * Set default payment method
   * @param {string} paymentMethodId
   */
  setDefaultPaymentMethod: async (paymentMethodId) => {
    const response = await apiClient.put('/payments/methods/default', {
      paymentMethodId,
    });
    return response.data;
  },

  /**
   * Get payment history
   * @param {Object} params
   * @param {number} params.page
   * @param {number} params.limit
   * @param {string} params.status - Filter by status
   */
  getPaymentHistory: async (params = {}) => {
    const response = await apiClient.get('/payments/history', { params });
    return response.data;
  },

  /**
   * Get payment details
   * @param {string} paymentId
   */
  getPayment: async (paymentId) => {
    const response = await apiClient.get(`/payments/${paymentId}`);
    return response.data;
  },

  /**
   * Get earnings (Tradesperson)
   * @param {Object} params
   * @param {string} params.startDate - Start date for filtering
   * @param {string} params.endDate - End date for filtering
   */
  getEarnings: async (params = {}) => {
    const response = await apiClient.get('/payments/earnings', { params });
    return response.data;
  },

  /**
   * Request payout (Tradesperson)
   * @param {number} amount - Amount to withdraw in cents/pence
   */
  requestPayout: async (amount) => {
    const response = await apiClient.post('/payments/payout', { amount });
    return response.data;
  },

  /**
   * Get payout history (Tradesperson)
   * @param {Object} params
   */
  getPayoutHistory: async (params = {}) => {
    const response = await apiClient.get('/payments/payouts', { params });
    return response.data;
  },

  /**
   * Setup Stripe Connect account (Tradesperson)
   */
  setupStripeAccount: async () => {
    const response = await apiClient.post('/payments/stripe/setup');
    return response.data;
  },

  /**
   * Get Stripe Connect account status (Tradesperson)
   */
  getStripeAccountStatus: async () => {
    const response = await apiClient.get('/payments/stripe/status');
    return response.data;
  },

  /**
   * Create Stripe Connect onboarding link (Tradesperson)
   */
  createOnboardingLink: async () => {
    const response = await apiClient.post('/payments/stripe/onboarding-link');
    return response.data;
  },

  /**
   * Request refund (Customer)
   * @param {string} paymentId
   * @param {Object} data
   * @param {string} data.reason
   * @param {number} data.amount - Optional partial refund amount
   */
  requestRefund: async (paymentId, data) => {
    const response = await apiClient.post(`/payments/${paymentId}/refund`, data);
    return response.data;
  },

  /**
   * Get payment statistics
   */
  getPaymentStats: async () => {
    const response = await apiClient.get('/payments/stats');
    return response.data;
  },

  /**
   * Get platform fee breakdown for a job
   * @param {number} amount - Job amount in cents/pence
   */
  calculateFees: async (amount) => {
    const response = await apiClient.get('/payments/calculate-fees', {
      params: { amount },
    });
    return response.data;
  },
};

export default paymentService;
