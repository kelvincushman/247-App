const jwt = require('jsonwebtoken');

/**
 * Generate a test JWT token for authentication
 * @param {object} user - User object
 * @returns {string} JWT token
 */
const generateTestToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

/**
 * Generate a test refresh token
 * @param {object} user - User object
 * @returns {string} Refresh token
 */
const generateTestRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Create a mock job object
 * @param {object} overrides - Fields to override
 * @returns {object} Mock job
 */
const createMockJob = (overrides = {}) => {
  return {
    id: '44444444-4444-4444-4444-444444444444',
    customer_id: global.testUser.id,
    tradesperson_id: global.testTradesperson.id,
    trade_category: 'Electrician',
    title: 'Fix Electrical Outlet',
    description: 'Need to repair a broken outlet',
    images: [],
    location: {
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zip: '12345',
      lat: 51.5074,
      lng: -0.1278
    },
    scheduled_time: null,
    urgency: 'medium',
    status: 'requested',
    estimated_duration: 60,
    estimated_cost: 100.00,
    payment_status: 'pending',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
};

/**
 * Create a mock location object
 * @param {object} overrides - Fields to override
 * @returns {object} Mock location
 */
const createMockLocation = (overrides = {}) => {
  return {
    id: '55555555-5555-5555-5555-555555555555',
    job_id: '44444444-4444-4444-4444-444444444444',
    tradesperson_id: global.testTradesperson.id,
    latitude: 51.5074,
    longitude: -0.1278,
    accuracy: 10,
    heading: 90,
    speed: 8.33,
    altitude: 50,
    distance_to_destination: 2.5,
    estimated_arrival_time: new Date(Date.now() + 15 * 60 * 1000),
    status: 'en_route',
    timestamp: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
};

/**
 * Create a mock review object
 * @param {object} overrides - Fields to override
 * @returns {object} Mock review
 */
const createMockReview = (overrides = {}) => {
  return {
    id: '66666666-6666-6666-6666-666666666666',
    job_id: '44444444-4444-4444-4444-444444444444',
    reviewer_id: global.testUser.id,
    reviewee_id: global.testTradesperson.id,
    rating: 4.5,
    comment: 'Great work!',
    moderation_status: 'approved',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
};

/**
 * Create a mock notification object
 * @param {object} overrides - Fields to override
 * @returns {object} Mock notification
 */
const createMockNotification = (overrides = {}) => {
  return {
    id: '77777777-7777-7777-7777-777777777777',
    user_id: global.testUser.id,
    type: 'job_update',
    title: 'Job Update',
    message: 'Your job has been updated',
    data: {},
    is_read: false,
    priority: 'medium',
    created_at: new Date(),
    ...overrides
  };
};

/**
 * Sleep/delay utility for async tests
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise}
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Mock Sequelize model with common methods
 * @param {object} data - Data to return
 * @returns {object} Mock model
 */
const createMockModel = (data = {}) => {
  return {
    findByPk: jest.fn().mockResolvedValue(data),
    findOne: jest.fn().mockResolvedValue(data),
    findAll: jest.fn().mockResolvedValue([data]),
    findAndCountAll: jest.fn().mockResolvedValue({ count: 1, rows: [data] }),
    create: jest.fn().mockResolvedValue(data),
    update: jest.fn().mockResolvedValue([1, [data]]),
    destroy: jest.fn().mockResolvedValue(1),
    count: jest.fn().mockResolvedValue(1),
    increment: jest.fn().mockResolvedValue([data]),
    decrement: jest.fn().mockResolvedValue([data])
  };
};

/**
 * Mock Socket.io for testing
 * @returns {object} Mock io
 */
const createMockSocket = () => {
  return {
    emit: jest.fn(),
    on: jest.fn(),
    to: jest.fn().mockReturnThis(),
    emitToUser: jest.fn(),
    emitToJob: jest.fn(),
    isUserOnline: jest.fn().mockReturnValue(false),
    getOnlineCount: jest.fn().mockReturnValue(0)
  };
};

/**
 * Mock Express request object
 * @param {object} overrides - Fields to override
 * @returns {object} Mock request
 */
const createMockRequest = (overrides = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    app: {
      get: jest.fn().mockReturnValue(createMockSocket())
    },
    ...overrides
  };
};

/**
 * Mock Express response object
 * @returns {object} Mock response
 */
const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis()
  };
  return res;
};

/**
 * Mock Express next function
 * @returns {function} Mock next
 */
const createMockNext = () => {
  return jest.fn();
};

module.exports = {
  generateTestToken,
  generateTestRefreshToken,
  createMockJob,
  createMockLocation,
  createMockReview,
  createMockNotification,
  sleep,
  createMockModel,
  createMockSocket,
  createMockRequest,
  createMockResponse,
  createMockNext
};
