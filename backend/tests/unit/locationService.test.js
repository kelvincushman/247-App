const locationService = require('../../src/services/locationService');
const { Location, Job } = require('../../src/models');
const { createMockJob, createMockLocation, createMockModel } = require('../helpers/testUtils');

// Mock the models
jest.mock('../../src/models', () => ({
  Location: {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn()
  },
  Job: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn()
  }
}));

describe('Location Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates correctly', () => {
      // London to Paris coordinates
      const lat1 = 51.5074; // London
      const lon1 = -0.1278;
      const lat2 = 48.8566; // Paris
      const lon2 = 2.3522;

      const distance = locationService.calculateDistance(lat1, lon1, lat2, lon2);

      // Distance should be approximately 344 km
      expect(distance).toBeGreaterThan(340);
      expect(distance).toBeLessThan(350);
    });

    it('should return 0 for same coordinates', () => {
      const distance = locationService.calculateDistance(51.5074, -0.1278, 51.5074, -0.1278);
      expect(distance).toBe(0);
    });

    it('should handle coordinates across the equator', () => {
      const lat1 = 10; // North
      const lon1 = 0;
      const lat2 = -10; // South
      const lon2 = 0;

      const distance = locationService.calculateDistance(lat1, lon1, lat2, lon2);

      // Should be approximately 2222 km
      expect(distance).toBeGreaterThan(2200);
      expect(distance).toBeLessThan(2250);
    });

    it('should handle coordinates across the prime meridian', () => {
      const lat1 = 0;
      const lon1 = -10; // West
      const lat2 = 0;
      const lon2 = 10; // East

      const distance = locationService.calculateDistance(lat1, lon1, lat2, lon2);

      // Should be approximately 2223 km
      expect(distance).toBeGreaterThan(2200);
      expect(distance).toBeLessThan(2250);
    });
  });

  describe('calculateETA', () => {
    it('should calculate ETA correctly with provided speed', () => {
      const distanceKm = 10;
      const speedMps = 13.89; // 50 km/h in m/s

      const eta = locationService.calculateETA(distanceKm, speedMps);

      // ETA should be approximately 12 minutes from now
      const expectedTime = Date.now() + (12 * 60 * 1000);
      const actualTime = eta.getTime();

      expect(actualTime).toBeGreaterThan(expectedTime - 1000);
      expect(actualTime).toBeLessThan(expectedTime + 1000);
    });

    it('should use default speed of 30 km/h when speed not provided', () => {
      const distanceKm = 10;

      const eta = locationService.calculateETA(distanceKm);

      // With 30 km/h, 10km should take 20 minutes
      const expectedTime = Date.now() + (20 * 60 * 1000);
      const actualTime = eta.getTime();

      expect(actualTime).toBeGreaterThan(expectedTime - 1000);
      expect(actualTime).toBeLessThan(expectedTime + 1000);
    });

    it('should use default speed when speed is 0', () => {
      const distanceKm = 5;
      const speedMps = 0;

      const eta = locationService.calculateETA(distanceKm, speedMps);

      // Should use default speed (30 km/h)
      const expectedTime = Date.now() + (10 * 60 * 1000);
      const actualTime = eta.getTime();

      expect(actualTime).toBeGreaterThan(expectedTime - 1000);
      expect(actualTime).toBeLessThan(expectedTime + 1000);
    });

    it('should handle very short distances', () => {
      const distanceKm = 0.1; // 100 meters
      const speedMps = 8.33; // 30 km/h

      const eta = locationService.calculateETA(distanceKm, speedMps);

      // Should be less than 1 minute
      const expectedTime = Date.now() + (0.2 * 60 * 1000);
      const actualTime = eta.getTime();

      expect(actualTime).toBeGreaterThan(Date.now());
      expect(actualTime).toBeLessThan(expectedTime + 1000);
    });
  });

  describe('recordLocation', () => {
    const mockJob = createMockJob({
      location: {
        lat: 51.5074,
        lng: -0.1278
      }
    });

    beforeEach(() => {
      Job.findByPk.mockResolvedValue(mockJob);
    });

    it('should record location with calculated distance and ETA', async () => {
      const jobId = mockJob.id;
      const tradespersonId = global.testTradesperson.id;
      const locationData = {
        latitude: 51.5100, // Slightly north of destination
        longitude: -0.1300,
        accuracy: 10,
        heading: 180,
        speed: 8.33,
        altitude: 50
      };

      const mockCreatedLocation = createMockLocation({
        ...locationData,
        distance_to_destination: 0.3,
        status: 'en_route'
      });

      Location.create.mockResolvedValue(mockCreatedLocation);

      const result = await locationService.recordLocation(jobId, tradespersonId, locationData);

      expect(Job.findByPk).toHaveBeenCalledWith(jobId);
      expect(Location.create).toHaveBeenCalledWith(
        expect.objectContaining({
          job_id: jobId,
          tradesperson_id: tradespersonId,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          heading: locationData.heading,
          speed: locationData.speed,
          altitude: locationData.altitude
        })
      );
      expect(result).toEqual(mockCreatedLocation);
    });

    it('should throw error if job not found', async () => {
      Job.findByPk.mockResolvedValue(null);

      await expect(
        locationService.recordLocation('invalid-id', global.testTradesperson.id, {
          latitude: 51.5074,
          longitude: -0.1278
        })
      ).rejects.toThrow('Job not found');
    });

    it('should auto-detect arrival when within 50 meters', async () => {
      const jobId = mockJob.id;
      const tradespersonId = global.testTradesperson.id;

      // Very close to destination (within 50m)
      const locationData = {
        latitude: 51.50742, // Only ~2.2 meters north
        longitude: -0.12782,
        speed: 5
      };

      const mockCreatedLocation = createMockLocation({
        ...locationData,
        distance_to_destination: 0.002,
        status: 'arrived'
      });

      Location.create.mockResolvedValue(mockCreatedLocation);

      const result = await locationService.recordLocation(jobId, tradespersonId, locationData);

      expect(result.status).toBe('arrived');
    });
  });

  describe('getLatestLocation', () => {
    it('should retrieve the latest location for a job', async () => {
      const jobId = '44444444-4444-4444-4444-444444444444';
      const tradespersonId = global.testTradesperson.id;
      const mockLocation = createMockLocation();

      Location.findOne.mockResolvedValue(mockLocation);

      const result = await locationService.getLatestLocation(jobId, tradespersonId);

      expect(Location.findOne).toHaveBeenCalledWith({
        where: {
          job_id: jobId,
          tradesperson_id: tradespersonId
        },
        order: [['timestamp', 'DESC']]
      });
      expect(result).toEqual(mockLocation);
    });

    it('should return null if no location found', async () => {
      Location.findOne.mockResolvedValue(null);

      const result = await locationService.getLatestLocation('invalid-id', global.testTradesperson.id);

      expect(result).toBeNull();
    });
  });

  describe('getLocationHistory', () => {
    it('should retrieve location history with default options', async () => {
      const jobId = '44444444-4444-4444-4444-444444444444';
      const mockLocations = [
        createMockLocation({ timestamp: new Date('2025-01-01T10:00:00Z') }),
        createMockLocation({ timestamp: new Date('2025-01-01T10:05:00Z') }),
        createMockLocation({ timestamp: new Date('2025-01-01T10:10:00Z') })
      ];

      Location.findAll.mockResolvedValue(mockLocations);

      const result = await locationService.getLocationHistory(jobId);

      expect(Location.findAll).toHaveBeenCalledWith({
        where: { job_id: jobId },
        order: [['timestamp', 'ASC']],
        limit: 100
      });
      expect(result).toEqual(mockLocations);
      expect(result).toHaveLength(3);
    });

    it('should respect limit option', async () => {
      const jobId = '44444444-4444-4444-4444-444444444444';
      Location.findAll.mockResolvedValue([]);

      await locationService.getLocationHistory(jobId, { limit: 50 });

      expect(Location.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50
        })
      );
    });

    it('should filter by time range when provided', async () => {
      const jobId = '44444444-4444-4444-4444-444444444444';
      const startTime = new Date('2025-01-01T10:00:00Z');
      const endTime = new Date('2025-01-01T11:00:00Z');

      Location.findAll.mockResolvedValue([]);

      await locationService.getLocationHistory(jobId, { startTime, endTime });

      expect(Location.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: expect.any(Object)
          })
        })
      );
    });
  });

  describe('startTracking', () => {
    const mockJob = createMockJob();

    beforeEach(() => {
      Job.findOne.mockResolvedValue(mockJob);
    });

    it('should start tracking with initial location', async () => {
      const jobId = mockJob.id;
      const tradespersonId = mockJob.tradesperson_id;
      const initialLocation = {
        latitude: 51.5100,
        longitude: -0.1300,
        accuracy: 10,
        speed: 8.33
      };

      Job.findByPk.mockResolvedValue(mockJob);

      const mockCreatedLocation = createMockLocation({
        ...initialLocation,
        status: 'en_route'
      });

      Location.create.mockResolvedValue(mockCreatedLocation);

      const result = await locationService.startTracking(jobId, tradespersonId, initialLocation);

      expect(Job.findOne).toHaveBeenCalledWith({
        where: {
          id: jobId,
          tradesperson_id: tradespersonId
        }
      });
      expect(result.status).toBe('en_route');
    });

    it('should throw error if job not found or not assigned to tradesperson', async () => {
      Job.findOne.mockResolvedValue(null);

      await expect(
        locationService.startTracking('invalid-id', global.testTradesperson.id, {
          latitude: 51.5074,
          longitude: -0.1278
        })
      ).rejects.toThrow('Job not found or not assigned to this tradesperson');
    });
  });

  describe('stopTracking', () => {
    it('should stop tracking with final location and departed status', async () => {
      const jobId = '44444444-4444-4444-4444-444444444444';
      const tradespersonId = global.testTradesperson.id;
      const finalLocation = {
        latitude: 51.5074,
        longitude: -0.1278,
        speed: 0
      };

      const mockJob = createMockJob({
        location: {
          lat: 51.5074,
          lng: -0.1278
        }
      });

      Job.findByPk.mockResolvedValue(mockJob);

      const mockCreatedLocation = createMockLocation({
        ...finalLocation,
        status: 'departed'
      });

      Location.create.mockResolvedValue(mockCreatedLocation);

      const result = await locationService.stopTracking(jobId, tradespersonId, finalLocation);

      expect(result.status).toBe('departed');
    });
  });

  describe('getRouteSummary', () => {
    it('should calculate route summary from location history', async () => {
      const jobId = '44444444-4444-4444-4444-444444444444';

      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

      const mockLocations = [
        createMockLocation({
          latitude: 51.5074,
          longitude: -0.1278,
          speed: 10,
          status: 'en_route',
          timestamp: thirtyMinutesAgo
        }),
        createMockLocation({
          latitude: 51.5100,
          longitude: -0.1300,
          speed: 8,
          status: 'en_route',
          timestamp: new Date(thirtyMinutesAgo.getTime() + 15 * 60 * 1000)
        }),
        createMockLocation({
          latitude: 51.5120,
          longitude: -0.1320,
          speed: 0,
          status: 'arrived',
          timestamp: now
        })
      ];

      Location.findAll.mockResolvedValue(mockLocations);

      const result = await locationService.getRouteSummary(jobId);

      expect(result).toHaveProperty('job_id', jobId);
      expect(result).toHaveProperty('start_time');
      expect(result).toHaveProperty('end_time');
      expect(result).toHaveProperty('duration_minutes');
      expect(result).toHaveProperty('total_distance_km');
      expect(result).toHaveProperty('average_speed_mps');
      expect(result).toHaveProperty('location_updates', 3);
      expect(result).toHaveProperty('statuses');
      expect(result.statuses).toHaveProperty('en_route', 2);
      expect(result.statuses).toHaveProperty('arrived', 1);
    });

    it('should return null if no location data available', async () => {
      Location.findAll.mockResolvedValue([]);

      const result = await locationService.getRouteSummary('invalid-id');

      expect(result).toBeNull();
    });
  });
});
