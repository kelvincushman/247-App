const { Job, User, Review, TradespersonProfile, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');

/**
 * Get dashboard overview for tradesperson
 * @param {string} tradespersonId - Tradesperson user ID
 * @param {string} period - Period: 'today', 'week', 'month', 'year', 'all'
 * @returns {Promise<object>} Dashboard overview metrics
 */
const getDashboardOverview = async (tradespersonId, period = 'month') => {
  try {
    const { startDate, endDate } = getDateRange(period);

    // Get completed jobs count
    const completedJobs = await Job.count({
      where: {
        tradesperson_id: tradespersonId,
        status: 'completed',
        updated_at: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    // Get total earnings (would come from payment records in real app)
    const jobs = await Job.findAll({
      where: {
        tradesperson_id: tradespersonId,
        status: 'completed',
        updated_at: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: ['estimated_cost']
    });

    const totalEarnings = jobs.reduce((sum, job) => {
      return sum + (parseFloat(job.estimated_cost) || 0) * 0.85; // 85% after 15% platform fee
    }, 0);

    // Get active jobs
    const activeJobs = await Job.count({
      where: {
        tradesperson_id: tradespersonId,
        status: {
          [Op.in]: ['accepted', 'in_progress']
        }
      }
    });

    // Get average rating
    const profile = await TradespersonProfile.findOne({
      where: { user_id: tradespersonId },
      attributes: ['average_rating', 'total_reviews']
    });

    // Get pending jobs (requested and assigned to this tradesperson)
    const pendingJobs = await Job.count({
      where: {
        tradesperson_id: tradespersonId,
        status: 'requested'
      }
    });

    return {
      period,
      completed_jobs: completedJobs,
      total_earnings: Math.round(totalEarnings * 100) / 100,
      active_jobs: activeJobs,
      pending_jobs: pendingJobs,
      average_rating: profile?.average_rating || 0,
      total_reviews: profile?.total_reviews || 0
    };
  } catch (error) {
    logger.error('Error getting dashboard overview:', error);
    throw error;
  }
};

/**
 * Get earnings breakdown by time period
 * @param {string} tradespersonId - Tradesperson user ID
 * @param {string} period - Period: 'day', 'week', 'month', 'year'
 * @param {number} limit - Number of periods to return
 * @returns {Promise<object>} Earnings breakdown
 */
const getEarningsBreakdown = async (tradespersonId, period = 'month', limit = 12) => {
  try {
    const jobs = await Job.findAll({
      where: {
        tradesperson_id: tradespersonId,
        status: 'completed'
      },
      attributes: ['estimated_cost', 'updated_at'],
      order: [['updated_at', 'DESC']]
    });

    // Group by period
    const breakdown = {};
    const periods = [];

    jobs.forEach(job => {
      const key = getPeriodKey(job.updated_at, period);
      if (!breakdown[key]) {
        breakdown[key] = {
          period: key,
          jobs: 0,
          gross_earnings: 0,
          net_earnings: 0 // After 15% platform fee
        };
      }

      const amount = parseFloat(job.estimated_cost) || 0;
      breakdown[key].jobs++;
      breakdown[key].gross_earnings += amount;
      breakdown[key].net_earnings += amount * 0.85;
    });

    // Convert to array and sort
    const breakdownArray = Object.values(breakdown)
      .sort((a, b) => b.period.localeCompare(a.period))
      .slice(0, limit)
      .map(item => ({
        ...item,
        gross_earnings: Math.round(item.gross_earnings * 100) / 100,
        net_earnings: Math.round(item.net_earnings * 100) / 100
      }));

    // Calculate totals
    const totals = breakdownArray.reduce((acc, item) => ({
      jobs: acc.jobs + item.jobs,
      gross_earnings: acc.gross_earnings + item.gross_earnings,
      net_earnings: acc.net_earnings + item.net_earnings
    }), { jobs: 0, gross_earnings: 0, net_earnings: 0 });

    return {
      period,
      breakdown: breakdownArray,
      totals: {
        ...totals,
        gross_earnings: Math.round(totals.gross_earnings * 100) / 100,
        net_earnings: Math.round(totals.net_earnings * 100) / 100
      }
    };
  } catch (error) {
    logger.error('Error getting earnings breakdown:', error);
    throw error;
  }
};

/**
 * Get job analytics
 * @param {string} tradespersonId - Tradesperson user ID
 * @param {string} period - Period: 'week', 'month', 'year', 'all'
 * @returns {Promise<object>} Job analytics
 */
const getJobAnalytics = async (tradespersonId, period = 'month') => {
  try {
    const { startDate, endDate } = getDateRange(period);

    // Get all jobs in period
    const jobs = await Job.findAll({
      where: {
        tradesperson_id: tradespersonId,
        created_at: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: ['status', 'trade_category', 'actual_start_time', 'actual_end_time', 'created_at']
    });

    // Calculate completion rate
    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(j => j.status === 'completed').length;
    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    // Calculate average job duration
    const jobsWithDuration = jobs.filter(j => j.actual_start_time && j.actual_end_time);
    const avgDuration = jobsWithDuration.length > 0
      ? jobsWithDuration.reduce((sum, job) => {
          const duration = (new Date(job.actual_end_time) - new Date(job.actual_start_time)) / (1000 * 60 * 60); // hours
          return sum + duration;
        }, 0) / jobsWithDuration.length
      : 0;

    // Job type breakdown
    const typeBreakdown = {};
    jobs.forEach(job => {
      if (!typeBreakdown[job.trade_category]) {
        typeBreakdown[job.trade_category] = 0;
      }
      typeBreakdown[job.trade_category]++;
    });

    // Status breakdown
    const statusBreakdown = {};
    jobs.forEach(job => {
      if (!statusBreakdown[job.status]) {
        statusBreakdown[job.status] = 0;
      }
      statusBreakdown[job.status]++;
    });

    return {
      period,
      total_jobs: totalJobs,
      completed_jobs: completedJobs,
      completion_rate: Math.round(completionRate * 10) / 10,
      average_duration_hours: Math.round(avgDuration * 10) / 10,
      type_breakdown: typeBreakdown,
      status_breakdown: statusBreakdown
    };
  } catch (error) {
    logger.error('Error getting job analytics:', error);
    throw error;
  }
};

/**
 * Get customer insights
 * @param {string} tradespersonId - Tradesperson user ID
 * @returns {Promise<object>} Customer insights
 */
const getCustomerInsights = async (tradespersonId) => {
  try {
    // Get all completed jobs
    const jobs = await Job.findAll({
      where: {
        tradesperson_id: tradespersonId,
        status: 'completed'
      },
      attributes: ['customer_id'],
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    // Count repeat customers
    const customerCounts = {};
    jobs.forEach(job => {
      const customerId = job.customer_id;
      customerCounts[customerId] = (customerCounts[customerId] || 0) + 1;
    });

    const uniqueCustomers = Object.keys(customerCounts).length;
    const repeatCustomers = Object.values(customerCounts).filter(count => count > 1).length;
    const repeatCustomerRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;

    // Get top customers
    const topCustomers = Object.entries(customerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([customerId, count]) => {
        const job = jobs.find(j => j.customer_id === customerId);
        return {
          customer_id: customerId,
          customer_name: `${job.customer.first_name} ${job.customer.last_name}`,
          job_count: count
        };
      });

    // Get customer satisfaction (reviews)
    const reviews = await Review.findAll({
      where: {
        reviewee_id: tradespersonId
      },
      attributes: ['rating']
    });

    const avgCustomerSatisfaction = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + parseFloat(r.rating), 0) / reviews.length
      : 0;

    return {
      unique_customers: uniqueCustomers,
      repeat_customers: repeatCustomers,
      repeat_customer_rate: Math.round(repeatCustomerRate * 10) / 10,
      top_customers: topCustomers,
      average_satisfaction: Math.round(avgCustomerSatisfaction * 10) / 10,
      total_reviews: reviews.length
    };
  } catch (error) {
    logger.error('Error getting customer insights:', error);
    throw error;
  }
};

/**
 * Get performance trends
 * @param {string} tradespersonId - Tradesperson user ID
 * @param {number} periods - Number of periods to analyze
 * @returns {Promise<object>} Performance trends
 */
const getPerformanceTrends = async (tradespersonId, periods = 6) => {
  try {
    const trends = [];

    // Get last N months
    for (let i = 0; i < periods; i++) {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() - i);
      endDate.setDate(1); // First day of month

      const startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 1);

      const monthKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;

      // Get jobs for this month
      const jobs = await Job.findAll({
        where: {
          tradesperson_id: tradespersonId,
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        },
        attributes: ['status', 'estimated_cost']
      });

      const completed = jobs.filter(j => j.status === 'completed').length;
      const earnings = jobs
        .filter(j => j.status === 'completed')
        .reduce((sum, j) => sum + (parseFloat(j.estimated_cost) || 0) * 0.85, 0);

      // Get reviews for this month
      const reviews = await Review.findAll({
        where: {
          reviewee_id: tradespersonId,
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        },
        attributes: ['rating']
      });

      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + parseFloat(r.rating), 0) / reviews.length
        : 0;

      trends.push({
        period: monthKey,
        jobs_completed: completed,
        earnings: Math.round(earnings * 100) / 100,
        average_rating: Math.round(avgRating * 10) / 10,
        review_count: reviews.length
      });
    }

    return {
      trends: trends.reverse() // Oldest to newest
    };
  } catch (error) {
    logger.error('Error getting performance trends:', error);
    throw error;
  }
};

/**
 * Get recent activity feed
 * @param {string} tradespersonId - Tradesperson user ID
 * @param {number} limit - Number of activities
 * @returns {Promise<Array>} Recent activities
 */
const getRecentActivity = async (tradespersonId, limit = 20) => {
  try {
    const activities = [];

    // Get recent jobs
    const recentJobs = await Job.findAll({
      where: {
        tradesperson_id: tradespersonId
      },
      order: [['updated_at', 'DESC']],
      limit: limit / 2,
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    recentJobs.forEach(job => {
      activities.push({
        type: 'job',
        action: job.status,
        timestamp: job.updated_at,
        details: {
          job_id: job.id,
          title: job.title,
          trade_category: job.trade_category,
          customer_name: `${job.customer.first_name} ${job.customer.last_name}`
        }
      });
    });

    // Get recent reviews
    const recentReviews = await Review.findAll({
      where: {
        reviewee_id: tradespersonId
      },
      order: [['created_at', 'DESC']],
      limit: limit / 2,
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    recentReviews.forEach(review => {
      activities.push({
        type: 'review',
        action: 'received',
        timestamp: review.created_at,
        details: {
          review_id: review.id,
          rating: review.rating,
          reviewer_name: `${review.reviewer.first_name} ${review.reviewer.last_name}`
        }
      });
    });

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return activities.slice(0, limit);
  } catch (error) {
    logger.error('Error getting recent activity:', error);
    throw error;
  }
};

/**
 * Get popular service times
 * @param {string} tradespersonId - Tradesperson user ID
 * @returns {Promise<object>} Popular times analysis
 */
const getPopularServiceTimes = async (tradespersonId) => {
  try {
    const jobs = await Job.findAll({
      where: {
        tradesperson_id: tradespersonId,
        status: 'completed',
        actual_start_time: {
          [Op.ne]: null
        }
      },
      attributes: ['actual_start_time']
    });

    // Analyze by hour of day
    const hourCounts = new Array(24).fill(0);
    const dayOfWeekCounts = new Array(7).fill(0);

    jobs.forEach(job => {
      const date = new Date(job.actual_start_time);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();

      hourCounts[hour]++;
      dayOfWeekCounts[dayOfWeek]++;
    });

    // Find peak hours
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakDay = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      peak_hour: peakHour,
      peak_day: dayNames[peakDay],
      hourly_distribution: hourCounts,
      daily_distribution: dayOfWeekCounts.map((count, index) => ({
        day: dayNames[index],
        count
      }))
    };
  } catch (error) {
    logger.error('Error getting popular service times:', error);
    throw error;
  }
};

/**
 * Helper: Get date range for period
 */
const getDateRange = (period) => {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case 'all':
      startDate.setFullYear(2000);
      break;
    default:
      startDate.setMonth(startDate.getMonth() - 1);
  }

  return { startDate, endDate };
};

/**
 * Helper: Get period key for grouping
 */
const getPeriodKey = (date, period) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  switch (period) {
    case 'day':
      return `${year}-${month}-${day}`;
    case 'week':
      const weekNum = getWeekNumber(d);
      return `${year}-W${String(weekNum).padStart(2, '0')}`;
    case 'month':
      return `${year}-${month}`;
    case 'year':
      return `${year}`;
    default:
      return `${year}-${month}`;
  }
};

/**
 * Helper: Get ISO week number
 */
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

module.exports = {
  getDashboardOverview,
  getEarningsBreakdown,
  getJobAnalytics,
  getCustomerInsights,
  getPerformanceTrends,
  getRecentActivity,
  getPopularServiceTimes
};
