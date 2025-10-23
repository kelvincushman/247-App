// App Constants

// API Configuration
export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api/v1'
  : 'https://api.247trades.com/api/v1';

export const SOCKET_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://api.247trades.com';

// App Information
export const APP_NAME = '247 Trades';
export const APP_VERSION = '1.0.0';

// Trade Categories
export const TRADE_CATEGORIES = [
  {
    id: 'electrician',
    name: 'Electrician',
    icon: 'flash',
    color: '#FFB800',
  },
  {
    id: 'plumber',
    name: 'Plumber',
    icon: 'water',
    color: '#0095FF',
  },
  {
    id: 'locksmith',
    name: 'Locksmith',
    icon: 'key',
    color: '#FF6B35',
  },
  {
    id: 'gas_engineer',
    name: 'Gas Engineer',
    icon: 'flame',
    color: '#FF3D00',
  },
  {
    id: 'glazer',
    name: 'Glazer',
    icon: 'square',
    color: '#00BCD4',
  },
];

// Job Statuses
export const JOB_STATUS = {
  REQUESTED: 'requested',
  ASSIGNED: 'assigned',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
};

// Job Urgency Levels
export const JOB_URGENCY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  EMERGENCY: 'emergency',
};

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  HELD: 'held',
  COMPLETED: 'completed',
  REFUNDED: 'refunded',
  FAILED: 'failed',
};

// Notification Types
export const NOTIFICATION_TYPES = {
  JOB_UPDATE: 'job_update',
  NEW_MESSAGE: 'new_message',
  PAYMENT: 'payment',
  REVIEW: 'review',
  SYSTEM: 'system',
};

// Location Tracking
export const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds
export const AUTO_ARRIVAL_THRESHOLD = 50; // meters

// Pagination
export const DEFAULT_PAGE_SIZE = 20;

// Image Upload
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGES_PER_JOB = 5;
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

// Map Configuration
export const DEFAULT_LOCATION_DELTA = {
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// Platform Fee
export const PLATFORM_FEE_PERCENTAGE = 15;
