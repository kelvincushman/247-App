# Testing Guide - 247 Trades Platform

Comprehensive testing strategy for both backend and mobile application.

## Testing Stack

### Backend Testing
- **Jest** - Test framework
- **Supertest** - HTTP assertions
- **@faker-js/faker** - Test data generation
- **nock** - HTTP mocking
- **stripe-mock** - Stripe API mocking

### Mobile Testing
- **Jest** - Unit testing
- **React Native Testing Library** - Component testing
- **Detox** - E2E testing
- **@testing-library/react-hooks** - Custom hooks testing

## Installation

### Backend Dependencies

```bash
npm install --save-dev jest supertest @faker-js/faker nock stripe-mock
npm install --save-dev @types/jest @types/supertest
```

### Mobile Dependencies

```bash
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native
npm install --save-dev @testing-library/react-hooks
npm install --save-dev detox detox-cli
```

## Backend Testing

### Jest Configuration

File: `jest.config.js`

```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/config/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.test.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};
```

### Test Setup

File: `tests/setup.js`

```javascript
const { sequelize } = require('../src/config/database');

// Setup before all tests
beforeAll(async () => {
  await sequelize.sync({ force: true });
});

// Cleanup after all tests
afterAll(async () => {
  await sequelize.close();
});

// Clear database between tests
afterEach(async () => {
  const models = Object.keys(sequelize.models);
  for (const modelName of models) {
    await sequelize.models[modelName].destroy({ truncate: true, cascade: true });
  }
});
```

### Unit Tests

#### Model Tests

File: `tests/unit/models/User.test.js`

```javascript
const { User } = require('../../../src/models');

describe('User Model', () => {
  describe('Creation', () => {
    it('should create a valid user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
      };

      const user = await User.create(userData);

      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.role).toBe(userData.role);
    });

    it('should hash password before saving', async () => {
      const password = 'PlainTextPassword123!';
      const user = await User.create({
        email: 'test@example.com',
        password,
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
      });

      expect(user.password).not.toBe(password);
      expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
    });

    it('should validate email format', async () => {
      const invalidUser = {
        email: 'invalid-email',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
      };

      await expect(User.create(invalidUser)).rejects.toThrow();
    });

    it('should enforce unique email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
      };

      await User.create(userData);

      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'TestPassword123!';
      const user = await User.create({
        email: 'test@example.com',
        password,
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
      });

      const isMatch = await user.comparePassword(password);
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'CorrectPassword123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
      });

      const isMatch = await user.comparePassword('WrongPassword');
      expect(isMatch).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should not expose password in JSON', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
      });

      const userJSON = user.toJSON();
      expect(userJSON.password).toBeUndefined();
      expect(userJSON.email).toBe('test@example.com');
    });
  });
});
```

#### Service Tests

File: `tests/unit/services/stripeService.test.js`

```javascript
const stripeService = require('../../../src/services/stripeService');
const { User, Payment } = require('../../../src/models');
const stripe = require('../../../src/config/stripe');

// Mock Stripe
jest.mock('../../../src/config/stripe');

describe('StripeService', () => {
  let customer;

  beforeEach(async () => {
    customer = await User.create({
      email: 'customer@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'Customer',
      role: 'customer',
    });
  });

  describe('createCustomer', () => {
    it('should create Stripe customer', async () => {
      const mockStripeCustomer = {
        id: 'cus_test123',
        email: customer.email,
      };

      stripe.customers.create.mockResolvedValue(mockStripeCustomer);

      const customerId = await stripeService.createCustomer(customer.id);

      expect(customerId).toBe(mockStripeCustomer.id);
      expect(stripe.customers.create).toHaveBeenCalledWith({
        email: customer.email,
        name: `${customer.firstName} ${customer.lastName}`,
        phone: customer.phone,
        metadata: {
          userId: customer.id,
          role: customer.role,
        },
      });

      await customer.reload();
      expect(customer.stripeCustomerId).toBe(mockStripeCustomer.id);
    });

    it('should return existing customer ID if already exists', async () => {
      const existingCustomerId = 'cus_existing123';
      await customer.update({ stripeCustomerId: existingCustomerId });

      const customerId = await stripeService.createCustomer(customer.id);

      expect(customerId).toBe(existingCustomerId);
      expect(stripe.customers.create).not.toHaveBeenCalled();
    });
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent with correct amount', async () => {
      const jobId = 'job-uuid';
      const amount = 150.00;

      const mockPaymentIntent = {
        id: 'pi_test123',
        amount: 15000,
        currency: 'gbp',
        status: 'requires_capture',
        client_secret: 'pi_test123_secret',
      };

      stripe.customers.create.mockResolvedValue({ id: 'cus_test123' });
      stripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await stripeService.createPaymentIntent(
        jobId,
        customer.id,
        amount,
        'pm_test123'
      );

      expect(result.paymentIntentId).toBe(mockPaymentIntent.id);
      expect(result.clientSecret).toBe(mockPaymentIntent.client_secret);

      const payment = await Payment.findOne({ where: { jobId } });
      expect(payment).toBeDefined();
      expect(payment.amount).toBe(amount);
      expect(payment.platformFee).toBe(amount * 0.15);
    });
  });
});
```

