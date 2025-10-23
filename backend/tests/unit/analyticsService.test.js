const analyticsService = require('../../src/services/analyticsService');
const { Job, Review, User } = require('../../src/models');
const { createMockJob, createMockReview } = require('../helpers/testUtils');

// Mock the models
jest.mock('../../src/models', () => ({
  Job: {
    findAll: jest.fn(),
    count: jest.fn()
  },
  Review: {
    findAll: jest.fn()
  },
  User: {
    findByPk: jest.fn()
  }
}));

describe('Analytics Service', () => {
  const tradespersonId = global.testTradesperson.id;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardOverview', () => {
    it('should return dashboard overview for month period', async () => {
      const completedJobs = [
        createMockJob({ status: 'completed', estimated_cost: 100 }),
        createMockJob({ status: 'completed', estimated_cost: 200 })
      ];

      const activeJobs = [
        createMockJob({ status: 'in_progress' })
      ];

      const pendingJobs = [
        createMockJob({ status: 'accepted' })
      ];

      const reviews = [
        createMockReview({ rating: 4.5 }),
        createMockReview({ rating: 5.0 })
      ];

      Job.findAll
        .mockResolvedValueOnce(completedJobs) // For completed jobs
        .mockResolvedValueOnce(activeJobs) // For active jobs
        .mockResolvedValueOnce(pendingJobs); // For pending jobs

      Job.count
        .mockResolvedValueOnce(2) // Completed count
        .mockResolvedValueOnce(1) // Active count
        .mockResolvedValueOnce(1); // Pending count

      Review.findAll.mockResolvedValue(reviews);

      const result = await analyticsService.getDashboardOverview(tradespersonId, 'month');

      expect(result).toHaveProperty('completed_jobs', 2);
      expect(result).toHaveProperty('total_earnings');
      expect(result.total_earnings).toBeGreaterThan(0);
      expect(result).toHaveProperty('active_jobs', 1);
      expect(result).toHaveProperty('pending_jobs', 1);
      expect(result).toHaveProperty('average_rating');
      expect(result).toHaveProperty('total_reviews', 2);
      expect(result).toHaveProperty('period', 'month');
    });

    it('should calculate earnings with 15% platform fee deduction', async () => {
      const completedJobs = [
        createMockJob({ status: 'completed', estimated_cost: '100.00' })
      ];

      Job.findAll.mockResolvedValue(completedJobs);
      Job.count.mockResolvedValue(1);
      Review.findAll.mockResolvedValue([]);

      const result = await analyticsService.getDashboardOverview(tradespersonId);

      // 100 * 0.85 = 85
      expect(result.total_earnings).toBe(85);
    });

    it('should handle zero reviews gracefully', async () => {
      Job.findAll.mockResolvedValue([]);
      Job.count.mockResolvedValue(0);
      Review.findAll.mockResolvedValue([]);

      const result = await analyticsService.getDashboardOverview(tradespersonId);

      expect(result.average_rating).toBe(0);
      expect(result.total_reviews).toBe(0);
    });

    it('should support different period options', async () => {
      Job.findAll.mockResolvedValue([]);
      Job.count.mockResolvedValue(0);
      Review.findAll.mockResolvedValue([]);

      const resultToday = await analyticsService.getDashboardOverview(tradespersonId, 'today');
      expect(resultToday.period).toBe('today');

      const resultWeek = await analyticsService.getDashboardOverview(tradespersonId, 'week');
      expect(resultWeek.period).toBe('week');

      const resultYear = await analyticsService.getDashboardOverview(tradespersonId, 'year');
      expect(resultYear.period).toBe('year');
    });
  });

  describe('getEarningsBreakdown', () => {
    it('should breakdown earnings by day', async () => {
      const now = new Date('2025-01-15T12:00:00Z');
      const yesterday = new Date('2025-01-14T12:00:00Z');
      const twoDaysAgo = new Date('2025-01-13T12:00:00Z');

      const completedJobs = [
        createMockJob({
          status: 'completed',
          estimated_cost: '100.00',
          updated_at: now
        }),
        createMockJob({
          status: 'completed',
          estimated_cost: '200.00',
          updated_at: yesterday
        }),
        createMockJob({
          status: 'completed',
          estimated_cost: '150.00',
          updated_at: twoDaysAgo
        })
      ];

      Job.findAll.mockResolvedValue(completedJobs);

      const result = await analyticsService.getEarningsBreakdown(tradespersonId, 'day', 7);

      expect(result).toHaveProperty('period', 'day');
      expect(result).toHaveProperty('breakdown');
      expect(result).toHaveProperty('totals');
      expect(result.totals.total_gross_earnings).toBe(450);
      expect(result.totals.total_net_earnings).toBe(382.5); // 450 * 0.85
      expect(result.totals.total_jobs).toBe(3);
    });

    it('should breakdown earnings by week', async () => {
      Job.findAll.mockResolvedValue([
        createMockJob({
          status: 'completed',
          estimated_cost: '500.00',
          updated_at: new Date()
        })
      ]);

      const result = await analyticsService.getEarningsBreakdown(tradespersonId, 'week', 4);

      expect(result.period).toBe('week');
      expect(result.breakdown).toBeDefined();
    });

    it('should breakdown earnings by month', async () => {
      Job.findAll.mockResolvedValue([
        createMockJob({
          status: 'completed',
          estimated_cost: '1000.00',
          updated_at: new Date()
        })
      ]);

      const result = await analyticsService.getEarningsBreakdown(tradespersonId, 'month', 6);

      expect(result.period).toBe('month');
      expect(result.breakdown).toBeDefined();
    });

    it('should handle no earnings', async () => {
      Job.findAll.mockResolvedValue([]);

      const result = await analyticsService.getEarningsBreakdown(tradespersonId, 'day', 7);

      expect(result.totals.total_gross_earnings).toBe(0);
      expect(result.totals.total_net_earnings).toBe(0);
      expect(result.totals.total_jobs).toBe(0);
    });
  });

  describe('getJobAnalytics', () => {
    it('should calculate job analytics for the period', async () => {
      const completedJobs = [
        createMockJob({
          status: 'completed',
          trade_category: 'Electrician',
          actual_start_time: new Date('2025-01-01T10:00:00Z'),
          actual_end_time: new Date('2025-01-01T11:00:00Z')
        }),
        createMockJob({
          status: 'completed',
          trade_category: 'Plumber',
          actual_start_time: new Date('2025-01-01T14:00:00Z'),
          actual_end_time: new Date('2025-01-01T16:00:00Z')
        }),
        createMockJob({
          status: 'completed',
          trade_category: 'Electrician',
          actual_start_time: new Date('2025-01-01T09:00:00Z'),
          actual_end_time: new Date('2025-01-01T10:30:00Z')
        })
      ];

      const cancelledJobs = [
        createMockJob({ status: 'cancelled' })
      ];

      Job.findAll
        .mockResolvedValueOnce(completedJobs)
        .mockResolvedValueOnce(cancelledJobs);

      Job.count
        .mockResolvedValueOnce(3) // Completed
        .mockResolvedValueOnce(1); // Cancelled

      const result = await analyticsService.getJobAnalytics(tradespersonId, 'month');

      expect(result).toHaveProperty('total_completed', 3);
      expect(result).toHaveProperty('total_cancelled', 1);
      expect(result).toHaveProperty('completion_rate', 75); // 3/(3+1) * 100
      expect(result).toHaveProperty('average_job_duration_minutes');
      expect(result).toHaveProperty('by_category');
      expect(result.by_category.Electrician).toBe(2);
      expect(result.by_category.Plumber).toBe(1);
    });

    it('should handle division by zero for completion rate', async () => {
      Job.findAll.mockResolvedValue([]);
      Job.count.mockResolvedValue(0);

      const result = await analyticsService.getJobAnalytics(tradespersonId);

      expect(result.completion_rate).toBe(0);
    });
  });

  describe('getCustomerInsights', () => {
    it('should analyze customer patterns', async () => {
      const jobs = [
        createMockJob({ customer_id: 'customer-1' }),
        createMockJob({ customer_id: 'customer-1' }), // Repeat
        createMockJob({ customer_id: 'customer-2' }),
        createMockJob({ customer_id: 'customer-3' }),
        createMockJob({ customer_id: 'customer-3' }), // Repeat
        createMockJob({ customer_id: 'customer-3' })  // Repeat again
      ];

      Job.findAll.mockResolvedValue(jobs);

      User.findByPk
        .mockResolvedValueOnce({
          id: 'customer-3',
          first_name: 'John',
          last_name: 'Doe'
        })
        .mockResolvedValueOnce({
          id: 'customer-1',
          first_name: 'Jane',
          last_name: 'Smith'
        })
        .mockResolvedValueOnce({
          id: 'customer-2',
          first_name: 'Bob',
          last_name: 'Johnson'
        });

      const result = await analyticsService.getCustomerInsights(tradespersonId);

      expect(result).toHaveProperty('total_unique_customers', 3);
      expect(result).toHaveProperty('repeat_customers', 2); // customer-1 and customer-3
      expect(result).toHaveProperty('repeat_customer_rate');
      expect(result).toHaveProperty('top_customers');
      expect(result.top_customers).toHaveLength(3);
      expect(result.top_customers[0].job_count).toBe(3); // customer-3 with most jobs
    });

    it('should handle no customers', async () => {
      Job.findAll.mockResolvedValue([]);

      const result = await analyticsService.getCustomerInsights(tradespersonId);

      expect(result.total_unique_customers).toBe(0);
      expect(result.repeat_customers).toBe(0);
      expect(result.repeat_customer_rate).toBe(0);
      expect(result.top_customers).toHaveLength(0);
    });
  });

  describe('getPerformanceTrends', () => {
    it('should calculate performance trends over periods', async () => {
      const jobs = [
        createMockJob({
          status: 'completed',
          estimated_cost: '100.00',
          updated_at: new Date('2025-01-01')
        }),
        createMockJob({
          status: 'completed',
          estimated_cost: '200.00',
          updated_at: new Date('2025-02-01')
        }),
        createMockJob({
          status: 'completed',
          estimated_cost: '300.00',
          updated_at: new Date('2025-03-01')
        })
      ];

      const reviews = [
        createMockReview({
          rating: 4.0,
          created_at: new Date('2025-01-15')
        }),
        createMockReview({
          rating: 4.5,
          created_at: new Date('2025-02-15')
        }),
        createMockReview({
          rating: 5.0,
          created_at: new Date('2025-03-15')
        })
      ];

      Job.findAll.mockResolvedValue(jobs);
      Review.findAll.mockResolvedValue(reviews);

      const result = await analyticsService.getPerformanceTrends(tradespersonId, 6);

      expect(result).toHaveProperty('periods');
      expect(result.periods.length).toBeGreaterThan(0);
      expect(result.periods[0]).toHaveProperty('period_label');
      expect(result.periods[0]).toHaveProperty('jobs_completed');
      expect(result.periods[0]).toHaveProperty('earnings');
      expect(result.periods[0]).toHaveProperty('average_rating');
    });
  });

  describe('getRecentActivity', () => {
    it('should combine jobs and reviews into activity feed', async () => {
      const jobs = [
        createMockJob({
          status: 'completed',
          title: 'Fix outlet',
          created_at: new Date('2025-01-01T12:00:00Z')
        })
      ];

      const reviews = [
        createMockReview({
          rating: 5.0,
          comment: 'Great work!',
          created_at: new Date('2025-01-01T13:00:00Z')
        })
      ];

      Job.findAll.mockResolvedValue(jobs);
      Review.findAll.mockResolvedValue(reviews);

      User.findByPk.mockResolvedValue({
        id: global.testUser.id,
        first_name: 'John',
        last_name: 'Doe'
      });

      const result = await analyticsService.getRecentActivity(tradespersonId, 10);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2); // 1 job + 1 review
      expect(result[0]).toHaveProperty('type'); // Either 'job' or 'review'
      expect(result[0]).toHaveProperty('timestamp');

      // Should be sorted by timestamp descending (most recent first)
      if (result.length > 1) {
        expect(new Date(result[0].timestamp).getTime())
          .toBeGreaterThanOrEqual(new Date(result[1].timestamp).getTime());
      }
    });

    it('should limit activity count', async () => {
      const jobs = Array(20).fill(null).map(() =>
        createMockJob({ created_at: new Date() })
      );

      Job.findAll.mockResolvedValue(jobs);
      Review.findAll.mockResolvedValue([]);
      User.findByPk.mockResolvedValue(global.testUser);

      const result = await analyticsService.getRecentActivity(tradespersonId, 5);

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getPopularServiceTimes', () => {
    it('should analyze popular service hours and days', async () => {
      const jobs = [
        createMockJob({
          actual_start_time: new Date('2025-01-06T09:00:00Z') // Monday 9am
        }),
        createMockJob({
          actual_start_time: new Date('2025-01-06T09:30:00Z') // Monday 9am
        }),
        createMockJob({
          actual_start_time: new Date('2025-01-06T14:00:00Z') // Monday 2pm
        }),
        createMockJob({
          actual_start_time: new Date('2025-01-07T09:00:00Z') // Tuesday 9am
        })
      ];

      Job.findAll.mockResolvedValue(jobs);

      const result = await analyticsService.getPopularServiceTimes(tradespersonId);

      expect(result).toHaveProperty('by_hour');
      expect(result).toHaveProperty('by_day');
      expect(result).toHaveProperty('peak_hour');
      expect(result).toHaveProperty('peak_day');

      // 9am should be most popular (3 jobs)
      expect(result.peak_hour).toBe(9);

      // Monday should be most popular (3 jobs)
      expect(result.peak_day).toBe('Monday');
    });

    it('should handle no job history', async () => {
      Job.findAll.mockResolvedValue([]);

      const result = await analyticsService.getPopularServiceTimes(tradespersonId);

      expect(result.peak_hour).toBeNull();
      expect(result.peak_day).toBeNull();
    });
  });
});
