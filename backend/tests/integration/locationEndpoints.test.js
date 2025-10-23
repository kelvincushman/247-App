const request = require('supertest');
const app = require('../../src/server');
const { generateTestToken } = require('../helpers/testUtils');

// Mock database and external services
jest.mock('../../src/models');
jest.mock('../../src/config/database', () => ({
  connectDB: jest.fn(),
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(true),
    sync: jest.fn().mockResolvedValue(true)
  }
}));

const locationService = require('../../src/services/locationService');

// Mock location service
jest.mock('../../src/services/locationService');

describe('Location API Endpoints', () => {
  let tradespersonToken;
  let customerToken;

  beforeAll(() => {
    tradespersonToken = generateTestToken(global.testTradesperson);
    customerToken = generateTestToken(global.testUser);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/locations/start', () => {
    it('should start tracking with valid data', async () => {
      const mockLocation = {
        id: '55555555-5555-5555-5555-555555555555',
        job_id: '44444444-4444-4444-4444-444444444444',
        tradesperson_id: global.testTradesperson.id,
        latitude: 51.5074,
        longitude: -0.1278,
        status: 'en_route'
      };

      locationService.startTracking.mockResolvedValue(mockLocation);

      const response = await request(app)
        .post('/api/v1/locations/start')
        .set('Authorization', `Bearer ${tradespersonToken}`)
        .send({
          job_id: '44444444-4444-4444-4444-444444444444',
          latitude: 51.5074,
          longitude: -0.1278,
          accuracy: 10,
          heading: 90,
          speed: 8.33,
          altitude: 50
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status', 'en_route');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/locations/start')
        .send({
          job_id: '44444444-4444-4444-4444-444444444444',
          latitude: 51.5074,
          longitude: -0.1278
        });

      expect(response.status).toBe(401);
    });

    it('should require tradesperson role', async () => {
      const response = await request(app)
        .post('/api/v1/locations/start')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          job_id: '44444444-4444-4444-4444-444444444444',
          latitude: 51.5074,
          longitude: -0.1278
        });

      expect(response.status).toBe(403);
    });

    it('should validate latitude range', async () => {
      const response = await request(app)
        .post('/api/v1/locations/start')
        .set('Authorization', `Bearer ${tradespersonToken}`)
        .send({
          job_id: '44444444-4444-4444-4444-444444444444',
          latitude: 100, // Invalid: > 90
          longitude: -0.1278
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate longitude range', async () => {
      const response = await request(app)
        .post('/api/v1/locations/start')
        .set('Authorization', `Bearer ${tradespersonToken}`)
        .send({
          job_id: '44444444-4444-4444-4444-444444444444',
          latitude: 51.5074,
          longitude: 200 // Invalid: > 180
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should require valid job UUID', async () => {
      const response = await request(app)
        .post('/api/v1/locations/start')
        .set('Authorization', `Bearer ${tradespersonToken}`)
        .send({
          job_id: 'invalid-uuid',
          latitude: 51.5074,
          longitude: -0.1278
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/locations/update', () => {
    it('should update location with valid data', async () => {
      const mockLocation = {
        id: '55555555-5555-5555-5555-555555555555',
        latitude: 51.5100,
        longitude: -0.1300,
        distance_to_destination: 2.5,
        estimated_arrival_time: new Date(Date.now() + 15 * 60 * 1000)
      };

      locationService.recordLocation.mockResolvedValue(mockLocation);

      const response = await request(app)
        .post('/api/v1/locations/update')
        .set('Authorization', `Bearer ${tradespersonToken}`)
        .send({
          job_id: '44444444-4444-4444-4444-444444444444',
          latitude: 51.5100,
          longitude: -0.1300,
          accuracy: 10,
          heading: 180,
          speed: 10,
          altitude: 45
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('distance_to_destination');
      expect(response.body.data).toHaveProperty('estimated_arrival_time');
    });

    it('should handle service errors gracefully', async () => {
      locationService.recordLocation.mockRejectedValue(new Error('Job not found'));

      const response = await request(app)
        .post('/api/v1/locations/update')
        .set('Authorization', `Bearer ${tradespersonToken}`)
        .send({
          job_id: 'invalid-job-id',
          latitude: 51.5074,
          longitude: -0.1278
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/locations/stop', () => {
    it('should stop tracking with valid data', async () => {
      const mockLocation = {
        id: '55555555-5555-5555-5555-555555555555',
        status: 'departed'
      };

      locationService.stopTracking.mockResolvedValue(mockLocation);

      const response = await request(app)
        .post('/api/v1/locations/stop')
        .set('Authorization', `Bearer ${tradespersonToken}`)
        .send({
          job_id: '44444444-4444-4444-4444-444444444444',
          latitude: 51.5074,
          longitude: -0.1278,
          accuracy: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('departed');
    });
  });

  describe('POST /api/v1/locations/status', () => {
    it('should update job site status', async () => {
      const mockLocation = {
        id: '55555555-5555-5555-5555-555555555555',
        status: 'arrived'
      };

      locationService.updateJobSiteStatus.mockResolvedValue(mockLocation);

      const response = await request(app)
        .post('/api/v1/locations/status')
        .set('Authorization', `Bearer ${tradespersonToken}`)
        .send({
          job_id: '44444444-4444-4444-4444-444444444444',
          status: 'arrived',
          latitude: 51.5074,
          longitude: -0.1278
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('arrived');
    });

    it('should validate status enum values', async () => {
      const response = await request(app)
        .post('/api/v1/locations/status')
        .set('Authorization', `Bearer ${tradespersonToken}`)
        .send({
          job_id: '44444444-4444-4444-4444-444444444444',
          status: 'invalid_status', // Invalid
          latitude: 51.5074,
          longitude: -0.1278
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should only accept arrived, on_site, or departed', async () => {
      const validStatuses = ['arrived', 'on_site', 'departed'];

      for (const status of validStatuses) {
        locationService.updateJobSiteStatus.mockResolvedValue({ status });

        const response = await request(app)
          .post('/api/v1/locations/status')
          .set('Authorization', `Bearer ${tradespersonToken}`)
          .send({
            job_id: '44444444-4444-4444-4444-444444444444',
            status,
            latitude: 51.5074,
            longitude: -0.1278
          });

        expect(response.status).toBe(200);
      }
    });
  });

  describe('GET /api/v1/locations/active', () => {
    it('should return active tracking sessions for tradesperson', async () => {
      const mockSessions = [
        {
          job_id: '44444444-4444-4444-4444-444444444444',
          job_title: 'Fix outlet',
          job_status: 'in_progress',
          latest_location: {
            latitude: 51.5074,
            longitude: -0.1278
          },
          tracking_active: true
        }
      ];

      locationService.getActiveTracking.mockResolvedValue(mockSessions);

      const response = await request(app)
        .get('/api/v1/locations/active')
        .set('Authorization', `Bearer ${tradespersonToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('tracking_active', true);
    });

    it('should return empty array if no active tracking', async () => {
      locationService.getActiveTracking.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/v1/locations/active')
        .set('Authorization', `Bearer ${tradespersonToken}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(0);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/v1/locations/latest/:jobId', () => {
    it('should return latest location for a job', async () => {
      const mockLocation = {
        id: '55555555-5555-5555-5555-555555555555',
        latitude: 51.5074,
        longitude: -0.1278,
        distance_to_destination: 1.5,
        status: 'en_route'
      };

      locationService.getLatestLocation.mockResolvedValue(mockLocation);

      const response = await request(app)
        .get('/api/v1/locations/latest/44444444-4444-4444-4444-444444444444')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('latitude');
      expect(response.body.data).toHaveProperty('distance_to_destination');
    });

    it('should return 404 if no location found', async () => {
      locationService.getLatestLocation.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/locations/latest/44444444-4444-4444-4444-444444444444')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should be accessible by both customer and tradesperson', async () => {
      const mockLocation = {
        latitude: 51.5074,
        longitude: -0.1278
      };

      locationService.getLatestLocation.mockResolvedValue(mockLocation);

      // Test with customer token
      const customerResponse = await request(app)
        .get('/api/v1/locations/latest/44444444-4444-4444-4444-444444444444')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(customerResponse.status).toBe(200);

      // Test with tradesperson token
      const tradespersonResponse = await request(app)
        .get('/api/v1/locations/latest/44444444-4444-4444-4444-444444444444')
        .set('Authorization', `Bearer ${tradespersonToken}`);

      expect(tradespersonResponse.status).toBe(200);
    });
  });

  describe('GET /api/v1/locations/history/:jobId', () => {
    it('should return location history for a job', async () => {
      const mockHistory = [
        { latitude: 51.5074, longitude: -0.1278, timestamp: new Date('2025-01-01T10:00:00Z') },
        { latitude: 51.5100, longitude: -0.1300, timestamp: new Date('2025-01-01T10:05:00Z') },
        { latitude: 51.5120, longitude: -0.1320, timestamp: new Date('2025-01-01T10:10:00Z') }
      ];

      locationService.getLocationHistory.mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/v1/locations/history/44444444-4444-4444-4444-444444444444')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(3);
      expect(response.body.data).toHaveLength(3);
    });

    it('should respect limit query parameter', async () => {
      locationService.getLocationHistory.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/v1/locations/history/44444444-4444-4444-4444-444444444444?limit=50')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(locationService.getLocationHistory).toHaveBeenCalledWith(
        '44444444-4444-4444-4444-444444444444',
        expect.objectContaining({ limit: 50 })
      );
    });

    it('should validate limit range', async () => {
      const response = await request(app)
        .get('/api/v1/locations/history/44444444-4444-4444-4444-444444444444?limit=2000')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(400);
    });

    it('should support time range filtering', async () => {
      locationService.getLocationHistory.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/v1/locations/history/44444444-4444-4444-4444-444444444444')
        .query({
          start_time: '2025-01-01T00:00:00Z',
          end_time: '2025-01-01T23:59:59Z'
        })
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/locations/summary/:jobId', () => {
    it('should return route summary with statistics', async () => {
      const mockSummary = {
        job_id: '44444444-4444-4444-4444-444444444444',
        total_distance_km: 12.5,
        duration_minutes: 35,
        average_speed_kmh: 28.4,
        location_updates: 180,
        statuses: {
          en_route: 120,
          arrived: 5,
          on_site: 50,
          departed: 5
        }
      };

      locationService.getRouteSummary.mockResolvedValue(mockSummary);

      const response = await request(app)
        .get('/api/v1/locations/summary/44444444-4444-4444-4444-444444444444')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_distance_km');
      expect(response.body.data).toHaveProperty('duration_minutes');
      expect(response.body.data).toHaveProperty('average_speed_kmh');
      expect(response.body.data).toHaveProperty('statuses');
    });

    it('should return 404 if no route data found', async () => {
      locationService.getRouteSummary.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/locations/summary/44444444-4444-4444-4444-444444444444')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/locations/calculate-distance', () => {
    it('should calculate distance between two points', async () => {
      const response = await request(app)
        .post('/api/v1/locations/calculate-distance')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          lat1: 51.5074,
          lon1: -0.1278,
          lat2: 48.8566,
          lon2: 2.3522
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('distance_km');
      expect(response.body.data).toHaveProperty('distance_miles');
      expect(response.body.data.distance_km).toBeGreaterThan(0);
    });

    it('should validate coordinate ranges', async () => {
      const response = await request(app)
        .post('/api/v1/locations/calculate-distance')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          lat1: 100, // Invalid
          lon1: -0.1278,
          lat2: 48.8566,
          lon2: 2.3522
        });

      expect(response.status).toBe(400);
    });

    it('should require all four coordinates', async () => {
      const response = await request(app)
        .post('/api/v1/locations/calculate-distance')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          lat1: 51.5074,
          lon1: -0.1278
          // Missing lat2 and lon2
        });

      expect(response.status).toBe(400);
    });
  });
});