### Integration Tests

File: `tests/integration/auth.test.js`

```javascript
const request = require('supertest');
const app = require('../../src/app');
const { User } = require('../../src/models');

describe('Authentication API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();

      const user = await User.findOne({ where: { email: userData.email } });
      expect(user).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
      };

      await User.create(userData);

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.error).toMatch(/already registered/i);
    });
  });

  describe('POST /api/auth/login', () => {
    let user;

    beforeEach(async () => {
      user = await User.create({
        email: 'login@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'customer',
      });
    });

    it('should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(user.id);
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword',
        })
        .expect(401);

      expect(response.body.error).toMatch(/invalid credentials/i);
    });
  });
});
```

File: `tests/integration/jobs.test.js`

```javascript
const request = require('supertest');
const path = require('path');
const app = require('../../src/app');
const { User, Job } = require('../../src/models');

describe('Jobs API', () => {
  let customer, token;

  beforeEach(async () => {
    customer = await User.create({
      email: 'customer@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'Customer',
      role: 'customer',
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'customer@example.com',
        password: 'Password123!',
      });

    token = loginResponse.body.data.token;
  });

  describe('POST /api/jobs', () => {
    it('should create job with images', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'Fix leaking sink')
        .field('description', 'Kitchen sink is leaking badly')
        .field('category', 'plumber')
        .field('estimatedPrice', '150.00')
        .field('address', '123 Main St, London')
        .field('latitude', '51.5074')
        .field('longitude', '-0.1278')
        .attach('images', path.join(__dirname, '../fixtures/test-image.jpg'))
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.job.title).toBe('Fix leaking sink');
      expect(response.body.data.job.images).toHaveLength(1);

      const job = await Job.findByPk(response.body.data.job.id);
      expect(job).toBeDefined();
    });

    it('should reject job without required fields', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Incomplete Job',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject unauthorized requests', async () => {
      await request(app)
        .post('/api/jobs')
        .send({
          title: 'Test Job',
          description: 'Test',
          category: 'plumber',
        })
        .expect(401);
    });
  });

  describe('GET /api/jobs', () => {
    beforeEach(async () => {
      await Job.create({
        customerId: customer.id,
        title: 'Test Job 1',
        description: 'Description 1',
        category: 'plumber',
        address: '123 Main St',
        location: {
          type: 'Point',
          coordinates: [-0.1278, 51.5074],
        },
      });
    });

    it('should return jobs list', async () => {
      const response = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs).toHaveLength(1);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/jobs?status=requested')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.jobs).toHaveLength(1);
    });
  });
});
```

## Mobile Testing

### Jest Configuration for React Native

File: `jest.config.js` (in mobile app root)

```javascript
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/jest.setup.js',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|expo|@expo|@unimodules|unimodules|sentry-expo|native-base|react-native-svg|react-native-maps)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/**/index.js',
  ],
  moduleNameMapper: {
    '\\.svg': '<rootDir>/__mocks__/svgMock.js',
  },
};
```

### Component Tests

File: `src/components/ui/Button.test.js`

```javascript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from './Button';

describe('Button Component', () => {
  it('renders correctly', () => {
    const { getByText } = render(<Button title="Click Me" />);
    expect(getByText('Click Me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button title="Press Me" onPress={onPressMock} />
    );

    fireEvent.press(getByText('Press Me'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('renders disabled state', () => {
    const { getByText } = render(
      <Button title="Disabled" disabled={true} />
    );

    const button = getByText('Disabled').parent;
    expect(button.props.accessibilityState.disabled).toBe(true);
  });
});
```

