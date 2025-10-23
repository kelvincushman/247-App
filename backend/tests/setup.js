// Test setup file
// Runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/trades_test';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake_webhook_secret';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_S3_BUCKET = 'test-bucket';
process.env.FIREBASE_PROJECT_ID = 'test-project';

// Set longer timeout for database operations
jest.setTimeout(10000);

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn()
  },
  messaging: jest.fn(() => ({
    send: jest.fn().mockResolvedValue('fake-message-id'),
    sendMulticast: jest.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0
    })
  }))
}));

// Mock AWS S3
jest.mock('aws-sdk', () => ({
  S3: jest.fn(() => ({
    upload: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Location: 'https://fake-s3-url.com/file.jpg',
        Key: 'fake-key',
        Bucket: 'test-bucket'
      })
    }),
    deleteObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    getSignedUrl: jest.fn().mockReturnValue('https://fake-presigned-url.com')
  }))
}));

// Global test utilities
global.testUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'customer',
  phone_number: '+1234567890'
};

global.testTradesperson = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'tradesperson@example.com',
  first_name: 'Test',
  last_name: 'Tradesperson',
  role: 'tradesperson',
  phone_number: '+1234567891'
};

global.testAdmin = {
  id: '33333333-3333-3333-3333-333333333333',
  email: 'admin@example.com',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin',
  phone_number: '+1234567892'
};

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