File: `src/screens/customer/CreateJobScreen.test.js`

```javascript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import CreateJobScreen from './CreateJobScreen';

const mockStore = configureStore([]);

describe('CreateJobScreen', () => {
  let store;

  beforeEach(() => {
    store = mockStore({
      auth: {
        user: {
          id: 'user-1',
          role: 'customer',
        },
      },
    });
  });

  it('renders form fields', () => {
    const { getByPlaceholderText } = render(
      <Provider store={store}>
        <CreateJobScreen />
      </Provider>
    );

    expect(getByPlaceholderText('Job Title')).toBeTruthy();
    expect(getByPlaceholderText('Describe the job...')).toBeTruthy();
  });

  it('validates required fields', async () => {
    const { getByText, getByTestId } = render(
      <Provider store={store}>
        <CreateJobScreen />
      </Provider>
    );

    const submitButton = getByText('Post Job');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByText(/title is required/i)).toBeTruthy();
    });
  });
});
```

## E2E Testing with Detox

### Detox Configuration

File: `.detoxrc.json`

```json
{
  "testRunner": "jest",
  "runnerConfig": "e2e/config.json",
  "apps": {
    "ios": {
      "type": "ios.app",
      "binaryPath": "ios/build/Build/Products/Debug-iphonesimulator/App247.app",
      "build": "xcodebuild -workspace ios/App247.xcworkspace -scheme App247 -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build"
    },
    "android": {
      "type": "android.apk",
      "binaryPath": "android/app/build/outputs/apk/debug/app-debug.apk",
      "build": "cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug"
    }
  },
  "devices": {
    "simulator": {
      "type": "ios.simulator",
      "device": {
        "type": "iPhone 14"
      }
    },
    "emulator": {
      "type": "android.emulator",
      "device": {
        "avdName": "Pixel_5_API_31"
      }
    }
  },
  "configurations": {
    "ios": {
      "device": "simulator",
      "app": "ios"
    },
    "android": {
      "device": "emulator",
      "app": "android"
    }
  }
}
```

### E2E Tests

File: `e2e/auth.test.js`

```javascript
describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should register new user', async () => {
    await element(by.id('register-tab')).tap();

    await element(by.id('email-input')).typeText('newuser@example.com');
    await element(by.id('password-input')).typeText('Password123!');
    await element(by.id('firstName-input')).typeText('John');
    await element(by.id('lastName-input')).typeText('Doe');

    await element(by.id('register-button')).tap();

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should login existing user', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('Password123!');

    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
```

File: `e2e/createJob.test.js`

```javascript
describe('Create Job Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
    // Login first
    await element(by.id('email-input')).typeText('customer@example.com');
    await element(by.id('password-input')).typeText('Password123!');
    await element(by.id('login-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(5000);
  });

  it('should create a new job', async () => {
    await element(by.id('create-job-button')).tap();

    await element(by.id('job-title-input')).typeText('Fix leaking sink');
    await element(by.id('job-description-input')).typeText('Kitchen sink is leaking');
    await element(by.id('category-picker')).tap();
    await element(by.text('Plumber')).tap();

    await element(by.id('submit-job-button')).tap();

    await waitFor(element(by.text('Job Posted Successfully')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
```

## Running Tests

### Backend Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/models/User.test.js

# Run in watch mode
npm test -- --watch

# Run integration tests only
npm test -- tests/integration
```

### Mobile Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- CreateJobScreen.test.js

# Run E2E tests
detox test --configuration ios
detox test --configuration android
```

## Coverage Requirements

Maintain minimum coverage thresholds:
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## CI/CD Integration

File: `.github/workflows/test.yml`

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: 247_trades_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '16'
      - run: cd 247-trades-backend && npm ci
      - run: cd 247-trades-backend && npm test
      - run: cd 247-trades-backend && npm run test:coverage

  mobile-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '16'
      - run: npm ci
      - run: npm test -- --coverage
```

## Next Steps

1. Write tests for all API endpoints
2. Add E2E tests for critical user flows
3. Set up continuous testing in CI/CD
4. Configure code coverage reporting
5. Add performance testing
6. Implement security testing
